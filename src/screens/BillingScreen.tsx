import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { radius, spacing, typography } from '../lib/theme';
import { useMobileTheme } from '../contexts/ThemeContext';
import { BillingPlan, getBillingPlans, getBillingStatus, startBillingCheckout } from '../services/billing';

const formatNaira = (kobo: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(kobo / 100);

const intervalLabel: Record<string, string> = {
  two_weeks: '2 weeks',
  monthly: 'monthly',
  yearly: 'yearly',
  custom: 'coming soon',
};

const checkoutError = (error: any) =>
  error?.response?.data?.error ||
  error?.response?.data?.message ||
  error?.message ||
  'Could not start checkout.';

const getBreakdown = (plan: BillingPlan) => {
  const limits = (plan.provider_limits || {}) as any;
  const marginRate = Number(limits.owner_margin_rate || 0.15);
  const base = Math.round(plan.amount / (1 + marginRate));
  return {
    limits,
    providers: limits.providers || {},
    estimate: limits.estimate,
    marginRate,
    base,
    margin: Math.max(0, plan.amount - base),
    total: plan.amount,
  };
};

export default function BillingScreen() {
  const { colors, theme } = useMobileTheme();
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<BillingPlan | null>(null);
  const s = styles(colors, theme);

  useEffect(() => {
    Promise.all([getBillingPlans(), getBillingStatus()])
      .then(([nextPlans, nextStatus]) => {
        setPlans(nextPlans);
        setStatus(nextStatus);
      })
      .catch((error: any) => Alert.alert('Billing unavailable', error?.response?.data?.error || 'Could not load billing.'))
      .finally(() => setLoading(false));
  }, []);

  const openCheckout = async (plan: BillingPlan) => {
    if (plan.is_custom || !plan.active) return;
    setBusy(plan.slug);
    try {
      const result = await startBillingCheckout(plan.slug, 'orbit://billing-return');
      await Linking.openURL(result.authorizationUrl);
    } catch (error: any) {
      Alert.alert('Paystack checkout', checkoutError(error));
    } finally {
      setBusy(null);
      setSelectedPlan(null);
    }
  };

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <Modal transparent animationType="fade" visible={!!selectedPlan} onRequestClose={() => setSelectedPlan(null)}>
        <View style={s.modalBackdrop}>
          {selectedPlan && (() => {
            const breakdown = getBreakdown(selectedPlan);
            return (
              <View style={s.reviewCard}>
                <View style={s.reviewTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.reviewEyebrow}>Review plan</Text>
                    <Text style={s.reviewTitle}>{selectedPlan.name}</Text>
                    <Text style={s.reviewSub}>{selectedPlan.description}</Text>
                  </View>
                  <TouchableOpacity style={s.closeBtn} onPress={() => setSelectedPlan(null)}>
                    <Text style={s.closeText}>X</Text>
                  </TouchableOpacity>
                </View>

                <View style={s.breakdownBox}>
                  <PriceRow colors={colors} label="Plan access" value={formatNaira(breakdown.base)} />
                  <PriceRow colors={colors} label={`Owner margin (${Math.round(breakdown.marginRate * 100)}%)`} value={formatNaira(breakdown.margin)} />
                  <View style={s.divider} />
                  <PriceRow colors={colors} label="Due today" value={formatNaira(breakdown.total)} strong />
                </View>

                <View style={s.reviewGrid}>
                  <View style={s.reviewMetric}>
                    <Text style={s.metricLabel}>AI tokens</Text>
                    <Text style={s.metricValue}>{selectedPlan.ai_token_limit?.toLocaleString?.() || 'Custom'}</Text>
                  </View>
                  <View style={s.reviewMetric}>
                    <Text style={s.metricLabel}>Provider cost</Text>
                    <Text style={s.metricValue}>${breakdown.estimate?.provider_cost_usd ?? '0.00'}</Text>
                  </View>
                </View>

                {Object.keys(breakdown.providers).length > 0 && (
                  <View style={s.providerBox}>
                    <Text style={s.providerTitle}>Provider allocation</Text>
                    {Object.entries(breakdown.providers).map(([provider, config]: any) => (
                      <PriceRow key={provider} colors={colors} label={provider} value={`${Number(config.tokens || 0).toLocaleString()} tokens`} />
                    ))}
                  </View>
                )}

                <TouchableOpacity
                  disabled={busy === selectedPlan.slug}
                  activeOpacity={0.84}
                  style={s.reviewAction}
                  onPress={() => openCheckout(selectedPlan)}
                >
                  {busy === selectedPlan.slug ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={s.reviewActionText}>Continue to Paystack</Text>}
                </TouchableOpacity>
              </View>
            );
          })()}
        </View>
      </Modal>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <Text style={s.eyebrow}>Paystack Billing</Text>
          <Text style={s.title}>Flexible Plans</Text>
          <Text style={s.sub}>Choose an Orbit AI allowance and billing cycle. Activation is verified by the backend.</Text>
        </View>

        {status?.subscription && (
          <View style={s.currentCard}>
            <Text style={s.currentLabel}>Current plan</Text>
            <Text style={s.currentName}>{status.subscription.plan?.name || 'Active subscription'}</Text>
          </View>
        )}

        {loading ? (
          <View style={s.loader}><ActivityIndicator color={colors.foreground} /></View>
        ) : (
          <View style={s.planList}>
            {plans.map(plan => {
              const featured = plan.slug === 'monthly';
              const current = status?.subscription?.plan_id === plan.id;
              return (
                <View key={plan.slug} style={[s.planCard, featured && s.planCardFeatured]}>
                  <View style={s.planTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.planName}>{plan.name}</Text>
                      <Text style={s.planDescription}>{plan.description}</Text>
                    </View>
                    {featured && <Text style={s.badge}>Popular</Text>}
                  </View>

                  <Text style={s.price}>{plan.is_custom ? 'Custom' : formatNaira(plan.amount)}</Text>
                  <Text style={s.interval}>{intervalLabel[plan.interval]}</Text>

                  <View style={s.features}>
                    {[
                      plan.ai_token_limit ? `${plan.ai_token_limit.toLocaleString()} AI tokens` : 'Custom AI limit',
                      'Research, chat, planner, and study tools',
                      'Server verified subscription status',
                    ].map(feature => (
                      <View key={feature} style={s.featureRow}>
                        <View style={s.featureMark}><Text style={s.featureMarkText}>✓</Text></View>
                        <Text style={s.feature}>{feature}</Text>
                      </View>
                    ))}
                  </View>

                  <TouchableOpacity
                    disabled={plan.is_custom || !plan.active || current || busy === plan.slug}
                    activeOpacity={0.82}
                    onPress={() => setSelectedPlan(plan)}
                    style={[s.action, featured && s.actionFeatured, (plan.is_custom || current) && s.actionDisabled]}
                  >
                    {busy === plan.slug ? (
                      <ActivityIndicator color={featured ? colors.onPrimary : colors.foreground} />
                    ) : (
                      <Text style={[s.actionText, featured && s.actionTextFeatured]}>
                        {current ? 'Active plan' : plan.is_custom ? 'Coming soon' : 'Upgrade'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function PriceRow({ colors, label, value, strong }: { colors: any; label: string; value: string; strong?: boolean }) {
  return (
    <View style={priceRowStyles.row}>
      <Text style={[priceRowStyles.label, { color: strong ? colors.foreground : colors.muted, fontWeight: strong ? '900' : '700', textTransform: label.length < 14 ? 'capitalize' : 'none' }]}>{label}</Text>
      <Text style={[priceRowStyles.value, { color: colors.foreground, fontSize: strong ? 16 : 13 }]}>{value}</Text>
    </View>
  );
}

const priceRowStyles = StyleSheet.create({
  row: { minHeight: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  label: { fontSize: 12 },
  value: { fontWeight: '900' },
});

const styles = (colors: any, theme: string) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  modalBackdrop: { flex: 1, justifyContent: 'center', padding: spacing.lg, backgroundColor: 'rgba(0,0,0,0.72)' },
  reviewCard: { borderRadius: 30, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: spacing.lg, gap: spacing.md },
  reviewTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  reviewEyebrow: { color: colors.muted, fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.4 },
  reviewTitle: { color: colors.foreground, fontSize: 25, fontWeight: '900', marginTop: 3 },
  reviewSub: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 4 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.input, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: colors.foreground, fontSize: 22, fontWeight: '700', marginTop: -2 },
  breakdownBox: { borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.input, padding: spacing.md },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
  reviewGrid: { flexDirection: 'row', gap: spacing.sm },
  reviewMetric: { flex: 1, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.input, padding: spacing.md },
  metricLabel: { color: colors.muted, fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  metricValue: { color: colors.foreground, fontSize: 17, fontWeight: '900', marginTop: 4 },
  providerBox: { borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.input, padding: spacing.md },
  providerTitle: { color: colors.muted, fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.xs },
  reviewAction: { height: 52, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  reviewActionText: { color: colors.onPrimary, fontSize: typography.sm, fontWeight: '900' },
  content: { padding: spacing.lg, paddingBottom: 150, gap: spacing.lg },
  header: { gap: 6 },
  eyebrow: { color: colors.muted, fontSize: typography.xs, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  title: { color: colors.foreground, fontSize: 31, fontWeight: '900' },
  sub: { color: colors.muted, fontSize: typography.sm, lineHeight: 20 },
  currentCard: { borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: spacing.md },
  currentLabel: { color: colors.muted, fontSize: typography.xs, fontWeight: '900', textTransform: 'uppercase' },
  currentName: { color: colors.foreground, fontSize: typography.lg, fontWeight: '900', marginTop: 4 },
  loader: { borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: spacing.xl },
  planList: { gap: spacing.md },
  planCard: {
    minHeight: 330,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: theme === 'light' ? 'rgba(255,255,255,0.92)' : colors.card,
    padding: spacing.lg,
  },
  planCardFeatured: {
    borderColor: theme === 'light' ? 'rgba(17,17,17,0.22)' : colors.border,
    backgroundColor: theme === 'light' ? 'rgba(255,255,255,0.96)' : 'rgba(255,255,255,0.08)',
  },
  planTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  planName: { color: colors.foreground, fontSize: typography.xl, fontWeight: '900' },
  planDescription: { color: colors.muted, fontSize: typography.sm, lineHeight: 19, marginTop: 6 },
  badge: { color: colors.blue, borderColor: colors.blue + '55', borderWidth: 1, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 5, fontSize: typography.xs, fontWeight: '900' },
  price: { color: colors.foreground, fontSize: 36, fontWeight: '900', marginTop: spacing.xl },
  interval: { color: colors.muted, fontSize: typography.xs, fontWeight: '800', marginTop: 3 },
  features: { gap: 11, marginTop: spacing.lg },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  featureMark: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.foreground },
  featureMarkText: { color: colors.background, fontSize: 10, fontWeight: '900' },
  feature: { flex: 1, color: colors.muted, fontSize: typography.sm, fontWeight: '700', lineHeight: 18 },
  action: { marginTop: 'auto', height: 52, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.input },
  actionFeatured: { backgroundColor: colors.primary, borderColor: colors.primary },
  actionDisabled: { opacity: 0.6 },
  actionText: { color: colors.foreground, fontSize: typography.sm, fontWeight: '900' },
  actionTextFeatured: { color: colors.onPrimary },
});
