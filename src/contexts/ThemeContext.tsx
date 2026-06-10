import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AppTheme, ThemeColors, themePalettes } from '../lib/theme';

interface MobileThemeContextType {
  theme: AppTheme;
  colors: ThemeColors;
  setTheme: (theme: AppTheme) => Promise<void>;
}

const STORAGE_KEY = 'orbit-mobile-theme';
const ThemeContext = createContext<MobileThemeContextType | undefined>(undefined);

export const MobileThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<AppTheme>('light');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(value => {
      if (value === 'dark' || value === 'light' || value === 'brown') {
        setThemeState(value);
      }
    }).catch(() => {});
  }, []);

  const setTheme = async (next: AppTheme) => {
    setThemeState(next);
    await AsyncStorage.setItem(STORAGE_KEY, next);
  };

  const value = useMemo(() => ({
    theme,
    colors: themePalettes[theme],
    setTheme,
  }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useMobileTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useMobileTheme must be used within MobileThemeProvider');
  return ctx;
};
