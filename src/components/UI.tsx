import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { radius, spacing, shadow } from '../lib/theme';
import { useMobileTheme } from '../contexts/ThemeContext';

// Skeleton loader - shimmer effect
export const Skeleton = ({ width, height, borderRadius = radius.md, style }: {
  width: number | string; height: number; borderRadius?: number; style?: any;
}) => {
  const { colors } = useMobileTheme();
  return <View style={[{ width: width as any, height, borderRadius, backgroundColor: colors.surface }, style]} />;
};

export const CardSkeleton = () => {
  const { colors } = useMobileTheme();
  const sk = styles(colors);
  return (
  <View style={sk.card}>
    <View style={sk.row}>
      <Skeleton width={40} height={40} borderRadius={radius.full} />
      <View style={{ flex: 1, gap: 6 }}>
        <Skeleton width="70%" height={14} />
        <Skeleton width="40%" height={10} />
      </View>
    </View>
    <Skeleton width="100%" height={10} style={{ marginTop: 12 }} />
    <Skeleton width="80%" height={10} style={{ marginTop: 6 }} />
  </View>
);
};

export const StatSkeleton = () => {
  const { colors } = useMobileTheme();
  const sk = styles(colors);
  return (
  <View style={[sk.card, sk.stat]}>
    <Skeleton width={32} height={32} borderRadius={radius.md} />
    <Skeleton width="60%" height={20} style={{ marginTop: 12 }} />
    <Skeleton width="80%" height={10} style={{ marginTop: 6 }} />
  </View>
);
};

// iOS-style grouped list row
export const ListRow = ({ icon, iconBg, label, value, showChevron = true, onPress, danger }: {
  icon: React.ReactNode; iconBg: string; label: string;
  value?: string; showChevron?: boolean; onPress?: () => void; danger?: boolean;
}) => {
  const { colors } = useMobileTheme();
  const sk = styles(colors);
  const { TouchableOpacity } = require('react-native');
  return (
    <TouchableOpacity style={sk.listRow} onPress={onPress} activeOpacity={0.7}>
      <View style={[sk.listIcon, { backgroundColor: iconBg }]}>{icon}</View>
      <View style={sk.listContent}>
        <Text style={[sk.listLabel, danger && { color: colors.red }]}>{label}</Text>
        {value && <Text style={sk.listValue}>{value}</Text>}
      </View>
      {showChevron && <Text style={sk.chevron}>›</Text>}
    </TouchableOpacity>
  );
};

// Pill badge
export const Badge = ({ label, color }: { label: string; color?: string }) => {
  const { colors } = useMobileTheme();
  const sk = styles(colors);
  const badgeColor = color || colors.primary;
  return (
    <View style={[sk.badge, { backgroundColor: badgeColor + '20' }]}>
      <Text style={[sk.badgeText, { color: badgeColor }]}>{label}</Text>
    </View>
  );
};

// Section header (iOS grouped style)
export const SectionHeader = ({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) => {
  const { colors } = useMobileTheme();
  const sk = styles(colors);
  const { TouchableOpacity } = require('react-native');
  return (
    <View style={sk.sectionHeader}>
      <Text style={sk.sectionTitle}>{title}</Text>
      {action && <TouchableOpacity onPress={onAction}><Text style={sk.sectionAction}>{action}</Text></TouchableOpacity>}
    </View>
  );
};

// Empty state
export const EmptyState = ({ icon, title, subtitle }: { icon?: string; title: string; subtitle?: string }) => {
  const { colors } = useMobileTheme();
  const sk = styles(colors);
  return (
  <View style={sk.empty}>
    {icon ? <Text style={sk.emptyIcon}>{icon}</Text> : <View style={sk.emptyMark} />}
    <Text style={sk.emptyTitle}>{title}</Text>
    {subtitle && <Text style={sk.emptySub}>{subtitle}</Text>}
  </View>
);
};

const styles = (colors: any) => StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.xl, padding: spacing.md, borderWidth: 1, borderColor: colors.border, ...shadow.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stat: { flex: 1 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 12, paddingHorizontal: spacing.md },
  listIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  listContent: { flex: 1 },
  listLabel: { color: colors.foreground, fontSize: 15, fontWeight: '400' },
  listValue: { color: colors.muted, fontSize: 13, marginTop: 1 },
  chevron: { color: colors.muted, fontSize: 20, fontWeight: '300' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  badgeText: { fontSize: 11, fontWeight: '600' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  sectionTitle: { color: colors.muted, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
  sectionAction: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  empty: { alignItems: 'center', padding: spacing.xxl, gap: spacing.sm },
  emptyIcon: { color: colors.muted, fontSize: 32, fontWeight: '900' },
  emptyMark: { width: 42, height: 42, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.input },
  emptyTitle: { color: colors.foreground, fontSize: 17, fontWeight: '600' },
  emptySub: { color: colors.muted, fontSize: 13, textAlign: 'center', lineHeight: 20 },
});
