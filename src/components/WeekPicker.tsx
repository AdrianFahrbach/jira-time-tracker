import { getISOWeek } from 'date-fns';
import React, { FC, useContext } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { NavigationContext } from '../contexts/navigation.context';
import { ThemeContext } from '../contexts/theme.context';
import { formatDateToYYYYMMDD, parseDateFromYYYYMMDD } from '../services/date.service';
import { useThemedStyles } from '../services/theme.service';
import { Theme } from '../styles/theme/theme-types';
import { typo } from '../styles/typo';
import { ButtonTransparent } from './ButtonTransparent';

export const WeekPicker: FC = () => {
  const { selectedDate, setSelectedDate } = useContext(NavigationContext);
  const { theme } = useContext(ThemeContext);
  const styles = useThemedStyles(createStyles);

  const selectedDateParsed = parseDateFromYYYYMMDD(selectedDate);

  return (
    <>
      <View style={styles.container}>
        <ButtonTransparent
          onPress={() => {
            const newDate = new Date(selectedDateParsed);
            newDate.setDate(newDate.getDate() - 7);
            setSelectedDate(formatDateToYYYYMMDD(newDate));
          }}
          hasLargePadding>
          <Image
            style={styles.arrow}
            source={
              theme.type === 'light'
                ? require('../assets/icons/chevron-left-light.png')
                : require('../assets/icons/chevron-left-dark.png')
            }
          />
        </ButtonTransparent>
        <View>
          <Text style={styles.label}>KW</Text>
          {/* TODO: This is not locale aware, but it's fine for now. */}
          <Text style={styles.value}>{getISOWeek(selectedDateParsed)}</Text>
        </View>
        <ButtonTransparent
          onPress={() => {
            const newDate = new Date(selectedDateParsed);
            newDate.setDate(newDate.getDate() + 7);
            setSelectedDate(formatDateToYYYYMMDD(newDate));
          }}
          hasLargePadding>
          <Image
            style={styles.arrow}
            source={
              theme.type === 'light'
                ? require('../assets/icons/chevron-right-light.png')
                : require('../assets/icons/chevron-right-dark.png')
            }
          />
        </ButtonTransparent>
      </View>
    </>
  );
};

function createStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      marginBottom: 8,
    },
    arrow: {
      width: 7,
      height: 12,
    },
    label: {
      ...typo.subheadline,
      color: theme.textSecondary,
      textAlign: 'center',
    },
    value: {
      ...typo.headline,
      color: theme.textPrimary,
      textAlign: 'center',
    },
  });
}
