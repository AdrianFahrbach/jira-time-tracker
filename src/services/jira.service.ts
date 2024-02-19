import { AxiosInstance } from 'axios';
import { Version3Client } from 'jira.js';
import { Issue, Worklog as JiraWorklog } from 'jira.js/out/version3/models';
import ms from 'ms';
import { Alert } from 'react-native';
import { jiraAuthAtom, store } from '../atoms';
import { Worklog, WorklogState } from '../types/global.types';
import { extractTextFromJSON } from './atlassian-document-format.service';
import { refreshAccessToken } from './auth.service';
import { formatDateToJiraFormat, formatDateToYYYYMMDD, parseDateFromYYYYMMDD } from './date.service';

// TODO: Use a more lightweight client

export const jiraClient = new Version3Client({ host: 'https://example.com' });

// @ts-expect-error (we are accessing a private property here, but it's the only way to access the underlying Axios instance)
const axiosInstance = jiraClient.instance as AxiosInstance;

// Inject current access token
axiosInstance.interceptors.request.use(async config => {
  const jiraAuth = store.get(jiraAuthAtom);
  config.baseURL = `https://api.atlassian.com/ex/jira/${jiraAuth?.cloudId}`;
  if (jiraAuth?.accessToken) {
    config.headers.Authorization = `Bearer ${jiraAuth!.accessToken}`;
  }
  return config;
});

axiosInstance.interceptors.response.use(
  response => response,
  async error => {
    const status = error.response ? error.response.status : null;

    if (status === 401) {
      const jiraAuth = store.get(jiraAuthAtom);
      if (!jiraAuth?.refreshToken) {
        return Promise.reject(error);
      }

      try {
        const freshTokens = await refreshAccessToken(jiraAuth.refreshToken);
        // Update auth tokens for upcoming requests
        store.set(jiraAuthAtom, {
          ...jiraAuth,
          accessToken: freshTokens.access_token,
          refreshToken: freshTokens.refresh_token,
        });
      } catch (err) {
        if ((err as Error).message === 'refresh_token is invalid') {
          // Refresh token has expired after 90 days, user needs to re-authenticate
          Alert.alert('Your session has expired!', 'Please log in again.');
          store.set(jiraAuthAtom, null);
        } else {
          // Retrow unexpected errors
          throw err;
        }
      }

      return axiosInstance.request(error.config);
    }

    return Promise.reject(error);
  }
);

/**
 * Converts Jira worklogs to our custom format
 */
function convertWorklogs(worklogs: JiraWorklog[], accountId: string, issue: Issue): Worklog[] {
  return worklogs
    ?.filter(worklog => worklog.author?.accountId === accountId && worklog.started && worklog.timeSpent)
    .map(worklog => ({
      id: worklog.id ?? '',
      issue: {
        id: issue.id,
        key: issue.key,
        summary: issue.fields.summary,
      },
      started: formatDateToYYYYMMDD(new Date(worklog.started ?? 0)),
      timeSpentSeconds: (worklog.timeSpent ?? '').split(' ').reduce(
        (acc: number, curr: string) =>
          // TODO: This is a hacky way to convert the Jira time format to ms
          acc + ms(curr.replace('m', 'min').replace('1d', '8h').replace('2d', '16h').replace('3d', '24h')) / 1_000,
        0
      ),
      comment: worklog.comment ? extractTextFromJSON(worklog.comment) : '',
      state: WorklogState.Synced,
    }));
}

/**
 * Loads all worklogs of the last month of the current user from JIRA
 */
export async function getRemoteWorklogs(accountId: string): Promise<Worklog[]> {
  const startedAfterTimestamp = new Date().getTime() - ms('4w');

  const worklogsCompact: Worklog[] = [];
  const jqlQuery = `worklogAuthor = ${accountId} AND worklogDate > -4w`;
  const maxIssuesResults = 40;
  let totalIssues = 1;
  let issuesFailsafe = 0;

  // Loop through all issues with recent worklogs
  for (let currentIssue = 0; currentIssue < totalIssues; issuesFailsafe++) {
    const issuesCall = await jiraClient.issueSearch.searchForIssuesUsingJqlPost({
      jql: jqlQuery,
      fields: ['summary', 'worklog'],
      maxResults: maxIssuesResults,
      startAt: currentIssue,
    });

    for (const issue of issuesCall.issues ?? []) {
      // Get worklogs for each issue
      if (issue.fields.worklog?.total && issue.fields.worklog?.total < (issue.fields.worklog?.maxResults ?? 0)) {
        // This issue already has all worklogs
        worklogsCompact.push(...convertWorklogs(issue.fields.worklog.worklogs ?? [], accountId, issue));
      } else {
        // This issue has more worklogs than we have fetched
        const maxWorklogResults = 5000;
        let totalWorklogs = 1;
        let worklogsFailsafe = 0;
        for (let currentWorklog = 0; currentWorklog < totalWorklogs; worklogsFailsafe++) {
          const worklogsCall = await jiraClient.issueWorklogs.getIssueWorklog({
            issueIdOrKey: issue.id,
            maxResults: maxWorklogResults,
            startAt: currentWorklog,
            startedAfter: startedAfterTimestamp,
          });
          worklogsCompact.push(...convertWorklogs(worklogsCall.worklogs ?? [], accountId, issue));
          currentWorklog += maxWorklogResults;
          totalWorklogs = worklogsCall.total ?? 0;
          if (worklogsFailsafe > 20) {
            // We have fetched more then 10 times, something is wrong
            throw new Error('Too many worklogs calls');
          }
        }
      }
    }

    currentIssue += maxIssuesResults;
    totalIssues = issuesCall.total ?? 0;
    if (issuesFailsafe > 20) {
      // We have fetched more then 20 times, something is wrong
      throw new Error('Too many issues calls');
    }
  }

  return worklogsCompact;
}

/**
 * Gets all issues that match a given search query
 */
export function getIssuesBySearchQuery(query: string) {
  return jiraClient.issueSearch.searchForIssuesUsingJqlPost({
    jql: `summary ~ "${query}" OR description ~ "${query}" ORDER BY created DESC`,
    fields: ['summary', 'project'],
    maxResults: 50,
  });
}

export function createRemoteWorklog(worklog: Worklog) {
  return jiraClient.issueWorklogs.addWorklog({
    issueIdOrKey: worklog.issue.id,
    started: formatDateToJiraFormat(parseDateFromYYYYMMDD(worklog.started)),
    timeSpentSeconds: worklog.timeSpentSeconds,
    comment: worklog.comment,
  });
}

export function updateRemoteWorklog(worklog: Worklog) {
  return jiraClient.issueWorklogs.updateWorklog({
    issueIdOrKey: worklog.issue.id,
    id: worklog.id,
    started: formatDateToJiraFormat(parseDateFromYYYYMMDD(worklog.started)),
    timeSpentSeconds: worklog.timeSpentSeconds,
    comment: worklog.comment,
  });
}

export function deleteRemoteWorklog(worklog: Worklog) {
  return jiraClient.issueWorklogs.deleteWorklog({
    issueIdOrKey: worklog.issue.id,
    id: worklog.id,
  });
}
