export const colors = {
  // Premium glass dark theme (matches web)
  primary: '#ffffff',
  onPrimary: '#0a0a0a',
  background: '#0a0a0a',
  backgroundSecondary: '#111111',
  card: 'rgba(255,255,255,0.06)',
  glass: 'rgba(255,255,255,0.08)',
  glassHighlight: 'rgba(255,255,255,0.18)',
  border: 'rgba(255,255,255,0.12)',
  muted: 'rgba(255,255,255,0.65)',
  tertiary: 'rgba(255,255,255,0.45)',
  foreground: '#ffffff',
  accent: 'rgba(255,255,255,0.08)',
  red: '#ff5c5c',
  green: '#00d26a',
  blue: '#4da3ff',
  yellow: '#f59e0b',
  surface: 'rgba(255,255,255,0.05)',
  surfaceElevated: 'rgba(255,255,255,0.08)',
  separator: 'rgba(255,255,255,0.12)',
  input: 'rgba(255,255,255,0.05)',
};

export type AppTheme = 'dark' | 'light' | 'brown';

export type ThemeColors = typeof colors;

export const themePalettes: Record<AppTheme, ThemeColors> = {
  dark: colors,
  light: {
    primary: '#5e39e0',
    onPrimary: '#ffffff',
    background: '#f3f4f6',
    backgroundSecondary: '#fdf8ff',
    card: 'rgba(255,255,255,0.82)',
    glass: 'rgba(255,255,255,0.86)',
    glassHighlight: 'rgba(255,255,255,0.96)',
    border: 'rgba(38,35,50,0.14)',
    muted: 'rgba(50,47,62,0.76)',
    tertiary: 'rgba(50,47,62,0.52)',
    foreground: '#1c1a24',
    accent: 'rgba(94,57,224,0.08)',
    red: '#ff5c5c',
    green: '#10b981',
    blue: '#3b82f6',
    yellow: '#fed01b',
    surface: 'rgba(253,248,255,0.9)',
    surfaceElevated: 'rgba(255,255,255,0.92)',
    separator: 'rgba(38,35,50,0.12)',
    input: 'rgba(255,255,255,0.92)',
  },
  brown: {
    primary: '#17130f',
    onPrimary: '#fff8ef',
    background: '#f5efe7',
    backgroundSecondary: '#fffaf4',
    card: 'rgba(255,250,244,0.86)',
    glass: 'rgba(255,250,244,0.88)',
    glassHighlight: 'rgba(255,255,255,0.96)',
    border: 'rgba(23,19,15,0.14)',
    muted: 'rgba(23,19,15,0.66)',
    tertiary: 'rgba(23,19,15,0.44)',
    foreground: '#17130f',
    accent: 'rgba(23,19,15,0.06)',
    red: '#ff5c5c',
    green: '#00d26a',
    blue: '#4da3ff',
    yellow: '#f59e0b',
    surface: 'rgba(255,250,244,0.9)',
    surfaceElevated: 'rgba(255,250,244,0.96)',
    separator: 'rgba(23,19,15,0.14)',
    input: 'rgba(255,250,244,0.9)',
  },
};

export const spacing = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48,
};

export const radius = {
  sm: 12, md: 20, lg: 24, xl: 28, xxl: 36, full: 9999,
};

export const typography = {
  xs: 11, sm: 13, base: 15, lg: 17, xl: 20, '2xl': 24, '3xl': 30, '4xl': 36,
};

export const fontFamily = {
  brand: 'Avant Garde Gothic',
  sans: 'Avenir Next',
  reading: 'Avenir Next',
  display: 'Cooper BT',
  displayFallback: 'Georgia',
};

export const shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 32,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 48,
    elevation: 6,
  },
  floating: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.5,
    shadowRadius: 80,
    elevation: 18,
  },
};
