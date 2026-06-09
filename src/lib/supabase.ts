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

export const isInvalidRefreshToken = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error || '');
  const lower = message.toLowerCase();
  return lower.includes('invalid refresh token') || lower.includes('refresh token not found');
};

export const getCurrentSession = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  } catch (error) {
    if (isInvalidRefreshToken(error)) {
      await supabase.auth.signOut({ scope: 'local' }).catch(() => null);
      return null;
    }
    throw error;
  }
};

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
export async function handleDeepLink(url: string) {
  if (!url) return;
  try {
    let params: Record<string, string> = {};
    const hashIndex = url.indexOf('#');
    const queryIndex = url.indexOf('?');
    
    let searchStr = '';
    if (hashIndex !== -1) {
      searchStr = url.substring(hashIndex + 1);
    } else if (queryIndex !== -1) {
      searchStr = url.substring(queryIndex + 1);
    }
    
    if (searchStr) {
      searchStr.split('&').forEach((pair) => {
        const [key, val] = pair.split('=');
        if (key && val) {
          params[key] = decodeURIComponent(val);
        }
      });
    }
    
    const { access_token, refresh_token, code } = params;
    
    if (code) {
      await supabase.auth.exchangeCodeForSession(code);
    } else if (access_token && refresh_token) {
      await supabase.auth.setSession({
        access_token,
        refresh_token,
      });
    }
  } catch (e) {
    console.error('Error handling deep link:', e);
  }
}

export async function callEdgeFunction(
  name: string,
  body: Record<string, unknown>
): Promise<Response> {
  const session = await getCurrentSession();
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
