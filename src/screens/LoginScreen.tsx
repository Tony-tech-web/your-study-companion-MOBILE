import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import { supabase } from '../lib/supabase';
import { colors, spacing, radius, typography } from '../lib/theme';

const ErrorBanner = ({ msg }: { msg: string }) => msg ? (
  <View style={eb.wrap}><Text style={eb.text}>{msg}</Text></View>
) : null;
const eb = StyleSheet.create({
  wrap: { backgroundColor: colors.red + '18', borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.red + '30', marginBottom: spacing.md },
  text: { color: colors.red, fontSize: typography.xs, lineHeight: 18 },
});

export default function LoginScreen() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleAuth = async () => {
    if (!email || !password) { setError('Please enter your email and password'); return; }
    setLoading(true); setError(''); setSuccess('');
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      } else {
        if (!fullName.trim()) { setError('Please enter your full name'); setLoading(false); return; }
        const { error } = await supabase.auth.signUp({
          email: email.trim(), password,
          options: {
            emailRedirectTo: Linking.createURL('auth-callback'),
            data: { full_name: fullName.trim() },
          },
        });
        if (error) throw error;
        setSuccess('Account created! Check your email for a confirmation link, then sign in.');
        setMode('login'); setPassword('');
      }
    } catch (err: any) {
      // Log full error for debugging
      console.error('Auth error:', JSON.stringify(err));
      setError(err.message || err.error_description || 'Authentication failed. Check your credentials and network.');
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Logo */}
          <View style={s.logoWrap}>
            <View style={s.logoRing}>
              <View style={s.logoInner}><Text style={s.logoText}>O</Text></View>
            </View>
            <Text style={s.appName}>Orbit</Text>
            <Text style={s.tagline}>Your AI-powered academic edge</Text>
          </View>

          {/* Mode toggle */}
          <View style={s.modeToggle}>
            {(['login', 'signup'] as const).map(m => (
              <TouchableOpacity key={m} style={[s.modeBtn, mode === m && s.modeBtnActive]}
                onPress={() => { setMode(m); setError(''); setSuccess(''); }}>
                <Text style={[s.modeBtnText, mode === m && s.modeBtnTextActive]}>
                  {m === 'login' ? 'Sign In' : 'Create Account'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={s.card}>
            {/* Success */}
            {success ? (
              <View style={s.successBanner}><Text style={s.successText}>{success}</Text></View>
            ) : null}

            <ErrorBanner msg={error} />

            {mode === 'signup' && (
              <View style={s.field}>
                <Text style={s.fieldLabel}>Full Name</Text>
                <TextInput style={s.input} value={fullName} onChangeText={setFullName}
                  placeholder="Your full name" placeholderTextColor={colors.muted}
                  autoCapitalize="words" />
              </View>
            )}

            <View style={s.field}>
              <Text style={s.fieldLabel}>Email Address</Text>
              <TextInput style={s.input} value={email} onChangeText={setEmail}
                placeholder="you@elizadeuniversity.edu.ng" placeholderTextColor={colors.muted}
                autoCapitalize="none" keyboardType="email-address" />
            </View>

            <View style={s.field}>
              <Text style={s.fieldLabel}>Password</Text>
              <View style={s.pwRow}>
                <TextInput style={[s.input, { flex: 1 }]} value={password} onChangeText={setPassword}
                  placeholder="Min. 6 characters" placeholderTextColor={colors.muted}
                  secureTextEntry={!showPass} onSubmitEditing={handleAuth} />
                <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPass(v => !v)}>
                  <Text style={s.eyeText}>{showPass ? 'Hide' : 'Show'}</Text>
                </TouchableOpacity>
              </View>
              {mode === 'login' && (
                <TouchableOpacity style={{ alignSelf: 'flex-end', marginTop: 4 }}>
                  <Text style={s.forgotText}>Forgot password?</Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity style={[s.primaryBtn, loading && { opacity: 0.6 }]} onPress={handleAuth} disabled={loading}>
              {loading ? <ActivityIndicator color={colors.onPrimary} /> : (
                <Text style={s.primaryBtnText}>{mode === 'login' ? 'Login' : 'Create Account'}</Text>
              )}
            </TouchableOpacity>
          </View>

          <Text style={s.terms}>
            By signing in, you agree to Orbit's{' '}
            <Text style={s.termsLink}>Terms of Service</Text> and{' '}
            <Text style={s.termsLink}>Privacy Policy</Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xxl },
  logoWrap: { alignItems: 'center', marginBottom: spacing.xl },
  logoRing: { width: 88, height: 88, borderRadius: 44, borderWidth: 2, borderColor: colors.primary + '40', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  logoInner: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  logoText: { color: colors.onPrimary, fontSize: typography['2xl'], fontWeight: '900' },
  appName: { color: colors.foreground, fontSize: typography.xl, fontWeight: '800', letterSpacing: -0.5 },
  tagline: { color: colors.muted, fontSize: typography.sm, marginTop: 4 },
  modeToggle: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: radius.xl, padding: 4, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg },
  modeBtn: { flex: 1, paddingVertical: 10, borderRadius: radius.lg, alignItems: 'center' },
  modeBtnActive: { backgroundColor: colors.primary },
  modeBtnText: { color: colors.muted, fontSize: typography.sm, fontWeight: '600' },
  modeBtnTextActive: { color: colors.onPrimary },
  card: { backgroundColor: colors.card, borderRadius: radius.xl, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, gap: spacing.md, marginBottom: spacing.md },
  successBanner: { backgroundColor: colors.green + '18', borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.green + '30' },
  successText: { color: colors.green, fontSize: typography.xs, lineHeight: 18 },
  field: { gap: 6 },
  fieldLabel: { color: colors.muted, fontSize: typography.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, height: 48, color: colors.foreground, fontSize: typography.base },
  pwRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  eyeBtn: { paddingHorizontal: spacing.sm, paddingVertical: 12 },
  eyeText: { color: colors.primary, fontSize: typography.xs, fontWeight: '600' },
  forgotText: { color: colors.primary, fontSize: typography.xs, fontWeight: '600' },
  primaryBtn: { backgroundColor: colors.primary, borderRadius: radius.lg, height: 52, alignItems: 'center', justifyContent: 'center', marginTop: spacing.xs },
  primaryBtnText: { color: colors.onPrimary, fontSize: typography.base, fontWeight: '800' },
  terms: { color: colors.muted, fontSize: typography.xs, textAlign: 'center', marginTop: spacing.lg, lineHeight: 18 },
  termsLink: { color: colors.foreground, fontWeight: '600', textDecorationLine: 'underline' },
});
