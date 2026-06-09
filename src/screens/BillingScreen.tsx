import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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

export default function BillingScreen() {
  const { colors } = useMobileTheme();
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const s = styles(colors);

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
      Alert.alert('Paystack checkout', error?.response?.data?.error || 'Could not start checkout.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <SafeAreaView style={s.root} edges={['top']}>
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
                    <Text style={s.feature}>{plan.ai_token_limit ? `${plan.ai_token_limit.toLocaleString()} AI tokens` : 'Custom AI limit'}</Text>
                    <Text style={s.feature}>Research, chat, planner, and study tools</Text>
                    <Text style={s.feature}>Server verified subscription status</Text>
                  </View>

                  <TouchableOpacity
                    disabled={plan.is_custom || !plan.active || current || busy === plan.slug}
                    activeOpacity={0.82}
                    onPress={() => openCheckout(plan)}
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

const styles = (colors: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: 150, gap: spacing.lg },
  header: { gap: 6 },
  eyebrow: { color: colors.muted, fontSize: typography.xs, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  title: { color: colors.foreground, fontSize: 30, fontWeight: '900' },
  sub: { color: colors.muted, fontSize: typography.sm, lineHeight: 20 },
  currentCard: { borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: spacing.md },
  currentLabel: { color: colors.muted, fontSize: typography.xs, fontWeight: '900', textTransform: 'uppercase' },
  currentName: { color: colors.foreground, fontSize: typography.lg, fontWeight: '900', marginTop: 4 },
  loader: { borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: spacing.xl },
  planList: { gap: spacing.md },
  planCard: { minHeight: 340, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: spacing.lg },
  planCardFeatured: { borderColor: colors.blue, backgroundColor: colors.blue + '18' },
  planTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  planName: { color: colors.foreground, fontSize: typography.xl, fontWeight: '900' },
  planDescription: { color: colors.muted, fontSize: typography.sm, lineHeight: 19, marginTop: 6 },
  badge: { color: colors.blue, borderColor: colors.blue + '55', borderWidth: 1, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 5, fontSize: typography.xs, fontWeight: '900' },
  price: { color: colors.foreground, fontSize: 34, fontWeight: '900', marginTop: spacing.xl },
  interval: { color: colors.muted, fontSize: typography.xs, fontWeight: '800', marginTop: 3 },
  features: { gap: 10, marginTop: spacing.lg },
  feature: { color: colors.muted, fontSize: typography.sm, fontWeight: '700' },
  action: { marginTop: 'auto', height: 52, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.input },
  actionFeatured: { backgroundColor: colors.primary, borderColor: colors.primary },
  actionDisabled: { opacity: 0.6 },
  actionText: { color: colors.foreground, fontSize: typography.sm, fontWeight: '900' },
  actionTextFeatured: { color: colors.onPrimary },
});
