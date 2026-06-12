import 'react-native-url-polyfill/auto';
import { createClient, Session } from '@supabase/supabase-js';
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

const projectRef = (() => {
  try {
    return new URL(supabaseUrl).hostname.split('.')[0];
  } catch {
    return '';
  }
})();

export const isInvalidRefreshToken = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error || '');
  const lower = message.toLowerCase();
  return lower.includes('invalid refresh token') || lower.includes('refresh token not found');
};

export const setRealtimeAuthFromSession = (session: Session | null) => {
  if (!session?.access_token) return;
  try {
    supabase.realtime.setAuth(session.access_token);
  } catch (error) {
    console.warn('Realtime auth sync failed:', error);
  }
};

export const clearStoredAuthSession = async () => {
  await supabase.auth.signOut({ scope: 'local' }).catch(() => null);
  const keys = await AsyncStorage.getAllKeys().catch(() => []);
  const authKeys = keys.filter((key) =>
    key === `sb-${projectRef}-auth-token` ||
    key.includes('supabase.auth.token') ||
    /^sb-.+-auth-token$/.test(key)
  );
  if (authKeys.length) {
    await AsyncStorage.multiRemove(authKeys).catch(() => null);
  }
};

export const getCurrentSession = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    setRealtimeAuthFromSession(session);
    return session;
  } catch (error) {
    if (isInvalidRefreshToken(error)) {
      await clearStoredAuthSession();
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
          params[decodeURIComponent(key)] = decodeURIComponent(val.replace(/\+/g, ' '));
        }
      });
    }

    const parsed = Linking.parse(url);
    Object.entries(parsed.queryParams || {}).forEach(([key, value]) => {
      if (typeof value === 'string') params[key] = value;
      if (Array.isArray(value) && typeof value[0] === 'string') params[key] = value[0];
    });
    
    const { access_token, refresh_token, code, error, error_description } = params;
    if (error || error_description) {
      throw new Error(error_description || error);
    }
    
    if (code) {
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) throw exchangeError;
      setRealtimeAuthFromSession(data.session);
    } else if (access_token && refresh_token) {
      const { data, error: sessionError } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });
      if (sessionError) throw sessionError;
      setRealtimeAuthFromSession(data.session);
    }
  } catch (e) {
    if (isInvalidRefreshToken(e)) {
      await clearStoredAuthSession();
      return;
    }
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
