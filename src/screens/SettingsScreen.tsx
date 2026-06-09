import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { AppTheme, radius, spacing, typography } from '../lib/theme';
import { useAuth } from '../contexts/AuthContext';
import { useMobileTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import { getBillingUsage } from '../services/billing';

const themeLabels: Array<{ value: AppTheme; label: string; detail: string }> = [
  { value: 'dark', label: 'Dark', detail: 'Premium black glass' },
  { value: 'light', label: 'Light', detail: 'Clear bright interface' },
  { value: 'brown', label: 'Brown', detail: 'Warm dark glass' },
];

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const { theme, colors, setTheme } = useMobileTheme();
  const [notifications, setNotifications] = useState(true);
  const [usage, setUsage] = useState<any>(null);
  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Student';
  const s = styles(colors);

  useEffect(() => {
    getBillingUsage().then(setUsage).catch(() => setUsage(null));
  }, []);

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

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <Text style={s.eyebrow}>Orbit</Text>
          <Text style={s.title}>Settings</Text>
          <Text style={s.sub}>Profile, payments, security, usage, and device preferences</Text>
        </View>

        <View style={s.profileCard}>
          <View style={s.avatar}><Text style={s.avatarText}>{displayName.slice(0, 2).toUpperCase()}</Text></View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.profileName} numberOfLines={1}>{displayName}</Text>
            <Text style={s.profileEmail} numberOfLines={1}>{user?.email || 'Signed in'}</Text>
          </View>
        </View>

        <Section title="Appearance" colors={colors}>
          <View style={s.themeGrid}>
            {themeLabels.map(item => {
              const active = theme === item.value;
              return (
                <TouchableOpacity key={item.value} activeOpacity={0.82} onPress={() => setTheme(item.value)}
                  style={[s.themeCard, active && s.themeCardActive]}>
                  <View style={[s.swatch, item.value === 'light' && s.swatchLight, item.value === 'brown' && s.swatchBrown]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[s.themeName, active && s.themeNameActive]}>{item.label}</Text>
                    <Text style={s.themeDetail}>{item.detail}</Text>
                  </View>
                  <View style={[s.radio, active && s.radioActive]} />
                </TouchableOpacity>
              );
            })}
          </View>
        </Section>

        <Section title="Payment" colors={colors}>
          <TouchableOpacity activeOpacity={0.82} style={s.actionRow} onPress={() => router.push('/billing')}>
            <View>
              <Text style={s.rowLabel}>Plans and subscription</Text>
              <Text style={s.rowSub}>Paystack checkout, renewals, and invoices</Text>
            </View>
            <Text style={s.rowValue}>Open</Text>
          </TouchableOpacity>
        </Section>

        <Section title="Usage" colors={colors}>
          <View style={s.actionRow}>
            <View>
              <Text style={s.rowLabel}>AI allowance</Text>
              <Text style={s.rowSub}>
                {usage?.ai_token_limit ? `${usage.ai_token_limit.toLocaleString()} tokens on current plan` : 'No active paid plan'}
              </Text>
            </View>
            <Text style={s.rowValue}>{usage?.total_ai_interactions ?? 0} uses</Text>
          </View>
          {!usage?.token_metering_enabled && (
            <Text style={s.note}>Token remaining values will appear after provider-level usage metering is enabled.</Text>
          )}
        </Section>

        <Section title="Notifications" colors={colors}>
          <View style={s.actionRow}>
            <View>
              <Text style={s.rowLabel}>Mobile reminders</Text>
              <Text style={s.rowSub}>Study plan reminders on this device</Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: colors.border, true: colors.green + '70' }}
              thumbColor={notifications ? colors.green : colors.muted}
            />
          </View>
        </Section>

        <Section title="Email Confirmation" colors={colors}>
          <View style={s.actionRow}>
            <View>
              <Text style={s.rowLabel}>{user?.email_confirmed_at ? 'Email confirmed' : 'Confirmation required'}</Text>
              <Text style={s.rowSub}>{user?.email}</Text>
            </View>
            <Text style={[s.rowValue, { color: user?.email_confirmed_at ? colors.green : colors.yellow }]}>
              {user?.email_confirmed_at ? 'Verified' : 'Pending'}
            </Text>
          </View>
        </Section>

        <Section title="Security" colors={colors}>
          <TouchableOpacity activeOpacity={0.82} style={s.actionRow} onPress={resetPassword}>
            <View>
              <Text style={s.rowLabel}>Reset password</Text>
              <Text style={s.rowSub}>Send a reset link to your email</Text>
            </View>
            <Text style={s.rowValue}>Send</Text>
          </TouchableOpacity>
          <View style={[s.actionRow, s.dangerRow]}>
            <View>
              <Text style={[s.rowLabel, { color: colors.red }]}>Delete or deactivate account</Text>
              <Text style={s.rowSub}>Admin review required before account removal</Text>
            </View>
            <Text style={s.rowValue}>Locked</Text>
          </View>
        </Section>

        <Section title="Authentication" colors={colors}>
          <TouchableOpacity style={s.signOutBtn} onPress={handleSignOut}>
            <Text style={s.signOutText}>Sign out</Text>
          </TouchableOpacity>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, colors, children }: { title: string; colors: any; children: React.ReactNode }) {
  const s = styles(colors);
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = (colors: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: 150, gap: spacing.lg },
  header: { gap: 4 },
  eyebrow: { color: colors.muted, fontSize: typography.xs, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  title: { color: colors.foreground, fontSize: 28, fontWeight: '900', letterSpacing: -0.2 },
  sub: { color: colors.muted, fontSize: typography.sm, lineHeight: 20 },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.xl, padding: spacing.md },
  avatar: { width: 54, height: 54, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  avatarText: { color: colors.onPrimary, fontSize: typography.base, fontWeight: '900' },
  profileName: { color: colors.foreground, fontSize: typography.base, fontWeight: '900' },
  profileEmail: { color: colors.muted, fontSize: typography.xs, marginTop: 2 },
  section: { gap: 12 },
  sectionTitle: { color: colors.foreground, fontSize: typography.base, fontWeight: '900' },
  themeGrid: { gap: 10 },
  themeCard: { minHeight: 82, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: spacing.md, gap: 12, flexDirection: 'row', alignItems: 'center' },
  themeCardActive: { borderColor: colors.primary, backgroundColor: colors.surfaceElevated },
  swatch: { width: 34, height: 34, borderRadius: 16, backgroundColor: '#0a0a0a', borderWidth: 1, borderColor: colors.border },
  swatchLight: { backgroundColor: '#f3f4f6' },
  swatchBrown: { backgroundColor: '#18140f' },
  themeName: { color: colors.foreground, fontSize: typography.sm, fontWeight: '900' },
  themeNameActive: { color: colors.primary },
  themeDetail: { color: colors.muted, fontSize: typography.xs, marginTop: 2 },
  radio: { width: 22, height: 8, borderRadius: 99, backgroundColor: colors.border },
  radioActive: { backgroundColor: colors.primary },
  actionRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.xl, padding: spacing.md },
  dangerRow: { borderColor: colors.red + '35', backgroundColor: colors.red + '10' },
  rowLabel: { color: colors.foreground, fontSize: typography.sm, fontWeight: '900' },
  rowSub: { color: colors.muted, fontSize: typography.xs, marginTop: 4, maxWidth: 230 },
  rowValue: { color: colors.foreground, fontSize: typography.xs, fontWeight: '900' },
  note: { color: colors.muted, fontSize: typography.xs, lineHeight: 18, paddingHorizontal: 2 },
  signOutBtn: { height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full, borderWidth: 1, borderColor: colors.red + '45', backgroundColor: colors.red + '12' },
  signOutText: { color: colors.red, fontSize: typography.sm, fontWeight: '900' },
});
