import { Tabs } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { colors, fontFamily, radius, shadow, spacing } from '../../src/lib/theme';
import Svg, { Path } from 'react-native-svg';

type RouteName = 'index' | 'ai' | 'planner' | 'gpa' | 'research' | 'chat' | 'news' | 'courses' | 'leaderboard';

const icons: Record<RouteName | 'plus', string> = {
  index: 'M3 10.5L12 3l9 7.5V21a1 1 0 01-1 1h-5.4v-6.5H9.4V22H4a1 1 0 01-1-1V10.5z',
  ai: 'M12 2l2.5 6.9L21.5 12l-7 3.1L12 22l-2.5-6.9L2.5 12l7-3.1L12 2z',
  planner: 'M7 4v3M17 4v3M4 9h16M6 13h5M6 17h8M5 6h14a1 1 0 011 1v15H4V7a1 1 0 011-1z',
  gpa: 'M3 17l5-5 4 4 7-9M4 21h16',
  research: 'M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z',
  chat: 'M21 15a2 2 0 01-2 2H8l-5 4V5a2 2 0 012-2h14a2 2 0 012 2z',
  news: 'M5 4h10l5 5v15H5zM14 4v6h6M8 14h8M8 18h8',
  courses: 'M4 6.5A3.5 3.5 0 017.5 3H20v16H7.5A3.5 3.5 0 004 22.5V6.5zM4 6.5v16',
  leaderboard: 'M8 21h8M12 17v4M6 4h12v4a6 6 0 01-12 0V4zM6 6H3v2a4 4 0 004 4M18 6h3v2a4 4 0 01-4 4',
  plus: 'M12 5v14M5 12h14',
};

const primaryRoutes: Array<{ name: RouteName; label: string }> = [
  { name: 'index', label: 'Dashboard' },
  { name: 'ai', label: 'AI Assistant' },
  { name: 'news', label: 'News' },
  { name: 'leaderboard', label: 'Leaderboard' },
];

const moreRoutes: Array<{ name: RouteName; label: string; detail: string }> = [
  { name: 'planner', label: 'Planner', detail: 'Study schedule' },
  { name: 'gpa', label: 'GPA', detail: 'Academic tracker' },
  { name: 'research', label: 'Research', detail: 'AI search' },
  { name: 'courses', label: 'Courses', detail: 'PDF library' },
  { name: 'chat', label: 'Chat', detail: 'Campus messages' },
];

const Icon = ({ name, color, size = 20, strokeWidth = 1.9 }: { name: RouteName | 'plus'; color: string; size?: number; strokeWidth?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d={icons[name]} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const scale = useRef(new Animated.Value(0.92)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const activeRoute = state.routes[state.index]?.name as RouteName | undefined;

  const routeByName = useMemo(() => {
    const map = new Map<string, { key: string; name: string }>();
    state.routes.forEach(route => map.set(route.name, { key: route.key, name: route.name }));
    return map;
  }, [state.routes]);

  const moreActive = !!activeRoute && moreRoutes.some(route => route.name === activeRoute);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: open ? 1 : 0,
        duration: open ? 180 : 120,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: open ? 1 : 0.92,
        damping: 18,
        stiffness: 220,
        mass: 0.8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [open, opacity, scale]);

  const goTo = (routeName: RouteName) => {
    const route = routeByName.get(routeName);
    if (!route) return;
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (!event.defaultPrevented) navigation.navigate(route.name);
    setOpen(false);
  };

  const renderTab = (route: { name: RouteName; label: string }) => {
    const focused = activeRoute === route.name;
    return (
      <TouchableOpacity
        key={route.name}
        onPress={() => goTo(route.name)}
        activeOpacity={0.75}
        style={s.tab}
        accessibilityRole="button"
        accessibilityState={{ selected: focused }}
      >
        <View style={[s.iconWrap, focused && s.iconWrapActive]}>
          <Icon name={route.name} color={focused ? colors.onPrimary : colors.muted} size={19} strokeWidth={focused ? 2.25 : 1.7} />
        </View>
        <Text style={[s.label, focused && s.labelActive]} numberOfLines={2}>{route.label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <Modal visible={open} transparent animationType="none" onRequestClose={() => setOpen(false)}>
        <Pressable style={s.modalBackdrop} onPress={() => setOpen(false)}>
          <Animated.View
            style={[
              s.morePanel,
              {
                bottom: Math.max(insets.bottom, 10) + 84,
                opacity,
                transform: [{ scale }],
              },
            ]}
          >
            <Pressable onPress={() => {}}>
              <View style={s.moreHandle} />
              <Text style={s.moreTitle}>More Tools</Text>
              <View style={s.moreGrid}>
                {moreRoutes.map(route => {
                  const focused = activeRoute === route.name;
                  return (
                    <TouchableOpacity
                      key={route.name}
                      onPress={() => goTo(route.name)}
                      activeOpacity={0.78}
                      style={[s.moreItem, focused && s.moreItemActive]}
                    >
                      <View style={[s.moreIcon, focused && s.moreIconActive]}>
                        <Icon name={route.name} color={focused ? colors.onPrimary : colors.foreground} size={18} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={s.moreLabel} numberOfLines={1}>{route.label}</Text>
                        <Text style={s.moreDetail} numberOfLines={1}>{route.detail}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>

      <View style={[s.barWrap, { paddingBottom: Math.max(insets.bottom, 8) }]} pointerEvents="box-none">
        <View style={s.pill}>
          {renderTab(primaryRoutes[0])}
          {renderTab(primaryRoutes[1])}
          <TouchableOpacity
            onPress={() => setOpen(v => !v)}
            activeOpacity={0.78}
            style={s.plusSlot}
            accessibilityRole="button"
            accessibilityLabel="Open more navigation"
          >
            <View style={[s.plusButton, (open || moreActive) && s.plusButtonActive]}>
              <Icon name="plus" color={open || moreActive ? colors.onPrimary : colors.foreground} size={24} strokeWidth={2.35} />
            </View>
            <Text style={[s.label, moreActive && s.labelActive]} numberOfLines={1}>More</Text>
          </TouchableOpacity>
          {renderTab(primaryRoutes[2])}
          {renderTab(primaryRoutes[3])}
        </View>
      </View>
    </>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={props => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="ai" />
      <Tabs.Screen name="planner" />
      <Tabs.Screen name="gpa" />
      <Tabs.Screen name="research" />
      <Tabs.Screen name="chat" />
      <Tabs.Screen name="news" />
      <Tabs.Screen name="courses" />
      <Tabs.Screen name="leaderboard" />
    </Tabs>
  );
}

const s = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.42)',
  },
  morePanel: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    alignSelf: 'center',
    maxWidth: 430,
    borderRadius: radius.xxl,
    padding: spacing.md,
    backgroundColor: 'rgba(18,18,18,0.88)',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.floating,
  },
  moreHandle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 99,
    backgroundColor: colors.border,
    marginBottom: 12,
  },
  moreTitle: {
    color: colors.foreground,
    fontFamily: fontFamily.display,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 12,
  },
  moreGrid: {
    gap: 10,
  },
  moreItem: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.input,
    paddingHorizontal: 12,
  },
  moreItemActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  moreIcon: {
    width: 40,
    height: 40,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  moreIconActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  moreLabel: {
    color: colors.foreground,
    fontFamily: fontFamily.sans,
    fontSize: 14,
    fontWeight: '800',
  },
  moreDetail: {
    color: colors.muted,
    fontFamily: fontFamily.sans,
    fontSize: 11,
    marginTop: 2,
  },
  barWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 12,
    pointerEvents: 'box-none',
  },
  pill: {
    width: '100%',
    maxWidth: 430,
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: 'rgba(20,20,20,0.78)',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.floating,
  },
  tab: {
    flex: 1,
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  plusSlot: {
    width: 68,
    minHeight: 62,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: colors.primary,
  },
  plusButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.45,
    shadowRadius: 28,
    elevation: 20,
  },
  plusButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  label: {
    color: colors.muted,
    fontFamily: fontFamily.sans,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0,
    lineHeight: 9,
    textAlign: 'center',
  },
  labelActive: {
    color: colors.primary,
  },
});
