import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { AppTheme, fontFamily, radius, shadow, spacing, typography } from '../lib/theme';
import { useAuth } from '../contexts/AuthContext';
import { useMobileTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import { getBillingUsage } from '../services/billing';
import { deactivateAccount, deleteAccount } from '../services/account';
import { ensureNotificationPermission } from '../services/notifications';
import { getMyProfile, updateMyProfile } from '../services/profile';
import {
  defaultNotificationPreferences,
  getNotificationPreferences,
  updateNotificationPreferences,
} from '../services/notificationPreferences';

const themeLabels: Array<{ value: AppTheme; label: string }> = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'brown', label: 'Brown' },
];

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const { theme, colors, setTheme } = useMobileTheme();
  const s = styles(colors, theme);
  const [notifications, setNotifications] = useState(true);
  const [notificationPrefs, setNotificationPrefs] = useState(defaultNotificationPreferences);
  const [usage, setUsage] = useState<any>(null);
  const [usageLoading, setUsageLoading] = useState(true);
  const [usageError, setUsageError] = useState('');
  const [profile, setProfile] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [securityBusy, setSecurityBusy] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [fieldDraft, setFieldDraft] = useState('');

  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Student';
  const fieldOfStudy = profile?.field_of_study || 'Field of study not set';
  const initials = displayName.slice(0, 2).toUpperCase();

  const loadUsage = useCallback(() => {
    let alive = true;
    setUsageLoading(true);
    setUsageError('');

    const usageTimeout = new Promise<{ timedOut: true }>((resolve) => {
      setTimeout(() => resolve({ timedOut: true }), 8000);
    });

    Promise.race([getBillingUsage(), usageTimeout])
      .then((next: any) => {
        if (!alive) return;
        if (next?.timedOut) {
          setUsage(null);
          setUsageError('Usage is taking longer than expected.');
          return;
        }
        setUsage(next);
      })
      .catch((error: any) => {
        if (!alive) return;
        setUsage(null);
        setUsageError(error?.response?.data?.error || error?.response?.data?.message || error?.message || 'Usage could not load.');
      })
      .finally(() => {
        if (alive) setUsageLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const cancelUsage = loadUsage();
    getMyProfile()
      .then(next => {
        setProfile(next);
        setNameDraft(next?.full_name || '');
        setFieldDraft(next?.field_of_study || '');
      })
      .catch(() => null);
    getNotificationPreferences()
      .then(next => {
        setNotificationPrefs(next);
        setNotifications(Boolean(next.planner_reminders));
      })
      .catch(() => null);
    return cancelUsage;
  }, [loadUsage]);

  const handleSignOut = () => {
    Alert.alert('Sign out', 'End this Orbit session on this device?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: signOut },
    ]);
  };

  const resetPassword = async () => {
    if (!user?.email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(user.email);
    Alert.alert('Password reset', error?.message || 'A password reset email has been sent.');
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      const next = await updateMyProfile({
        full_name: nameDraft.trim() || undefined,
        field_of_study: fieldDraft.trim() || undefined,
      });
      setProfile(next);
      setEditing(false);
    } catch (error: any) {
      Alert.alert('Profile update failed', error?.response?.data?.error || error?.message || 'Please try again.');
    } finally {
      setSavingProfile(false);
    }
  };

  const toggleNotifications = async (value: boolean) => {
    if (!value) {
      setNotifications(false);
      updateNotificationPreferences({ planner_reminders: false }).then(setNotificationPrefs).catch(() => null);
      return;
    }
    const allowed = await ensureNotificationPermission();
    setNotifications(allowed);
    if (allowed) {
      updateNotificationPreferences({ planner_reminders: true }).then(setNotificationPrefs).catch(() => null);
    }
    if (!allowed) Alert.alert('Notifications blocked', 'Enable notifications in device settings to receive study reminders.');
  };

  const handleDeactivate = () => {
    Alert.alert('Deactivate account', 'Pause this Orbit profile? You can sign back in later to reactivate.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Deactivate',
        style: 'destructive',
        onPress: async () => {
          setSecurityBusy(true);
          try {
            await deactivateAccount();
            await signOut();
          } finally {
            setSecurityBusy(false);
          }
        },
      },
    ]);
  };

  const handleDelete = () => {
    Alert.alert('Delete account', 'Permanently delete your Orbit account and app data? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setSecurityBusy(true);
          try {
            await deleteAccount();
            await signOut();
          } finally {
            setSecurityBusy(false);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <Text style={s.eyebrow}>Orbit</Text>
          <Text style={s.title}>Settings</Text>
        </View>

        <View style={s.profileCard}>
          <View style={s.profileCover} />
          <View style={s.profileBody}>
            <View style={s.avatar}><Text style={s.avatarText}>{initials}</Text></View>
            <TouchableOpacity style={s.editPill} activeOpacity={0.8} onPress={() => setEditing(value => !value)}>
              <Text style={s.editText}>{editing ? 'Close' : 'Edit'}</Text>
            </TouchableOpacity>
            {editing ? (
              <View style={s.editStack}>
                <TextInput
                  value={nameDraft}
                  onChangeText={setNameDraft}
                  placeholder="Full name"
                  placeholderTextColor={colors.tertiary}
                  style={s.input}
                />
                <TextInput
                  value={fieldDraft}
                  onChangeText={setFieldDraft}
                  placeholder="Field of study"
                  placeholderTextColor={colors.tertiary}
                  style={s.input}
                />
                <TouchableOpacity disabled={savingProfile} style={s.saveBtn} onPress={saveProfile}>
                  <Text style={s.saveText}>{savingProfile ? 'Saving' : 'Save profile'}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={s.profileText}>
                <Text style={s.profileName} numberOfLines={1}>{displayName}</Text>
                <Text style={s.profileEmail} numberOfLines={1}>{user?.email || 'Signed in'}</Text>
                <Text style={s.profileField} numberOfLines={1}>{fieldOfStudy}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={s.themeSwitch}>
          {themeLabels.map(item => {
            const active = theme === item.value;
            return (
              <TouchableOpacity key={item.value} activeOpacity={0.82} onPress={() => setTheme(item.value)} style={[s.themeSegment, active && s.themeSegmentActive]}>
                <Text style={[s.themeText, active && s.themeTextActive]}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity activeOpacity={0.84} style={s.billingCard} onPress={() => router.push('/billing')}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.billingEyebrow}>Subscription</Text>
            <Text style={s.billingTitle}>Plans and AI usage</Text>
            <Text style={s.billingSub}>Review payment, provider allocation, and token allowance.</Text>
          </View>
          <View style={s.billingButton}>
            <Text style={s.billingButtonText}>Open</Text>
          </View>
        </TouchableOpacity>

        <Section title="Account" colors={colors} theme={theme}>
          <ActionRow colors={colors} title="Email confirmation" detail={user?.email || ''} value={user?.email_confirmed_at ? 'Verified' : 'Pending'} tone={user?.email_confirmed_at ? 'success' : 'warning'} />
        </Section>

        <Section title="Usage" colors={colors} theme={theme}>
          {usageLoading ? (
            <View style={s.usageLoading}>
              <ActivityIndicator color={colors.muted} />
            </View>
          ) : usageError ? (
            <View style={s.usageErrorBox}>
              <Text style={s.usageErrorText}>{usageError}</Text>
              <TouchableOpacity style={s.retryBtn} onPress={loadUsage}>
                <Text style={s.retryText}>Retry usage</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={s.usageStrip}>
              <UsageItem colors={colors} label="Used" value={usage?.tokens_used?.toLocaleString?.() ?? '0'} />
              <UsageItem colors={colors} label="Remaining" value={usage?.tokens_remaining === null ? 'Plan' : usage?.tokens_remaining?.toLocaleString?.() ?? '0'} />
              <UsageItem colors={colors} label="AI uses" value={String(usage?.total_ai_interactions ?? 0)} />
            </View>
          )}
        </Section>

        <Section title="Device" colors={colors} theme={theme}>
          <View style={s.row}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.rowLabel}>Mobile reminders</Text>
              <Text style={s.rowSub}>{notificationPrefs.planner_reminders ? 'Planner reminders synced to your account' : 'Planner reminders are off'}</Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={toggleNotifications}
              trackColor={{ false: colors.border, true: colors.green + '70' }}
              thumbColor={notifications ? colors.green : colors.muted}
            />
          </View>
        </Section>

        <Section title="Security" colors={colors} theme={theme}>
          <ActionRow colors={colors} title="Reset password" detail="Send a reset link to your email" value="Send" onPress={resetPassword} />
          <ActionRow colors={colors} title="Deactivate account" detail="Pause profile and sign out" value="Pause" tone="warning" disabled={securityBusy} onPress={handleDeactivate} />
          <ActionRow colors={colors} title="Delete account" detail="Remove app data and auth account" value="Delete" tone="danger" disabled={securityBusy} onPress={handleDelete} />
        </Section>

        <TouchableOpacity style={s.signOutBtn} onPress={handleSignOut}>
          <Text style={s.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, colors, theme, children }: { title: string; colors: any; theme: string; children: React.ReactNode }) {
  const s = styles(colors, theme);
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={s.sectionPanel}>{children}</View>
    </View>
  );
}

function ActionRow({ colors, title, detail, value, tone, disabled, onPress }: {
  colors: any;
  title: string;
  detail: string;
  value: string;
  tone?: 'success' | 'warning' | 'danger';
  disabled?: boolean;
  onPress?: () => void;
}) {
  const textColor = tone === 'danger' ? colors.red : tone === 'warning' ? colors.yellow : tone === 'success' ? colors.green : colors.foreground;
  const rowStyles = actionStyles(colors);
  return (
    <TouchableOpacity disabled={!onPress || disabled} activeOpacity={0.84} style={rowStyles.row} onPress={onPress}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[rowStyles.label, { color: textColor }]}>{title}</Text>
        <Text style={rowStyles.sub} numberOfLines={1}>{detail}</Text>
      </View>
      <Text style={[rowStyles.value, { color: textColor }]}>{value}</Text>
    </TouchableOpacity>
  );
}

function UsageItem({ colors, label, value }: { colors: any; label: string; value: string }) {
  const itemStyles = usageStyles(colors);
  return (
    <View style={itemStyles.item}>
      <Text style={itemStyles.label}>{label}</Text>
      <Text style={itemStyles.value} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const actionStyles = (colors: any) => StyleSheet.create({
  row: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: 10,
  },
  label: { color: colors.foreground, fontFamily: fontFamily.sans, fontSize: typography.sm, fontWeight: '900' },
  sub: { color: colors.muted, fontFamily: fontFamily.sans, fontSize: 11, marginTop: 3, fontWeight: '600' },
  value: { color: colors.foreground, fontFamily: fontFamily.sans, fontSize: 12, fontWeight: '900' },
});

const usageStyles = (colors: any) => StyleSheet.create({
  item: {
    flex: 1,
    minHeight: 66,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.input,
    padding: spacing.sm,
    justifyContent: 'center',
  },
  label: { color: colors.muted, fontFamily: fontFamily.sans, fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  value: { color: colors.foreground, fontFamily: fontFamily.display, fontSize: 17, fontWeight: '900', marginTop: 3 },
});

const styles = (colors: any, theme: string) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: 150, gap: spacing.sm },
  header: { gap: 2 },
  eyebrow: { color: colors.muted, fontFamily: fontFamily.sans, fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  title: { color: colors.foreground, fontFamily: fontFamily.display, fontSize: 30, fontWeight: '900' },
  profileCard: {
    minHeight: 208,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    overflow: 'hidden',
    ...shadow.md,
  },
  profileCover: {
    height: 86,
    backgroundColor: theme === 'light' ? 'rgba(94,57,224,0.10)' : 'rgba(255,255,255,0.075)',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  profileBody: { padding: spacing.md, paddingTop: 0 },
  avatar: {
    width: 74,
    height: 74,
    borderRadius: 30,
    marginTop: -37,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.background,
  },
  avatarText: { color: colors.onPrimary, fontFamily: fontFamily.sans, fontSize: typography.lg, fontWeight: '900' },
  editPill: {
    position: 'absolute',
    top: 12,
    right: spacing.md,
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  editText: { color: colors.onPrimary, fontFamily: fontFamily.sans, fontSize: 12, fontWeight: '900' },
  profileText: { marginTop: spacing.sm, gap: 2 },
  profileName: { color: colors.foreground, fontFamily: fontFamily.display, fontSize: 22, fontWeight: '900' },
  profileEmail: { color: colors.muted, fontFamily: fontFamily.sans, fontSize: 12, fontWeight: '700' },
  profileField: { color: colors.tertiary, fontFamily: fontFamily.sans, fontSize: 12, fontWeight: '700' },
  editStack: { marginTop: spacing.md, gap: spacing.sm },
  input: {
    height: 46,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.input,
    color: colors.foreground,
    fontFamily: fontFamily.sans,
    fontSize: typography.sm,
    fontWeight: '800',
    paddingHorizontal: spacing.md,
  },
  saveBtn: { height: 46, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  saveText: { color: colors.onPrimary, fontFamily: fontFamily.sans, fontSize: typography.sm, fontWeight: '900' },
  themeSwitch: {
    height: 46,
    flexDirection: 'row',
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: theme === 'light' ? 'rgba(255,255,255,0.74)' : 'rgba(255,255,255,0.07)',
    padding: 5,
  },
  themeSegment: { flex: 1, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  themeSegmentActive: { backgroundColor: colors.primary },
  themeText: { color: colors.muted, fontFamily: fontFamily.sans, fontSize: 12, fontWeight: '900' },
  themeTextActive: { color: colors.onPrimary },
  billingCard: {
    minHeight: 120,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.glass,
    padding: spacing.md,
    ...shadow.sm,
  },
  billingEyebrow: { color: colors.muted, fontFamily: fontFamily.sans, fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.8 },
  billingTitle: { color: colors.foreground, fontFamily: fontFamily.display, fontSize: 19, fontWeight: '900', marginTop: 2 },
  billingSub: { color: colors.muted, fontFamily: fontFamily.sans, fontSize: 12, lineHeight: 17, marginTop: 4 },
  billingButton: { height: 38, paddingHorizontal: 16, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  billingButtonText: { color: colors.onPrimary, fontFamily: fontFamily.sans, fontSize: 12, fontWeight: '900' },
  section: { gap: spacing.xs },
  sectionTitle: { color: colors.foreground, fontFamily: fontFamily.sans, fontSize: 13, fontWeight: '900', paddingHorizontal: 2 },
  sectionPanel: {
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.glass,
    paddingHorizontal: spacing.md,
    ...shadow.sm,
  },
  row: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  rowLabel: { color: colors.foreground, fontFamily: fontFamily.sans, fontSize: typography.sm, fontWeight: '900' },
  rowSub: { color: colors.muted, fontFamily: fontFamily.sans, fontSize: 11, marginTop: 3, fontWeight: '600' },
  usageStrip: { flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.md },
  usageLoading: { minHeight: 80, alignItems: 'flex-start', justifyContent: 'center', paddingVertical: spacing.md },
  usageErrorBox: { gap: spacing.sm, paddingVertical: spacing.md },
  usageErrorText: { color: colors.red, fontFamily: fontFamily.sans, fontSize: 12, fontWeight: '800', lineHeight: 17 },
  retryBtn: { alignSelf: 'flex-start', height: 36, borderRadius: radius.full, paddingHorizontal: spacing.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  retryText: { color: colors.onPrimary, fontFamily: fontFamily.sans, fontSize: 12, fontWeight: '900' },
  signOutBtn: { height: 50, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.red + '40', backgroundColor: colors.red + '12' },
  signOutText: { color: colors.red, fontFamily: fontFamily.sans, fontSize: typography.sm, fontWeight: '900' },
});
