import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Platform } from 'react-native';
import * as Linking from 'expo-linking';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // We handle this manually via deep links
  },
});

// Keep session alive when app comes to foreground
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});

// Handle deep link OAuth callbacks (Android + iOS)
// Called from app/_layout.tsx on url events
export function handleDeepLink(url: string) {
  if (!url) return;
  // Supabase appends #access_token=... or ?code=... to the redirect URL
  if (url.includes('access_token') || url.includes('refresh_token') || url.includes('code=')) {
    supabase.auth.getSessionFromUrl({ url } as any).catch(() => {});
  }
}

export async function callEdgeFunction(
  name: string,
  body: Record<string, unknown>
): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('No active session. Please sign in.');

  return fetch(`${supabaseUrl}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'apikey': supabaseAnonKey,
    },
    body: JSON.stringify(body),
  });
}

export async function getStorageUrl(bucket: string, path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) throw new Error(error?.message || 'Failed to get URL');
  return data.signedUrl;
}

export async function updateXP(activityType: string, incrementValue = 1) {
  try {
    await callEdgeFunction('update-user-stats', { activityType, incrementValue });
  } catch (e) {
    console.error('XP update failed:', e);
  }
}
