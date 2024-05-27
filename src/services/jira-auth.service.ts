import { JIRA_CLIENT_ID, JIRA_REDIRECT_URI, JIRA_SECRET } from '@env';
import qs from 'qs';
import { useEffect, useRef, useState } from 'react';
import { Alert, Linking } from 'react-native';
import { jiraAccountsAtom, jiraAuthsAtom, jiraClientsAtom, store, worklogsRemoteAtom } from '../atoms';
import { GetOauthTokenErrorResponse, GetOauthTokenResponse } from '../types/auth.types';
import { getUrlParams } from '../utils/url';
import { createJiraClient } from './jira-client.service';
import { requestAccountData } from './jira-info.service';
import { getRemoteWorklogs } from './jira-worklogs.service';
import { JiraAuthModel } from './storage.service';

const handleOAuthError = (res: GetOauthTokenResponse | GetOauthTokenErrorResponse): GetOauthTokenResponse => {
  if ('error' in res) {
    throw new Error(res.error_description);
  }
  return res;
};

/**
 * Exchanges the OAuth code for an access token and refresh token
 */
async function getOAuthToken(code: string): Promise<GetOauthTokenResponse> {
  return await fetch('https://auth.atlassian.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: JIRA_CLIENT_ID,
      client_secret: JIRA_SECRET,
      code: code,
      redirect_uri: JIRA_REDIRECT_URI,
    }),
  })
    .then(response => response.json() as Promise<GetOauthTokenResponse | GetOauthTokenErrorResponse>)
    .then(handleOAuthError);
}

/**
 * Gets a new access and refresh token using a refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<GetOauthTokenResponse> {
  return await fetch('https://auth.atlassian.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      client_id: JIRA_CLIENT_ID,
      client_secret: JIRA_SECRET,
      refresh_token: refreshToken,
    }),
  })
    .then(response => response.json() as Promise<GetOauthTokenResponse | GetOauthTokenErrorResponse>)
    .then(handleOAuthError);
}

/**
 * A hook to handle the OAuth flow.
 */
export const useAuthRequest = () => {
  const state = useRef<string>();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    Linking.addEventListener('url', handleDeepLink);
    return () => {
      Linking.removeAllListeners('url');
    };
  }, []);

  async function handleDeepLink(event: { url: string }) {
    if (!event.url.startsWith(JIRA_REDIRECT_URI)) {
      return;
    }
    setIsLoading(true);
    const { code: urlCode, state: urlState } = getUrlParams(event.url);
    try {
      if (state.current !== urlState || !urlCode) {
        throw new Error('An error occured while authenticating. Maybe your session timed out? Please try again.');
      }
      const { access_token: accessToken, refresh_token: refreshToken } = await getOAuthToken(urlCode);
      const { jiraAccount, jiraAuth, worklogs } = await initializeJiraAccount(accessToken, refreshToken);

      const newJiraAuths = store.get(jiraAuthsAtom);
      newJiraAuths[jiraAccount.accountId] = jiraAuth;
      store.set(jiraAuthsAtom, { ...newJiraAuths });

      const newJiraAccounts = store.get(jiraAccountsAtom);
      if (newJiraAccounts.length === 0) {
        jiraAccount.isPrimary = true;
      }
      store.set(jiraAccountsAtom, [
        ...newJiraAccounts.filter(account => account.accountId !== jiraAccount.accountId),
        jiraAccount,
      ]);

      const worklogsRemote = store.get(worklogsRemoteAtom);
      store.set(worklogsRemoteAtom, worklogsRemote.concat(worklogs));
    } catch (error) {
      Alert.alert((error as Error).message);
      return;
    } finally {
      setIsLoading(false);
    }
  }

  async function initOAuth() {
    state.current = (Math.random() * 100_000_000).toString().replace('.', '');
    let oAuthUrl = 'https://auth.atlassian.com/authorize?';
    oAuthUrl += qs.stringify({
      audience: 'api.atlassian.com',
      client_id: JIRA_CLIENT_ID,
      scope: [
        'delete:issue-worklog:jira',
        'delete:issue-worklog.property:jira',
        'read:account',
        'read:application-role:jira',
        'read:audit-log:jira',
        'read:avatar:jira',
        'read:comment:jira',
        'read:field-configuration:jira',
        'read:field:jira',
        'read:field.default-value:jira',
        'read:field.option:jira',
        'read:group:jira',
        'read:issue-details:jira',
        'read:issue-meta:jira',
        'read:issue-type:jira',
        'read:issue-worklog:jira',
        'read:issue-worklog.property:jira',
        'read:issue:jira',
        'read:me',
        'read:project-role:jira',
        'read:user:jira',
        'write:comment:jira',
        'write:issue-worklog:jira',
        'write:issue-worklog.property:jira',
        'write:issue.time-tracking:jira',
        'offline_access', // This scope is required to get a refresh token
      ].join(' '),
      redirect_uri: JIRA_REDIRECT_URI,
      state: state.current,
      response_type: 'code',
      prompt: 'consent',
    });

    if (await Linking.canOpenURL(oAuthUrl)) {
      await Linking.openURL(oAuthUrl);
    } else {
      Alert.alert(`This device can't open this URL: ${oAuthUrl}`);
    }
  }

  return {
    isLoading,
    initOAuth,
  };
};

/**
 * Makes all the necessary calls to initialize the Jira account
 */
export async function initializeJiraAccount(initialAccessToken: string, initialRefreshToken: string) {
  const { workspace, userInfo, jiraAccount, accessToken, refreshToken } = await requestAccountData(
    initialAccessToken,
    initialRefreshToken
  );
  const jiraAuth: JiraAuthModel = {
    accessToken,
    refreshToken,
    cloudId: workspace.id,
  };
  const jiraClient = createJiraClient(jiraAuth, userInfo.accountId);
  const worklogs = await getRemoteWorklogs(userInfo.accountId);
  return { jiraAccount, jiraAuth, jiraClient, worklogs };
}

/**
 * Returns the Jira client for the given account ID
 */
export function getJiraClient(accountId: string) {
  const jiraClients = store.get(jiraClientsAtom);
  if (!jiraClients[accountId]) {
    throw new Error(`No Jira client for account ${accountId}`);
  }
  return jiraClients[accountId];
}