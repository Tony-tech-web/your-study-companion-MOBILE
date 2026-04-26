import { Tabs } from 'expo-router';
import { colors, radius } from '../../src/lib/theme';
import { Text, View, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { useState } from 'react';

const TAB_ICONS: Record<string, string> = {
  index: '🏠', ai: '✨', planner: '📅', gpa: '🎓', research: '🔍', leaderboard: '🏆',
};
const TAB_LABELS: Record<string, string> = {
  index: 'Home', ai: 'Orbit', planner: 'Planner', gpa: 'GPA', research: 'Research', leaderboard: 'Ranks',
};

function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState(false);

  const MAIN_TABS = ['index', 'ai', 'planner'];
  const EXTRA_TABS = ['gpa', 'research', 'leaderboard'];

  const expandHeight = useSharedValue(0);
  const expandOpacity = useSharedValue(0);

  const toggleExpand = () => {
    const next = !expanded;
    setExpanded(next);
    expandHeight.value = withSpring(next ? 76 : 0, { damping: 18, stiffness: 200 });
    expandOpacity.value = withTiming(next ? 1 : 0, { duration: 150 });
  };

  const animatedExtra = useAnimatedStyle(() => ({
    height: expandHeight.value,
    opacity: expandOpacity.value,
    overflow: 'hidden',
  }));

  const renderTab = (route: any, isExtra = false) => {
    const isFocused = state.index === state.routes.findIndex((r: any) => r.key === route.key);
    const onPress = () => {
      const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
      if (isExtra && expanded) toggleExpand();
    };

    return (
      <TouchableOpacity key={route.key} onPress={onPress} style={s.tabItem}>
        <View style={[s.iconWrap, isFocused && s.iconWrapActive]}>
          <Text style={s.emoji}>{TAB_ICONS[route.name]}</Text>
        </View>
        <Text style={[s.tabLabel, isFocused && s.tabLabelActive]}>{TAB_LABELS[route.name]}</Text>
      </TouchableOpacity>
    );
  };

  const mainRoutes = state.routes.filter((r: any) => MAIN_TABS.includes(r.name));
  const extraRoutes = state.routes.filter((r: any) => EXTRA_TABS.includes(r.name));

  return (
    <View style={[s.container, { paddingBottom: Math.max(insets.bottom, 16) }]}>
      <BlurView intensity={80} tint="dark" style={s.blurPill}>
        <Animated.View style={[s.extraRow, animatedExtra]}>
          {extraRoutes.map((r: any) => renderTab(r, true))}
        </Animated.View>
        <View style={s.mainRow}>
          {mainRoutes.map((r: any) => renderTab(r, false))}
          <TouchableOpacity onPress={toggleExpand} style={s.tabItem}>
            <View style={[s.iconWrap, expanded && s.iconWrapActive]}>
              <Text style={[s.emoji, { fontSize: expanded ? 18 : 22 }]}>{expanded ? '✕' : '☰'}</Text>
            </View>
            <Text style={[s.tabLabel, expanded && s.tabLabelActive]}>More</Text>
          </TouchableOpacity>
        </View>
      </BlurView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { position: 'absolute', bottom: 0, left: 24, right: 24 },
  blurPill: { borderRadius: radius.xl, overflow: 'hidden', backgroundColor: 'rgba(15, 15, 15, 0.65)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)' },
  mainRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 10 },
  extraRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.05)' },
  tabItem: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  iconWrap: { width: 40, height: 40, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  iconWrapActive: { backgroundColor: colors.primary + '20' },
  emoji: { fontSize: 20 },
  tabLabel: { fontSize: 10, fontWeight: '600', color: colors.muted },
  tabLabelActive: { color: colors.primary },
});

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <CustomTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="ai" />
      <Tabs.Screen name="planner" />
      <Tabs.Screen name="gpa" />
      <Tabs.Screen name="research" />
      <Tabs.Screen name="leaderboard" />
    </Tabs>
  );
}

