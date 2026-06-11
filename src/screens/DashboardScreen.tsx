import React, { useEffect, useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { fontFamily, radius, shadow, spacing, typography } from '../lib/theme';
import { useMobileTheme } from '../contexts/ThemeContext';
import { getActivity, getFullDashboardStats, getTasks, FullStats } from '../services/dashboard';
import { StudyActivity, Task } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { StitchGlassCard, StitchLabel, StitchNeoButton, StitchNeoInset } from '../components/StitchUI';

const quickActions = [
  { title: 'Research', route: '/research', mark: 'R' },
  { title: 'Materials', route: '/courses', mark: 'M' },
  { title: 'GPA Tracker', route: '/gpa', mark: 'G' },
  { title: 'Leaderboard', route: '/leaderboard', mark: 'L' },
] as const;

export default function DashboardScreen() {
  const { user } = useAuth();
  const { colors, theme } = useMobileTheme();
  const s = useMemo(() => styles(colors, theme), [colors, theme]);
  const [stats, setStats] = useState<FullStats | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activity, setActivity] = useState<StudyActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const [statsResult, tasksResult, activityResult] = await Promise.allSettled([
        getFullDashboardStats(),
        getTasks(),
        getActivity(),
      ]);
      if (statsResult.status === 'fulfilled') setStats(statsResult.value);
      if (tasksResult.status === 'fulfilled') setTasks(tasksResult.value);
      if (activityResult.status === 'fulfilled') setActivity(activityResult.value);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const displayName = stats?.user.name && stats.user.name !== 'Student'
    ? stats.user.name
    : user?.email?.split('@')[0] || 'Scholar';
  const initials = displayName.slice(0, 2).toUpperCase();
  const studyTime = stats
    ? stats.studyMinutes >= 60
      ? `${Math.floor(stats.studyMinutes / 60)}h ${stats.studyMinutes % 60}m`
      : `${stats.studyMinutes}m`
    : '0m';
  const activePlans = tasks.filter(task => !task.completed);
  const focusTask = activePlans[0] || tasks[0];
  const xpProgress = stats ? Math.min(stats.user.xp / stats.user.maxXp, 1) : 0;
  const busiest = activity.reduce((best, item) => item.hours > best.hours ? item : best, { day: 'Today', hours: 0 });

  if (loading) {
    return (
      <SafeAreaView style={s.root} edges={['top']}>
        <View style={s.loading}>
          <View style={s.loadingAvatar} />
          <View style={s.loadingCard} />
          <View style={s.loadingCardSmall} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.topBar}>
        <TouchableOpacity activeOpacity={0.82} style={s.avatar} onPress={() => router.push('/settings')}>
          <Text style={s.avatarText}>{initials}</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.greeting}>Good morning,</Text>
          <Text style={s.name} numberOfLines={1}>{displayName}</Text>
        </View>
        <StitchNeoButton onPress={() => router.push('/research')} style={s.searchButton}>
          <Text style={s.searchMark}>S</Text>
        </StitchNeoButton>
      </View>

      <ScrollView
        style={s.root}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            tintColor={colors.primary}
          />
        }
      >
        <StitchGlassCard style={s.statsCard}>
          <View style={s.statsHeader}>
            <View>
              <StitchLabel>Current Term</StitchLabel>
              <Text style={s.gpaText}>
                {stats?.currentGpa || '0.00'} <Text style={s.gpaUnit}>GPA</Text>
              </Text>
            </View>
            <StitchNeoInset style={s.roundIcon}>
              <Text style={s.roundIconText}>A</Text>
            </StitchNeoInset>
          </View>
          <View style={s.statGrid}>
            <StitchNeoInset style={s.statInset}>
              <Text style={s.statLabel}>Study Time</Text>
              <Text style={s.statValue}>{studyTime}</Text>
              <Text style={s.statGood}>Tracked live</Text>
            </StitchNeoInset>
            <StitchNeoInset style={s.statInset}>
              <Text style={s.statLabel}>AI Sessions</Text>
              <Text style={s.statValue}>{stats?.aiInteractions || 0}</Text>
              <Text style={s.statWarm}>Level {stats?.user.level || 1}</Text>
            </StitchNeoInset>
          </View>
        </StitchGlassCard>

        <View style={s.sectionHead}>
          <Text style={s.sectionTitle}>Current Focus</Text>
          <TouchableOpacity onPress={() => router.push('/planner')}>
            <Text style={s.sectionAction}>See all</Text>
          </TouchableOpacity>
        </View>
        <StitchGlassCard style={s.focusCard}>
          <View style={s.dateBlock}>
            <Text style={s.dateMonth}>{focusTask?.dueDate ? focusTask.dueDate.slice(0, 3) : 'Now'}</Text>
            <Text style={s.dateDay}>{activePlans.length || tasks.length}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.focusTitle} numberOfLines={1}>{focusTask?.title || 'Create your first study plan'}</Text>
            <Text style={s.focusMeta} numberOfLines={1}>{focusTask?.category || 'Planner is ready'}</Text>
          </View>
          <TouchableOpacity activeOpacity={0.82} style={s.playButton} onPress={() => router.push(focusTask ? '/planner' : '/ai')}>
            <Text style={s.playText}>Go</Text>
          </TouchableOpacity>
        </StitchGlassCard>

        <View style={s.sectionHead}>
          <Text style={s.sectionTitle}>Quick Actions</Text>
        </View>
        <View style={s.actionGrid}>
          {quickActions.map(action => (
            <TouchableOpacity
              key={action.title}
              activeOpacity={0.84}
              onPress={() => router.push(action.route as any)}
              style={s.actionCard}
            >
              <StitchNeoInset style={s.actionIcon}>
                <Text style={s.actionMark}>{action.mark}</Text>
              </StitchNeoInset>
              <Text style={s.actionText}>{action.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.insightFrame}>
          <StitchGlassCard style={s.insightCard}>
            <View style={s.insightIcon}>
              <Text style={s.insightIconText}>AI</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.insightTitle}>Daily Insight</Text>
              <Text style={s.insightText}>
                Orbit sees {studyTime} of study time, {stats?.researchMinutes || 0}m of research, and your strongest activity on {busiest.day}. Use that block for the hardest material.
              </Text>
            </View>
          </StitchGlassCard>
        </View>

        <StitchGlassCard style={s.progressCard}>
          <View style={s.progressTop}>
            <View>
              <StitchLabel>XP Progress</StitchLabel>
              <Text style={s.progressTitle}>Level {stats?.user.level || 1}</Text>
            </View>
            <Text style={s.progressPct}>{Math.round(xpProgress * 100)}%</Text>
          </View>
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${xpProgress * 100}%` }]} />
          </View>
        </StitchGlassCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = (colors: any, theme: string) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  topBar: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: theme === 'dark' ? 'rgba(18,18,18,0.78)' : 'rgba(255,255,255,0.72)',
    ...shadow.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.glassHighlight,
  },
  avatarText: { color: colors.onPrimary, fontFamily: fontFamily.sans, fontSize: 13, fontWeight: '900' },
  greeting: { color: colors.muted, fontFamily: fontFamily.sans, fontSize: 15, lineHeight: 20 },
  name: { color: colors.primary, fontFamily: fontFamily.display, fontSize: 20, lineHeight: 25, fontWeight: '900' },
  searchButton: { width: 40, height: 40, minHeight: 40, paddingHorizontal: 0 },
  searchMark: { color: colors.primary, fontFamily: fontFamily.sans, fontSize: 13, fontWeight: '900' },
  content: { paddingHorizontal: 20, paddingTop: 32, paddingBottom: 130, gap: 28 },
  statsCard: { padding: 24, gap: 24 },
  statsHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  gpaText: { color: colors.foreground, fontFamily: fontFamily.display, fontSize: 28, lineHeight: 34, fontWeight: '900', marginTop: 4 },
  gpaUnit: { color: colors.muted, fontFamily: fontFamily.sans, fontSize: 17, fontWeight: '500' },
  roundIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  roundIconText: { color: colors.primary, fontFamily: fontFamily.sans, fontSize: 15, fontWeight: '900' },
  statGrid: { flexDirection: 'row', gap: 16 },
  statInset: { flex: 1, padding: 16 },
  statLabel: { color: colors.muted, fontFamily: fontFamily.sans, fontSize: 15, lineHeight: 20 },
  statValue: { color: colors.foreground, fontFamily: fontFamily.display, fontSize: 20, lineHeight: 25, fontWeight: '900', marginTop: 4 },
  statGood: { color: colors.green, fontFamily: fontFamily.sans, fontSize: 12, fontWeight: '900', marginTop: 4 },
  statWarm: { color: '#b35e00', fontFamily: fontFamily.sans, fontSize: 12, fontWeight: '900', marginTop: 4 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: -12 },
  sectionTitle: { color: colors.foreground, fontFamily: fontFamily.display, fontSize: 20, lineHeight: 25, fontWeight: '900' },
  sectionAction: { color: colors.primary, fontFamily: fontFamily.sans, fontSize: 15, fontWeight: '800' },
  focusCard: { minHeight: 96, borderLeftWidth: 4, borderLeftColor: colors.primary, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16 },
  dateBlock: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary + '22' },
  dateMonth: { color: colors.primary, fontFamily: fontFamily.sans, fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  dateDay: { color: colors.primary, fontFamily: fontFamily.display, fontSize: 22, lineHeight: 24, fontWeight: '900' },
  focusTitle: { color: colors.foreground, fontFamily: fontFamily.sans, fontSize: 17, lineHeight: 24, fontWeight: '900' },
  focusMeta: { color: colors.muted, fontFamily: fontFamily.sans, fontSize: 15, lineHeight: 20, marginTop: 2 },
  playButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, ...shadow.sm },
  playText: { color: colors.onPrimary, fontFamily: fontFamily.sans, fontSize: 12, fontWeight: '900' },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 16 },
  actionCard: {
    width: '47.5%',
    minHeight: 122,
    borderRadius: 32,
    padding: 16,
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: theme === 'dark' ? 'rgba(22,23,27,0.72)' : 'rgba(255,255,255,0.6)',
    ...shadow.sm,
  },
  actionIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  actionMark: { color: colors.primary, fontFamily: fontFamily.sans, fontSize: 14, fontWeight: '900' },
  actionText: { color: colors.foreground, fontFamily: fontFamily.sans, fontSize: 15, fontWeight: '800' },
  insightFrame: { borderRadius: 32, padding: 1, backgroundColor: colors.primary + '30' },
  insightCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 16, padding: 24 },
  insightIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary + '16' },
  insightIconText: { color: colors.primary, fontFamily: fontFamily.sans, fontSize: 11, fontWeight: '900' },
  insightTitle: { color: colors.primary, fontFamily: fontFamily.display, fontSize: 17, fontWeight: '900', marginBottom: 6 },
  insightText: { color: colors.muted, fontFamily: fontFamily.sans, fontSize: 15, lineHeight: 22 },
  progressCard: { padding: 20, gap: 14 },
  progressTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progressTitle: { color: colors.foreground, fontFamily: fontFamily.display, fontSize: 20, fontWeight: '900', marginTop: 3 },
  progressPct: { color: colors.primary, fontFamily: fontFamily.display, fontSize: 24, fontWeight: '900' },
  progressTrack: { height: 10, borderRadius: 999, backgroundColor: colors.border, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999, backgroundColor: colors.primary },
  loading: { flex: 1, padding: spacing.lg, gap: spacing.lg },
  loadingAvatar: { width: 160, height: 42, borderRadius: 21, backgroundColor: colors.card },
  loadingCard: { height: 210, borderRadius: 32, backgroundColor: colors.card },
  loadingCardSmall: { height: 120, borderRadius: 32, backgroundColor: colors.card },
});
