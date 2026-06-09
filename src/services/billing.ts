import api from './api';

export type BillingPlan = {
  id: string;
  slug: string;
  name: string;
  description?: string;
  amount: number;
  currency: string;
  interval: 'two_weeks' | 'monthly' | 'yearly' | 'custom';
  ai_token_limit?: number;
  provider_limits?: Record<string, number | string>;
  is_custom: boolean;
  active: boolean;
};

export const getBillingPlans = async () => {
  const response = await api.get('/api/billing/plans');
  return (response.data as { plans: BillingPlan[] }).plans;
};

export const getBillingStatus = async () => {
  const response = await api.get('/api/billing/status');
  return response.data;
};

export const getBillingUsage = async () => {
  const response = await api.get('/api/billing/usage');
  return response.data;
};

export const startBillingCheckout = async (planSlug: string, callbackUrl: string) => {
  const response = await api.post('/api/billing/checkout', { planSlug, callbackUrl });
  return response.data as { authorizationUrl: string; accessCode: string; reference: string };
};
