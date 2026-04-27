import { Tabs } from 'expo-router';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { colors, radius } from '../../src/lib/theme';
import Svg, { Path } from 'react-native-svg';

const icons: Record<string, string> = {
  index:        'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10',
  ai:           'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  planner:      'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  gpa:          'M22 12h-4l-3 9L9 3l-3 9H2',
  research:     'M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z',
  chat:         'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z',
  news:         'M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10l6 6v8a2 2 0 01-2 2z',
  leaderboard:  'M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z',
};

const labels: Record<string, string> = {
  index: 'Home', ai: 'Orbit', planner: 'Plan',
  gpa: 'GPA', research: 'Search', chat: 'Chat',
  news: 'News', leaderboard: 'Ranks',
};

function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.barWrap, { paddingBottom: insets.bottom + 8 }]} pointerEvents="box-none">
      <View style={s.pill}>
        {state.routes.map((route, i) => {
          const focused = state.index === i;
          const iconPath = icons[route.name] || icons.index;
          const label = labels[route.name] || route.name;

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
          };

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              activeOpacity={0.7}
              style={s.tab}
            >
              {/* Active circle highlight */}
              <View style={[s.iconWrap, focused && s.iconWrapActive]}>
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                  <Path
                    d={iconPath}
                    stroke={focused ? '#fff' : colors.muted}
                    strokeWidth={focused ? 2.2 : 1.6}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </View>
              <Text style={[s.label, focused && s.labelActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
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
      <Tabs.Screen name="leaderboard" />
    </Tabs>
  );
}

const s = StyleSheet.create({
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
    flexDirection: 'row',
    backgroundColor: 'rgba(20,20,20,0.96)',
    borderRadius: 40,
    paddingHorizontal: 8,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
    // Shadow — iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    // Shadow — Android
    elevation: 20,
    width: '100%',
    maxWidth: 420,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  label: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.muted,
    letterSpacing: 0.2,
  },
  labelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
});
