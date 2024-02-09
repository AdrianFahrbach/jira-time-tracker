import React, { FC, useContext } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { AnimateScreenContainer } from '../components/AnimateScreenContainer';
import { Sidebar } from '../components/Sidebar';
import { NavigationContext } from '../contexts/navigation.context';
import { WorklogContext } from '../contexts/worklog.context';
import { useThemedStyles } from '../services/theme.service';
import { Theme } from '../styles/theme/theme-types';
import { EditWorklog } from './EditWorklog';
import { Entries } from './Entries';
import { Search } from './Search';
import { Settings } from './Settings';

export const Main: FC = () => {
  const { showSettingsScreen, showSearchScreen, currentWorklogToEdit } = useContext(NavigationContext);
  const styles = useThemedStyles(createStyles);
  const { addWorklog } = useContext(WorklogContext);

  return (
    <AnimateScreenContainer isVisible offScreenLocation='right'>
      <View style={styles.container}>
        <Sidebar />
        <View style={styles.mainViewContainer}>
          <View style={styles.entriesContainer}>
            <Entries />
          </View>
          <AnimateScreenContainer isVisible={showSearchScreen} offScreenLocation='right' zIndex={2}>
            <Search onNewWorklog={addWorklog} />
          </AnimateScreenContainer>
          <AnimateScreenContainer isVisible={!!currentWorklogToEdit} offScreenLocation='right' zIndex={3}>
            <EditWorklog />
          </AnimateScreenContainer>
          <AnimateScreenContainer isVisible={showSettingsScreen} offScreenLocation='right' zIndex={4}>
            <Settings />
          </AnimateScreenContainer>
        </View>
      </View>
    </AnimateScreenContainer>
  );
};

function createStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      position: 'relative',
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'stretch',
      width: '100%',
      height: '100%',
    },
    mainViewContainer: {
      position: 'relative',
      flexGrow: 1,
      ...Platform.select({
        windows: {
          borderTopLeftRadius: 10,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: theme.border,
        },
      }),
    },
    entriesContainer: {
      position: 'absolute',
      top: 0,
      right: 0,
      width: '100%',
      height: '100%',
    },
    overlayContainer: {
      position: 'absolute',
      top: 0,
      right: 0,
      zIndex: 2,
      width: '100%',
      height: '100%',
    },
  });
}
