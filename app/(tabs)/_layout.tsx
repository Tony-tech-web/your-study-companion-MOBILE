import { Tabs } from 'expo-router';
import React, { useRef, useState } from 'react';
import { colors } from '../../src/lib/theme';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import Svg, { Path } from 'react-native-svg';

// ─── SVG Icon set (user's icons, kept as-is) ──────────────────────────────────
const icons: Record<string, string> = {
  index:       'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10',
  ai:          'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  planner:     'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  gpa:         'M22 12h-4l-3 9L9 3l-3 9H2',
  research:    'M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z',
  leaderboard: 'M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z',
};

const TAB_LABELS: Record<string, string> = {
  index: 'Home', ai: 'Orbit', planner: 'Planner', gpa: 'GPA', research: 'Research', leaderboard: 'Ranks',
};

const MAIN_TABS  = ['index', 'ai', 'planner'];
const EXTRA_TABS = ['gpa', 'research', 'leaderboard'];

// ─── SVG Icon component ────────────────────────────────────────────────────────
const TabIcon = ({ name, focused }: { name: string; focused: boolean }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path
      d={icons[name] || icons.index}
      stroke={focused ? colors.primary : colors.muted}
      strokeWidth={focused ? 2 : 1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// ─── Custom floating pill tab bar ─────────────────────────────────────────────
function CustomTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState(false);
  const expandAnim = useRef(new Animated.Value(0)).current;

  const toggleExpand = () => {
    const next = !expanded;
    setExpanded(next);
    Animated.spring(expandAnim, {
      toValue: next ? 1 : 0,
      friction: 8, tension: 50, useNativeDriver: false,
    }).start();
  };

  const expandHeight  = expandAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 72] });
  const expandOpacity = expandAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  const renderTab = (routeName: string, isExtra = false) => {
    const routeIndex = state.routes.findIndex((r: any) => r.name === routeName);
    if (routeIndex === -1) return null;
    const route = state.routes[routeIndex];
    const isFocused = state.index === routeIndex;

    const onPress = () => {
      const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
      if (isExtra && expanded) toggleExpand();
    };

    return (
      <TouchableOpacity key={route.key} onPress={onPress} style={s.tabItem} activeOpacity={0.7}>
        <View style={[s.iconWrap, isFocused && s.iconWrapActive]}>
          <TabIcon name={route.name} focused={isFocused} />
        </View>
        <Text style={[s.tabLabel, isFocused && s.tabLabelActive]}>
          {TAB_LABELS[route.name]}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[s.container, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <BlurView intensity={85} tint="dark" style={s.pill}>
        {/* Extra tabs row — expands upward */}
        <Animated.View style={[s.extraRow, { height: expandHeight, opacity: expandOpacity }]}>
          {EXTRA_TABS.map(name => renderTab(name, true))}
        </Animated.View>

        {/* Main tabs row */}
        <View style={s.mainRow}>
          {MAIN_TABS.map(name => renderTab(name))}

          {/* More / close toggle */}
          <TouchableOpacity onPress={toggleExpand} style={s.tabItem} activeOpacity={0.7}>
            <View style={[s.iconWrap, expanded && s.iconWrapActive]}>
              <Text style={{ fontSize: expanded ? 16 : 18, color: expanded ? colors.primary : colors.muted }}>
                {expanded ? '✕' : '⋯'}
              </Text>
            </View>
            <Text style={[s.tabLabel, expanded && s.tabLabelActive]}>
              {expanded ? 'Close' : 'More'}
            </Text>
          </TouchableOpacity>
        </View>
      </BlurView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 16,
    right: 16,
  },
  pill: {
    borderRadius: 9999,
    overflow: 'hidden',
    backgroundColor: 'rgba(10, 10, 10, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    // shadow for iOS depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  mainRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  extraRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    overflow: 'hidden',
    paddingBottom: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: colors.primary + '22',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.muted,
  },
  tabLabelActive: {
    color: colors.primary,
  },
});

// ─── Tabs layout ──────────────────────────────────────────────────────────────
export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="ai" />
      <Tabs.Screen name="planner" />
      <Tabs.Screen name="gpa" />
      <Tabs.Screen name="research" />
      <Tabs.Screen name="leaderboard" />
    </Tabs>
  );
}
