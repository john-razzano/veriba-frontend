import { DefaultTheme, type Theme } from '@react-navigation/native';
import { StyleSheet } from 'react-native';

export const colors = {
  bg: '#EDEDEB',
  bgCard: '#FFFFFF',
  bgInput: '#F5F4F2',
  copper: '#B5672D',
  copperLight: '#C8844E',
  teal: '#2D4F5E',
  tealLight: '#3A6577',
  brown: '#7A4E2D',
  text: '#1A1A1A',
  textMid: '#5A5650',
  textLight: '#9B958D',
  border: '#DDD9D3',
  borderLight: '#E8E5E0',
  success: '#3D8B5E',
  successBg: '#EDF5F0',
  warning: '#B5672D',
  warningBg: '#FBF3EC',
  error: '#B43C3C',
  errorBg: '#FBECEC',
  tealBg: '#EAF0F2',
  white: '#FFFFFF',
  black: '#000000',
} as const;

export const gradients = {
  primary: ['#B5672D', '#7A4E2D', '#2D4F5E'] as const,
  subtle: ['rgba(181,103,45,0.08)', 'rgba(45,79,94,0.08)'] as const,
} as const;

export const fonts = {
  display: {
    light: 'CormorantGaramond_300Light',
    regular: 'CormorantGaramond_400Regular',
    medium: 'CormorantGaramond_500Medium',
    semibold: 'CormorantGaramond_600SemiBold',
  },
  body: {
    regular: 'DMSans_400Regular',
    medium: 'DMSans_500Medium',
    semibold: 'DMSans_600SemiBold',
    bold: 'DMSans_700Bold',
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radii = {
  sm: 6,
  md: 10,
  lg: 12,
  xl: 16,
  full: 999,
} as const;

export const shadows = StyleSheet.create({
  sm: {
    shadowColor: colors.black,
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  md: {
    shadowColor: colors.black,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  lg: {
    shadowColor: colors.black,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  copper: {
    shadowColor: colors.copper,
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
});

export const typography = {
  logo: {
    fontFamily: fonts.display.light,
    fontSize: 48,
    letterSpacing: -1,
  },
  displayLg: {
    fontFamily: fonts.display.light,
    fontSize: 28,
    letterSpacing: -0.6,
  },
  displayMd: {
    fontFamily: fonts.display.light,
    fontSize: 22,
    letterSpacing: -0.4,
  },
  displaySm: {
    fontFamily: fonts.display.light,
    fontSize: 18,
  },
  stat: {
    fontFamily: fonts.display.semibold,
    fontSize: 22,
  },
  bodyLg: {
    fontFamily: fonts.body.regular,
    fontSize: 15,
    lineHeight: 24,
  },
  bodyMd: {
    fontFamily: fonts.body.regular,
    fontSize: 13,
    lineHeight: 20,
  },
  bodySm: {
    fontFamily: fonts.body.regular,
    fontSize: 12,
    lineHeight: 18,
  },
  bodyXs: {
    fontFamily: fonts.body.regular,
    fontSize: 11,
    lineHeight: 16,
  },
  button: {
    fontFamily: fonts.body.semibold,
    fontSize: 14,
    letterSpacing: 0.2,
  },
  label: {
    fontFamily: fonts.body.semibold,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
  },
  pill: {
    fontFamily: fonts.body.semibold,
    fontSize: 9,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
} as const;

export const navigationTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.copper,
    background: colors.bg,
    card: colors.bg,
    text: colors.text,
    border: colors.borderLight,
    notification: colors.copper,
  },
};
