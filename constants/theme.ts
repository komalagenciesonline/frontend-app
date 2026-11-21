/**
 * Komal Agencies — "Jade Trade House"
 * Deep jade + saffron accents on cool mist. Look & feel only.
 */
export const colors = {
  bg: '#E9EFEC',
  bgDeep: '#DCE6E1',
  surface: '#FFFEFB',
  surfaceMuted: '#F3F7F5',
  ink: '#10241F',
  inkMuted: '#5A6B64',
  inkFaint: '#8A9B93',
  line: '#C5D4CE',
  lineStrong: '#A8BBB3',
  brand: '#0A5C52',
  brandDark: '#062E2A',
  brandMid: '#0E7468',
  brandSoft: '#D7EBE6',
  brandMist: '#7DCFC4',
  accent: '#E85D04',
  accentSoft: '#FFE8D6',
  success: '#1B7A4E',
  successSoft: '#D8F0E4',
  warning: '#C27803',
  warningSoft: '#FFF0D6',
  danger: '#C62828',
  dangerSoft: '#FCE4E4',
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(16, 36, 31, 0.45)',
  purple: '#6B4C9A',
  purpleSoft: '#EDE4F7',
} as const;

export const fonts = {
  display: 'Outfit_700Bold',
  displayExtra: 'Outfit_800ExtraBold',
  sans: 'PlusJakartaSans_400Regular',
  sansMedium: 'PlusJakartaSans_500Medium',
  sansSemi: 'PlusJakartaSans_600SemiBold',
  sansBold: 'PlusJakartaSans_700Bold',
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
} as const;

export const shadow = {
  card: {
    shadowColor: '#062E2A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
} as const;

export const theme = { colors, fonts, radii, shadow } as const;
export default theme;
