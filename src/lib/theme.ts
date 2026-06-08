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

export const spacing = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48,
};

export const radius = {
  sm: 12, md: 20, lg: 24, xl: 28, xxl: 36, full: 9999,
};

export const typography = {
  xs: 11, sm: 13, base: 15, lg: 17, xl: 20, '2xl': 24, '3xl': 30, '4xl': 36,
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
