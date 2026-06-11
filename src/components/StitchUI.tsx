import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { radius, shadow, spacing, fontFamily } from '../lib/theme';
import { useMobileTheme } from '../contexts/ThemeContext';

export const StitchGlassCard = ({ children, style }: { children: React.ReactNode; style?: any }) => {
  const { colors, theme } = useMobileTheme();
  const s = styles(colors, theme);
  return <View style={[s.glassCard, style]}>{children}</View>;
};

export const StitchNeoInset = ({ children, style }: { children: React.ReactNode; style?: any }) => {
  const { colors } = useMobileTheme();
  const s = styles(colors);
  return <View style={[s.neoInset, style]}>{children}</View>;
};

export const StitchNeoButton = ({ label, onPress, children, style, textStyle }: {
  label?: string;
  onPress?: () => void;
  children?: React.ReactNode;
  style?: any;
  textStyle?: any;
}) => {
  const { colors } = useMobileTheme();
  const s = styles(colors);
  return (
    <TouchableOpacity activeOpacity={0.82} onPress={onPress} style={[s.neoButton, style]}>
      {children || <Text style={[s.neoButtonText, textStyle]}>{label}</Text>}
    </TouchableOpacity>
  );
};

export const StitchLabel = ({ children, style }: { children: React.ReactNode; style?: any }) => {
  const { colors } = useMobileTheme();
  const s = styles(colors);
  return <Text style={[s.labelCaps, style]}>{children}</Text>;
};

const styles = (colors: any, theme = 'light') => StyleSheet.create({
  glassCard: {
    borderRadius: 32,
    borderWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.82)',
    borderLeftColor: 'rgba(255,255,255,0.82)',
    borderRightColor: colors.border,
    borderBottomColor: colors.border,
    backgroundColor: theme === 'dark' ? 'rgba(22,23,27,0.72)' : 'rgba(255,255,255,0.6)',
    ...shadow.sm,
  },
  neoInset: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  neoButton: {
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
    backgroundColor: colors.surface,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.sm,
  },
  neoButtonText: {
    color: colors.primary,
    fontFamily: fontFamily.sans,
    fontSize: 15,
    fontWeight: '900',
  },
  labelCaps: {
    color: colors.muted,
    fontFamily: fontFamily.sans,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.6,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
});
