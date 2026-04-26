import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { colors, spacing, radius, typography } from '../lib/theme';

// ─── Social button icon (text-based, no image deps) ───────────────────────────
const SOCIAL = [
  { key: 'google',   label: 'G',  bg: '#fff',    border: '#e5e5e5', color: '#4285F4', bold: true },
  { key: 'facebook', label: 'f',  bg: '#1877F2', border: '#1877F2', color: '#fff',    bold: true },
  { key: 'x',        label: '𝕏',  bg: '#000',    border: '#000',    color: '#fff',    bold: false },
  { key: 'apple',    label: '',   bg: '#000',    border: '#000',    color: '#fff',    bold: false },
];

export default function LoginScreen() {
  const [mode, setMode]         = useState<'login' | 'signup'>('login');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
        if (error) throw error;
      } else {
        if (!fullName.trim()) {
          Alert.alert('Missing field', 'Please enter your full name.');
          setLoading(false);
          return;
        }
        const { error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: { data: { full_name: fullName.trim() } },
        });
        if (error) throw error;
        Alert.alert(
          'Check your email',
          'We sent you a confirmation link.',
          [{ text: 'OK', onPress: () => setMode('login') }],
        );
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'android' ? 24 : 0}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* ── Logo ── */}
          <View style={s.logoWrap}>
            <View style={s.logoRing}>
              <View style={s.logoInner}>
                <Text style={s.logoText}>SC</Text>
              </View>
            </View>
            <Text style={s.appName}>Study Companion</Text>
            <Text style={s.appTagline}>Your AI-powered academic edge</Text>
          </View>

          {/* ── Card ── */}
          <View style={s.card}>
            <Text style={s.cardTitle}>{mode === 'login' ? 'Sign in' : 'Create account'}</Text>
            <Text style={s.cardSub}>
              {mode === 'login' ? 'New user? ' : 'Already have an account? '}
              <Text style={s.cardSubLink} onPress={() => setMode(mode === 'login' ? 'signup' : 'login')}>
                {mode === 'login' ? 'Create an account' : 'Sign in'}
              </Text>
            </Text>

            {/* Full name (signup only) */}
            {mode === 'signup' && (
              <View style={s.inputWrap}>
                <Text style={s.inputIcon}>👤</Text>
                <TextInput
                  style={s.input}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Full Name"
                  placeholderTextColor={colors.muted}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              </View>
            )}

            {/* Email */}
            <View style={s.inputWrap}>
              <Text style={s.inputIcon}>✉</Text>
              <TextInput
                style={s.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Email Address"
                placeholderTextColor={colors.muted}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
                returnKeyType="next"
                textContentType="emailAddress"
              />
            </View>

            {/* Password */}
            <View style={s.inputWrap}>
              <Text style={s.inputIcon}>🔒</Text>
              <TextInput
                style={[s.input, { flex: 1 }]}
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                placeholderTextColor={colors.muted}
                secureTextEntry={!showPass}
                returnKeyType="done"
                onSubmitEditing={handleAuth}
                textContentType={mode === 'login' ? 'password' : 'newPassword'}
              />
              <TouchableOpacity onPress={() => setShowPass(v => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={s.eyeIcon}>{showPass ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>

            {/* Forgot password */}
            {mode === 'login' && (
              <TouchableOpacity style={{ alignSelf: 'flex-start' }}>
                <Text style={s.forgotText}>Forgot password?</Text>
              </TouchableOpacity>
            )}

            {/* Login / Create button */}
            <TouchableOpacity
              style={[s.primaryBtn, loading && { opacity: 0.6 }]}
              onPress={handleAuth}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.primaryBtnText}>{mode === 'login' ? 'Login' : 'Create Account'}</Text>
              }
            </TouchableOpacity>

            {/* Divider */}
            <View style={s.divider}>
              <View style={s.dividerLine} />
              <Text style={s.dividerText}>or</Text>
              <View style={s.dividerLine} />
            </View>

            {/* Social label */}
            <Text style={s.socialLabel}>Join With Your Favourite Social Media Account</Text>

            {/* Social icons row */}
            <View style={s.socialRow}>
              {SOCIAL.map(item => (
                <TouchableOpacity
                  key={item.key}
                  style={[s.socialBtn, { backgroundColor: item.bg, borderColor: item.border }]}
                  onPress={() => Alert.alert('Coming Soon', 'Social login coming soon')}
                  activeOpacity={0.75}
                >
                  <Text style={[
                    s.socialBtnText,
                    { color: item.color, fontWeight: item.bold ? '700' : '400' },
                  ]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Terms */}
          <Text style={s.terms}>
            By signing in with an account, you agree to SO's{'\n'}
            <Text style={s.termsLink}>Terms of Service</Text>
            {' '}and{' '}
            <Text style={s.termsLink}>Privacy Policy</Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },

  // Logo
  logoWrap: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  logoRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: colors.primary + '50',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  logoInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: '#fff',
    fontSize: typography['2xl'],
    fontWeight: '900',
  },
  appName: {
    color: colors.foreground,
    fontSize: typography.xl,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  appTagline: {
    color: colors.muted,
    fontSize: typography.sm,
    marginTop: 2,
  },

  // Card
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  cardTitle: {
    color: colors.foreground,
    fontSize: typography['2xl'],
    fontWeight: '800',
    marginBottom: 2,
  },
  cardSub: {
    color: colors.muted,
    fontSize: typography.sm,
    marginBottom: spacing.xs,
  },
  cardSubLink: {
    color: colors.foreground,
    fontWeight: '700',
  },

  // Inputs
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 52,
  },
  inputIcon: {
    fontSize: 15,
    marginRight: spacing.sm,
    opacity: 0.7,
  },
  eyeIcon: {
    fontSize: 15,
    marginLeft: spacing.sm,
  },
  input: {
    flex: 1,
    color: colors.foreground,
    fontSize: typography.base,
  },
  forgotText: {
    color: colors.primary,
    fontSize: typography.xs,
    fontWeight: '600',
    marginTop: -4,
  },

  // Button
  primaryBtn: {
    backgroundColor: colors.foreground,
    borderRadius: radius.full,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  primaryBtnText: {
    color: colors.background,
    fontSize: typography.base,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginVertical: spacing.xs,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.muted,
    fontSize: typography.xs,
  },

  // Social
  socialLabel: {
    color: colors.muted,
    fontSize: typography.xs,
    textAlign: 'center',
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
  },
  socialBtn: {
    width: 52,
    height: 52,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialBtnText: {
    fontSize: 18,
  },

  // Terms
  terms: {
    color: colors.muted,
    fontSize: typography.xs,
    textAlign: 'center',
    marginTop: spacing.lg,
    lineHeight: 18,
  },
  termsLink: {
    color: colors.foreground,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
