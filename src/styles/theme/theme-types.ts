export interface Theme {
  type: 'light' | 'dark';

  contrast: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textButton: string;
  red: string;
  orange: string;
  yellow: string;
  green: string;
  mint: string;
  teal: string;
  cyan: string;
  blue: string;
  blueHover: string;
  blueActive: string;
  indigo: string;
  purple: string;
  pink: string;
  gray: string;
  brown: string;

  background: string;
  backgroundDark: string;
  border: string;
  borderSolid: string;
  surface: string;
  surfaceBorder: string;

  buttonBase: string;
  buttonHover: string;
  buttonActive: string;
  secondaryButtonBase: string;
  secondaryButtonHover: string;
  secondaryButtonActive: string;
  secondaryButtonBorder: string;
  dangerButtonBase: string;
  dangerButtonHover: string;
  dangerButtonActive: string;
  transparentButtonHover: string;
  transparentButtonActive: string;
  surfaceButtonBase: string;
  surfaceButtonHover: string;
  surfaceButtonActive: string;
  dayButtonBase: string;
  dayButtonHover: string;
  dayButtonBorder: string;
  dayButtonBorderInset: string;
  cardsSelectionButtonBorderInset: string;
  cardsSelectionButtonHover: string;
  cardsSelectionButtonActive: string;
}