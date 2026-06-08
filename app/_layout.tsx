import { useEffect, useRef, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import { useRouter, useSegments } from 'expo-router';
import { Animated, Easing, Linking, StyleSheet } from 'react-native';
import { handleDeepLink } from '../src/lib/supabase';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';

const OrbitSplashLogo = () => (
  <Svg width={250} height={72} viewBox="0 0 250 72" fill="none">
    <Defs>
      <LinearGradient id="splashMetal" x1="8" y1="4" x2="60" y2="64" gradientUnits="userSpaceOnUse">
        <Stop offset="0" stopColor="#f8fafc" />
        <Stop offset="0.2" stopColor="#9ca3af" />
        <Stop offset="0.44" stopColor="#ffffff" />
        <Stop offset="0.72" stopColor="#6b7280" />
        <Stop offset="1" stopColor="#f8fafc" />
      </LinearGradient>
      <LinearGradient id="splashWord" x1="70" y1="8" x2="244" y2="60" gradientUnits="userSpaceOnUse">
        <Stop offset="0" stopColor="#ffffff" />
        <Stop offset="0.22" stopColor="#c8ccd3" />
        <Stop offset="0.5" stopColor="#f7f7f8" />
        <Stop offset="0.76" stopColor="#8f96a3" />
        <Stop offset="1" stopColor="#e5e7eb" />
      </LinearGradient>
    </Defs>
    <G>
      <Ellipse cx="35" cy="36" rx="16" ry="27" transform="rotate(38 35 36)" stroke="url(#splashMetal)" strokeWidth="6.5" />
      <Ellipse cx="35" cy="36" rx="32" ry="9" transform="rotate(-34 35 36)" stroke="url(#splashMetal)" strokeWidth="5.5" strokeLinecap="round" />
      <Circle cx="35" cy="36" r="14" fill="#0a0a0a" stroke="url(#splashMetal)" strokeWidth="4" />
      <Path d="M12 52C27 42 44 27 57 10" stroke="#ffffff" strokeOpacity="0.58" strokeWidth="2" strokeLinecap="round" />
      <SvgText
        x="68"
        y="50"
        fill="url(#splashWord)"
        fontFamily="Avenir Next"
        fontSize="46"
        fontWeight="900"
        letterSpacing="-2"
      >
        ORBIT
      </SvgText>
    </G>
  </Svg>
);

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
          <Animated.View style={[splashStyles.logo, { transform: [{ scale: splashScale }] }]}>
            <OrbitSplashLogo />
          </Animated.View>
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
  logo: {
    width: 250,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
