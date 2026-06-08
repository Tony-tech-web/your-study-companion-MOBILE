import { useEffect, useRef, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import { useRouter, useSegments } from 'expo-router';
import { Animated, Easing, Linking, StyleSheet } from 'react-native';
import { handleDeepLink } from '../src/lib/supabase';

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootLayoutNav() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [showSplashIntro, setShowSplashIntro] = useState(true);
  const splashStarted = useRef(false);
  const splashScale = useRef(new Animated.Value(1)).current;
  const splashOpacity = useRef(new Animated.Value(1)).current;

  // Handle deep links for OAuth (Android requires manual handling)
  useEffect(() => {
    // Handle app opened from a deep link
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });

    // Handle deep links while app is open
    const sub = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (loading) return;
    SplashScreen.hideAsync().catch(() => {});

    if (!splashStarted.current) {
      splashStarted.current = true;
      Animated.sequence([
        Animated.delay(160),
        Animated.parallel([
          Animated.timing(splashScale, {
            toValue: 26,
            duration: 620,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(splashOpacity, {
            toValue: 0,
            duration: 620,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => setShowSplashIntro(false));
    }

    const inAuthGroup = segments[0] === 'auth';
    if (!session && !inAuthGroup) {
      router.replace('/auth/login');
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [session, loading, segments, router, splashOpacity, splashScale]);

  return (
    <>
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="auth" />
        <Stack.Screen name="(tabs)" />
      </Stack>
      {showSplashIntro && (
        <Animated.View pointerEvents="none" style={[splashStyles.overlay, { opacity: splashOpacity }]}>
          <Animated.Text style={[splashStyles.mark, { transform: [{ scale: splashScale }] }]}>S</Animated.Text>
        </Animated.View>
      )}
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <RootLayoutNav />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const splashStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0a0a0a',
    elevation: 1000,
    zIndex: 1000,
  },
  mark: {
    color: '#ffffff',
    fontSize: 84,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 96,
  },
});
