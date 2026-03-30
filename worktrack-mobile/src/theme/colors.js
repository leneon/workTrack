// ============================================================
// WorkTrack Mobile - Thème Hyundai Officiel
// Couleurs basées sur la charte graphique Hyundai Motor Company
// Primary Blue: #002C5F | Accent: #00AAD2
// ============================================================

export const Colors = {
  // Hyundai Primary Blue
  primary: '#002C5F',
  primaryDark: '#001A3A',
  primaryLight: '#003F8A',

  // Hyundai Accent / Secondary
  accent: '#00AAD2',
  accentLight: '#00C8F0',
  accentDark: '#0088AA',

  // Neutrals
  white: '#FFFFFF',
  black: '#000000',
  dark: '#1A1A1A',

  // Grays (Hyundai palette)
  gray: '#60605B',
  grayLight: '#BFBAAF',
  grayExtraLight: '#F0EEE9',
  background: '#F5F7FA',
  surface: '#FFFFFF',

  // Status Colors
  success: '#27AE60',
  successLight: '#E8F8F0',
  warning: '#F39C12',
  warningLight: '#FEF5E7',
  error: '#E74C3C',
  errorLight: '#FDECEA',
  info: '#00AAD2',
  infoLight: '#E0F7FC',

  // Task Status Colors
  statusPending: '#F39C12',
  statusPendingBg: '#FEF5E7',
  statusInProgress: '#00AAD2',
  statusInProgressBg: '#E0F7FC',
  statusDone: '#27AE60',
  statusDoneBg: '#E8F8F0',

  // Text
  textPrimary: '#1A1A1A',
  textSecondary: '#60605B',
  textLight: '#BFBAAF',
  textOnPrimary: '#FFFFFF',
  textOnAccent: '#FFFFFF',

  // Border
  border: '#E0DED8',
  borderLight: '#F0EEE9',

  // Shadow
  shadow: 'rgba(0, 44, 95, 0.12)',

  // Gradients (used as arrays for LinearGradient)
  gradientPrimary: ['#002C5F', '#003F8A'],
  gradientAccent: ['#00AAD2', '#00C8F0'],
};

export const Typography = {
  fontSizes: {
    xs: 10,
    sm: 12,
    md: 14,
    base: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 30,
    display: 36,
  },
  fontWeights: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.8,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const BorderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 999,
};

export const Shadows = {
  sm: {
    shadowColor: '#002C5F',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#002C5F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#002C5F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 8,
  },
};

export default Colors;
