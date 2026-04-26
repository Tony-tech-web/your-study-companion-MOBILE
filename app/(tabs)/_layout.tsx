import { Tabs } from 'expo-router';
import React from 'react';
import { colors } from '../../src/lib/theme';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';

// Minimal SVG icon components — no emoji
const Icon = ({ d, focused, size = 20, circle }: { d?: string; focused: boolean; size?: number; circle?: boolean }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {circle
      ? <Circle cx="12" cy="12" r="9" stroke={focused ? colors.primary : colors.muted} strokeWidth={focused ? 2 : 1.5} />
      : <Path d={d} stroke={focused ? colors.primary : colors.muted} strokeWidth={focused ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round" />
    }
  </Svg>
);

const icons = {
  home:        'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10',
  ai:          'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  planner:     'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  gpa:         'M22 12h-4l-3 9L9 3l-3 9H2',
  research:    'M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z',
  chat:        'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z',
  news:        'M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10l6 6v8a2 2 0 01-2 2z',
  leaderboard: 'M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z',
};

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarStyle: {
        backgroundColor: colors.card,
        borderTopColor: colors.border,
        borderTopWidth: StyleSheet.hairlineWidth,
        paddingTop: 8,
        paddingBottom: 10,
        height: 72,
        elevation: 0,
        shadowOpacity: 0,
      },
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.muted,
      tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginTop: 3 },
      tabBarItemStyle: { paddingVertical: 0 },
    }}>
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ focused }) => <Icon d={icons.home} focused={focused} /> }} />
      <Tabs.Screen name="ai" options={{ title: 'Orbit AI', tabBarIcon: ({ focused }) => <Icon d={icons.ai} focused={focused} /> }} />
      <Tabs.Screen name="planner" options={{ title: 'Planner', tabBarIcon: ({ focused }) => <Icon d={icons.planner} focused={focused} /> }} />
      <Tabs.Screen name="gpa" options={{ title: 'GPA', tabBarIcon: ({ focused }) => <Icon d={icons.gpa} focused={focused} /> }} />
      <Tabs.Screen name="research" options={{ title: 'Research', tabBarIcon: ({ focused }) => <Icon d={icons.research} focused={focused} /> }} />
      <Tabs.Screen name="chat" options={{ title: 'Chat', tabBarIcon: ({ focused }) => <Icon d={icons.chat} focused={focused} /> }} />
      <Tabs.Screen name="news" options={{ title: 'News', tabBarIcon: ({ focused }) => <Icon d={icons.news} focused={focused} /> }} />
      <Tabs.Screen name="leaderboard" options={{ title: 'Ranks', tabBarIcon: ({ focused }) => <Icon d={icons.leaderboard} focused={focused} /> }} />
    </Tabs>
  );
}
