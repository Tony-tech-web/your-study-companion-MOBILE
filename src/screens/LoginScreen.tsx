import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../lib/supabase';
import { radius, spacing, typography } from '../lib/theme';
import { useMobileTheme } from '../contexts/ThemeContext';

WebBrowser.maybeCompleteAuthSession();

const GoogleMark = () => (
  <View style={{ flexDirection: 'row', width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
    <Text style={{ color: '#4285F4', fontSize: 13, fontWeight: '900' }}>G</Text>
  </View>
);

export default function LoginScreen() {
  const { colors } = useMobileTheme();
  const s = useMemo(() => styles(colors), [colors]);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [matricNumber, setMatricNumber] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const resetMode = (next: 'login' | 'signup') => {
    setMode(next);
    setMessage(null);
  };

  const handleAuth = async () => {
    if (!email.trim() || !password) {
      setMessage({ type: 'error', text: 'Enter your email address and password.' });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      } else {
        if (!fullName.trim() || !username.trim()) {
          setMessage({ type: 'error', text: 'Full name and username are required.' });
          setLoading(false);
          return;
        }
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: Linking.createURL('auth-callback'),
            data: {
              full_name: fullName.trim(),
              username: username.trim(),
              matric_number: matricNumber.trim(),
            },
          },
        });
        if (error) throw error;
        setMode('login');
        setPassword('');
        setMessage({ type: 'success', text: 'Account created. Confirm your email, then sign in.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Authentication failed. Check your details and try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    setMessage(null);
    try {
      const redirectTo = Linking.createURL('auth-callback');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error) throw error;
      if (!data.url) throw new Error('Google sign-in URL was not returned.');

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type === 'success' && result.url) {
        const hash = result.url.split('#')[1] || result.url.split('?')[1] || '';
        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        if (accessToken && refreshToken) {
          await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        }
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Google sign-in failed.' });
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={s.card}>
            <View style={s.brandRow}>
              <View style={s.logoMark}><Text style={s.logoText}>O</Text></View>
              <Text style={s.appName}>Orbit</Text>
            </View>

            <View style={s.heading}>
              <Text style={s.title}>{mode === 'login' ? 'Sign in' : 'Create account'}</Text>
              <Text style={s.switchText}>
                {mode === 'login' ? 'New user?' : 'Already have an account?'}{' '}
                <Text style={s.switchLink} onPress={() => resetMode(mode === 'login' ? 'signup' : 'login')}>
                  {mode === 'login' ? 'Create an account' : 'Sign in'}
                </Text>
              </Text>
            </View>

            {message && (
              <View style={[s.banner, message.type === 'success' ? s.bannerSuccess : s.bannerError]}>
                <Text style={[s.bannerText, message.type === 'success' ? s.successText : s.errorText]}>{message.text}</Text>
              </View>
            )}

            {mode === 'signup' && (
              <>
                <Input label="Full Name" value={fullName} onChangeText={setFullName} placeholder="Your full name" colors={colors} />
                <View style={s.twoCol}>
                  <Input label="Username" value={username} onChangeText={setUsername} placeholder="username" colors={colors} compact />
                  <Input label="Matric No." value={matricNumber} onChangeText={setMatricNumber} placeholder="EUI/..." colors={colors} compact />
                </View>
              </>
            )}

            <Input label="Email Address" value={email} onChangeText={setEmail} placeholder="you@elizadeuniversity.edu.ng" colors={colors} keyboardType="email-address" autoCapitalize="none" />

            <View style={{ gap: 6 }}>
              <Text style={s.fieldLabel}>Password</Text>
              <View style={s.passwordRow}>
                <TextInput
                  style={s.passwordInput}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Min. 6 characters"
                  placeholderTextColor={colors.tertiary}
                  secureTextEntry={!showPass}
                  onSubmitEditing={handleAuth}
                />
                <TouchableOpacity onPress={() => setShowPass(v => !v)} style={s.passwordToggle}>
                  <Text style={s.passwordToggleText}>{showPass ? 'Hide' : 'Show'}</Text>
                </TouchableOpacity>
              </View>
              {mode === 'login' && <Text style={s.forgotText}>Forgot password?</Text>}
            </View>

            <TouchableOpacity style={[s.primaryBtn, loading && { opacity: 0.62 }]} onPress={handleAuth} disabled={loading}>
              {loading ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={s.primaryBtnText}>{mode === 'login' ? 'Login' : 'Create Account'}</Text>}
            </TouchableOpacity>

            <View style={s.dividerRow}>
              <View style={s.divider} />
              <Text style={s.dividerText}>or</Text>
              <View style={s.divider} />
            </View>

            <Text style={s.socialLabel}>Join With Your Favorite Social Media Account</Text>
            <View style={s.socialRow}>
              <TouchableOpacity style={s.socialBtn} onPress={handleGoogle} disabled={googleLoading}>
                {googleLoading ? <ActivityIndicator color={colors.foreground} size="small" /> : <GoogleMark />}
              </TouchableOpacity>
              <View style={s.socialBtn}><Text style={s.socialIcon}>f</Text></View>
              <View style={s.socialBtn}><Text style={s.socialIcon}>x</Text></View>
              <View style={s.socialBtn}><Text style={s.socialIcon}>a</Text></View>
            </View>

            <Text style={s.terms}>
              By signing in, you agree to our{' '}
              <Text style={s.termsLink}>Terms of Service</Text> and{' '}
              <Text style={s.termsLink}>Privacy Policy</Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const Input = ({ label, colors, compact, ...props }: any) => {
  const s = styles(colors);
  return (
    <View style={[{ gap: 6 }, compact && { flex: 1 }]}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        {...props}
        style={s.input}
        placeholderTextColor={colors.tertiary}
      />
    </View>
  );
};

const styles = (colors: any) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, paddingVertical: spacing.xl },
  card: { width: '100%', maxWidth: 390, borderRadius: 28, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, paddingHorizontal: 24, paddingVertical: 26, gap: 16 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 8 },
  logoMark: { width: 34, height: 34, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  logoText: { color: colors.onPrimary, fontSize: 16, fontWeight: '900' },
  appName: { color: colors.foreground, fontSize: typography.base, fontWeight: '900' },
  heading: { gap: 4, marginBottom: 2 },
  title: { color: colors.foreground, fontSize: 24, fontWeight: '900', letterSpacing: -0.2 },
  switchText: { color: colors.muted, fontSize: typography.sm, fontWeight: '600' },
  switchLink: { color: colors.foreground, fontWeight: '900' },
  banner: { borderRadius: 16, borderWidth: 1, padding: spacing.sm },
  bannerError: { backgroundColor: colors.red + '16', borderColor: colors.red + '35' },
  bannerSuccess: { backgroundColor: colors.green + '16', borderColor: colors.green + '35' },
  bannerText: { fontSize: typography.xs, lineHeight: 18, fontWeight: '700' },
  errorText: { color: colors.red },
  successText: { color: colors.green },
  twoCol: { flexDirection: 'row', gap: 10 },
  fieldLabel: { color: colors.muted, fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.7 },
  input: { height: 48, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.input, color: colors.foreground, paddingHorizontal: 16, fontSize: typography.sm, fontWeight: '700' },
  passwordRow: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.input, height: 48, paddingLeft: 16 },
  passwordInput: { flex: 1, color: colors.foreground, fontSize: typography.sm, fontWeight: '700' },
  passwordToggle: { height: 48, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  passwordToggleText: { color: colors.muted, fontSize: typography.xs, fontWeight: '900' },
  forgotText: { alignSelf: 'flex-end', color: colors.muted, fontSize: typography.xs, fontWeight: '900' },
  primaryBtn: { height: 48, borderRadius: radius.full, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  primaryBtnText: { color: colors.onPrimary, fontSize: typography.sm, fontWeight: '900' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  divider: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  dividerText: { color: colors.muted, fontSize: typography.xs, fontWeight: '800' },
  socialLabel: { color: colors.muted, textAlign: 'center', fontSize: 10, fontWeight: '700' },
  socialRow: { flexDirection: 'row', justifyContent: 'center', gap: 12 },
  socialBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.input, borderWidth: 1, borderColor: colors.border },
  socialIcon: { color: colors.foreground, fontSize: typography.sm, fontWeight: '900' },
  terms: { color: colors.muted, fontSize: 10, textAlign: 'center', lineHeight: 16, marginTop: 2 },
  termsLink: { color: colors.foreground, fontWeight: '800', textDecorationLine: 'underline' },
});
