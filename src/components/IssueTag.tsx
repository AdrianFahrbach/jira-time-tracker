import transparentize from 'polished/lib/color/transparentize';
import React, { useContext, useMemo } from 'react';
import { Image, Pressable, PressableProps, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { ThemeContext } from '../contexts/theme.context';
import { typo } from '../styles/typo';
import { getPadding } from '../styles/utils';
import { Project } from '../types/global.types';

function hashStr(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i);
    hash += charCode;
  }
  return hash;
}

interface IssueTagProps extends Omit<PressableProps, 'style'> {
  label: string;
  project: Project;
  onPress?: () => void;
  style?: ViewStyle;
}

export const IssueTag: React.FC<IssueTagProps> = ({ onPress, label, project, ...props }) => {
  const { theme } = useContext(ThemeContext);
  const tagThemes: Record<string, { text: TextStyle; bg: ViewStyle }> = useMemo(
    () => ({
      red: {
        text: { color: theme.red },
        bg: { backgroundColor: transparentize(0.75, theme.red) },
      },
      orange: {
        text: { color: theme.orange },
        bg: { backgroundColor: transparentize(0.75, theme.orange) },
      },
      yellow: {
        text: { color: theme.yellow },
        bg: { backgroundColor: transparentize(0.75, theme.yellow) },
      },
      green: {
        text: { color: theme.green },
        bg: { backgroundColor: transparentize(0.75, theme.green) },
      },
      mint: {
        text: { color: theme.mint },
        bg: { backgroundColor: transparentize(0.75, theme.mint) },
      },
      teal: {
        text: { color: theme.teal },
        bg: { backgroundColor: transparentize(0.75, theme.teal) },
      },
      cyan: {
        text: { color: theme.cyan },
        bg: { backgroundColor: transparentize(0.75, theme.cyan) },
      },
      blue: {
        text: { color: theme.blue },
        bg: { backgroundColor: transparentize(0.75, theme.blue) },
      },
      indigo: {
        text: { color: theme.indigo },
        bg: { backgroundColor: transparentize(0.75, theme.indigo) },
      },
      purple: {
        text: { color: theme.purple },
        bg: { backgroundColor: transparentize(0.75, theme.purple) },
      },
      pink: {
        text: { color: theme.pink },
        bg: { backgroundColor: transparentize(0.75, theme.pink) },
      },
      gray: {
        text: { color: theme.gray },
        bg: { backgroundColor: transparentize(0.75, theme.gray) },
      },
      brown: {
        text: { color: theme.brown },
        bg: { backgroundColor: transparentize(0.75, theme.brown) },
      },
    }),
    [theme.type]
  );
  const tagThemesKeys = Object.keys(tagThemes);
  const currentTheme = tagThemes[tagThemesKeys[hashStr(label) % tagThemesKeys.length]];

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.default, pressed && styles.isSelected, props.style]}>
      {project === 'tmh' && <Image style={styles.logo} source={require('../assets/logo-tmh.png')} />}
      {project === 'orcaya' && <Image style={styles.logo} source={require('../assets/logo-orcaya.png')} />}
      {project === 'solid' && <Image style={styles.logo} source={require('../assets/logo-solid.png')} />}
      <View style={[styles.labelContainer, currentTheme.bg]}>
        <Text style={[styles.label, currentTheme.text]}>{label}</Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  default: {
    display: 'flex',
    alignItems: 'center',
    flexDirection: 'row',
    height: 20,
    backgroundColor: 'transparent',
    textAlign: 'center',
  },
  isSelected: {
    opacity: 0.75,
  },
  logo: {
    width: 20,
    height: 20,
    marginRight: 2,
    borderTopLeftRadius: 5,
    borderBottomLeftRadius: 5,
  },
  labelContainer: {
    display: 'flex',
    alignItems: 'center',
    flexDirection: 'row',
    ...getPadding(3, 5),
    height: 20,
    borderTopRightRadius: 5,
    borderBottomRightRadius: 5,
  },
  label: {
    ...typo.subheadlineEmphasized,
  },
});
