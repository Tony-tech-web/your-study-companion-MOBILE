import React, { useEffect, useState } from 'react';
import {
  ImageBackground,
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

const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const actionArtwork = {
  ai: require('../../assets/dashboard/ai-card.png'),
  planner: require('../../assets/dashboard/planner-card.png'),
  research: require('../../assets/dashboard/research-card.png'),
};

export default function DashboardScreen() {
  const { user } = useAuth();
  const { colors, theme } = useMobileTheme();
  const s = styles(colors, theme);
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
      if (tasksResult.status === 'fulfilled') setTasks(tasksResult.value.slice(0, 4));
      if (activityResult.status === 'fulfilled') setActivity(activityResult.value);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const normalizedActivity = dayOrder.map(day => activity.find(item => item.day === day) || { day, hours: 0 });
  const maxActivity = Math.max(...normalizedActivity.map(item => item.hours), 1);
  const xpProgress = stats ? Math.min(stats.user.xp / stats.user.maxXp, 1) : 0;
  const displayName = stats?.user.name && stats.user.name !== 'Student'
    ? stats.user.name
    : user?.email?.split('@')[0] || 'Scholar';
  const initials = displayName.slice(0, 2).toUpperCase();
  const actionCards = [
    {
      title: 'AI Assistant',
      meta: 'Chat, teach, test',
      artwork: actionArtwork.ai,
      onPress: () => router.push('/ai'),
      wide: true,
    },
    {
      title: 'Planner',
      meta: `${tasks.length} active`,
      artwork: actionArtwork.planner,
      onPress: () => router.push('/planner'),
    },
    {
      title: 'Research',
      meta: `${stats?.researchMinutes || 0}m logged`,
      artwork: actionArtwork.research,
      onPress: () => router.push('/research'),
    },
  ];

  if (loading) {
    return (
      <SafeAreaView style={s.root} edges={['top']}>
        <View style={s.loadingWrap}>
          <View style={s.loadingHeader}>
            <View>
              <View style={s.skeletonTitle} />
              <View style={s.skeletonLine} />
            </View>
            <View style={s.skeletonAvatar} />
          </View>
          <View style={s.heroCard} />
          <View style={s.statsGrid}>
            {[0, 1, 2, 3].map(item => <View key={item} style={s.skeletonStatCard} />)}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
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
        <View style={s.header}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.eyebrow}>Today</Text>
            <Text style={s.name} numberOfLines={1}>{displayName}</Text>
          </View>
          <TouchableOpacity activeOpacity={0.82} style={s.avatar} onPress={() => router.push('/settings')}>
            <Text style={s.avatarText}>{initials}</Text>
          </TouchableOpacity>
        </View>

        <View style={s.heroCard}>
          <View style={s.heroTop}>
            <View>
              <Text style={s.heroKicker}>Learning Signal</Text>
              <Text style={s.heroTitle}>Level {stats?.user.level || 1}</Text>
            </View>
            <View style={s.xpOrb}>
              <Text style={s.xpPct}>{Math.round(xpProgress * 100)}%</Text>
            </View>
          </View>
          <View style={s.xpTrack}>
            <View style={[s.xpFill, { width: `${xpProgress * 100}%` }]} />
          </View>
          <Text style={s.heroSub}>{stats?.user.xp || 0} of {stats?.user.maxXp || 200} XP confirmed from real activity.</Text>
          <View style={s.heroActions}>
            <TouchableOpacity activeOpacity={0.82} style={s.heroActionPrimary} onPress={() => router.push('/ai')}>
              <Text style={s.heroActionPrimaryText}>Ask Orbit</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.82} style={s.heroActionGhost} onPress={() => router.push('/planner')}>
              <Text style={s.heroActionGhostText}>Plan week</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={s.statsGrid}>
          <MetricCard colors={colors} label="GPA" value={stats?.currentGpa || '0.00'} detail="Latest record" />
          <MetricCard colors={colors} label="AI" value={String(stats?.aiInteractions || 0)} detail="Sessions" />
          <MetricCard colors={colors} label="Study" value={`${stats?.studyMinutes || 0}m`} detail="Tracked" />
          <MetricCard colors={colors} label="Research" value={`${stats?.researchMinutes || 0}m`} detail="Logged" />
        </View>

        <View style={s.section}>
          <View style={s.sectionHead}>
            <Text style={s.sectionTitle}>Workspace</Text>
            <Text style={s.sectionHint}>Live tools</Text>
          </View>
          <View style={s.actionGrid}>
            {actionCards.map(card => (
              <DashboardActionCard key={card.title} colors={colors} card={card} />
            ))}
          </View>
        </View>

        <View style={s.section}>
          <View style={s.sectionHead}>
            <Text style={s.sectionTitle}>Activity</Text>
            <Text style={s.sectionHint}>Last 7 days</Text>
          </View>
          <View style={s.activityCard}>
            {normalizedActivity.map(item => (
              <View key={item.day} style={s.barWrap}>
                <View style={s.barTrack}>
                  <View style={[s.barFill, { height: `${Math.max((item.hours / maxActivity) * 100, item.hours > 0 ? 12 : 0)}%` }]} />
                </View>
                <Text style={s.barLabel}>{item.day}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={s.section}>
          <View style={s.sectionHead}>
            <Text style={s.sectionTitle}>Study Plans</Text>
            <TouchableOpacity onPress={() => router.push('/planner')}>
              <Text style={s.sectionAction}>Open</Text>
            </TouchableOpacity>
          </View>
          {tasks.length === 0 ? (
            <TouchableOpacity activeOpacity={0.84} style={s.emptyCard} onPress={() => router.push('/planner')}>
              <Text style={s.emptyTitle}>No active plan yet</Text>
              <Text style={s.emptyText}>Create a planner entry and Orbit will surface it here.</Text>
            </TouchableOpacity>
          ) : (
            <View style={s.planStack}>
              {tasks.map(task => (
                <TouchableOpacity key={task.id} activeOpacity={0.84} style={s.planRow} onPress={() => router.push('/planner')}>
                  <View style={[s.planStatus, task.completed && s.planStatusDone]}>
                    {task.completed && <Text style={s.checkMark}>✓</Text>}
                  </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.planTitle} numberOfLines={1}>{task.title}</Text>
                  <Text style={s.planMeta} numberOfLines={1}>{task.category} - {task.dueDate}</Text>
                </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MetricCard({ colors, label, value, detail }: { colors: any; label: string; value: string; detail: string }) {
  const cardStyles = metricStyles(colors);
  return (
    <View style={cardStyles.card}>
      <Text style={cardStyles.label}>{label}</Text>
      <Text style={cardStyles.value} numberOfLines={1}>{value}</Text>
      <Text style={cardStyles.detail}>{detail}</Text>
    </View>
  );
}

function DashboardActionCard({ colors, card }: { colors: any; card: { title: string; meta: string; artwork: any; onPress: () => void; wide?: boolean } }) {
  const cardStyles = actionCardStyles(colors);
  return (
    <TouchableOpacity
      activeOpacity={0.84}
      onPress={card.onPress}
      style={[cardStyles.card, card.wide && cardStyles.cardWide]}
    >
      <ImageBackground source={card.artwork} style={cardStyles.art} imageStyle={cardStyles.artImage}>
        <View style={cardStyles.scrim} />
        <View style={cardStyles.copy}>
          <Text style={cardStyles.title} numberOfLines={1}>{card.title}</Text>
          <Text style={cardStyles.meta} numberOfLines={1}>{card.meta}</Text>
        </View>
        <View style={cardStyles.openPill}>
          <Text style={cardStyles.openText}>Open</Text>
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );
}

const metricStyles = (colors: any) => StyleSheet.create({
  card: {
    width: '48.5%',
    minHeight: 104,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    justifyContent: 'space-between',
  },
  label: {
    color: colors.muted,
    fontFamily: fontFamily.sans,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  value: {
    color: colors.foreground,
    fontFamily: fontFamily.display,
    fontSize: 25,
    fontWeight: '900',
  },
  detail: {
    color: colors.tertiary,
    fontFamily: fontFamily.sans,
    fontSize: 11,
    fontWeight: '700',
  },
});

const actionCardStyles = (colors: any) => StyleSheet.create({
  card: {
    width: '48.5%',
    height: 174,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    ...shadow.md,
  },
  cardWide: { width: '100%', height: 190 },
  art: { flex: 1, justifyContent: 'space-between', padding: spacing.md },
  artImage: { resizeMode: 'cover' },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.16)',
  },
  copy: { gap: 3, maxWidth: '78%' },
  title: { color: '#fff', fontFamily: fontFamily.display, fontSize: 18, fontWeight: '900' },
  meta: { color: 'rgba(255,255,255,0.68)', fontFamily: fontFamily.sans, fontSize: 12, fontWeight: '800' },
  openPill: {
    alignSelf: 'flex-start',
    minWidth: 62,
    height: 34,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 14,
  },
  openText: { color: '#0A0A0A', fontFamily: fontFamily.sans, fontSize: 12, fontWeight: '900' },
});

const styles = (colors: any, theme: string) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: 150, gap: spacing.lg },
  loadingWrap: { padding: spacing.lg, gap: spacing.lg },
  loadingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  skeletonTitle: { width: 150, height: 24, borderRadius: 10, backgroundColor: colors.border },
  skeletonLine: { width: 90, height: 12, borderRadius: 8, backgroundColor: colors.surfaceElevated, marginTop: 8 },
  skeletonAvatar: { width: 50, height: 50, borderRadius: 22, backgroundColor: colors.surfaceElevated },
  skeletonStatCard: {
    width: '48.5%',
    height: 104,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  eyebrow: {
    color: colors.muted,
    fontFamily: fontFamily.sans,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  name: {
    color: colors.foreground,
    fontFamily: fontFamily.display,
    fontSize: 30,
    fontWeight: '900',
    marginTop: 2,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.glassHighlight,
    ...shadow.sm,
  },
  avatarText: { color: colors.onPrimary, fontFamily: fontFamily.sans, fontSize: typography.sm, fontWeight: '900' },
  heroCard: {
    minHeight: 214,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: theme === 'light' ? colors.surfaceElevated : 'rgba(255,255,255,0.075)',
    padding: spacing.lg,
    justifyContent: 'space-between',
    ...shadow.md,
  },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  heroKicker: { color: colors.muted, fontFamily: fontFamily.sans, fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  heroTitle: { color: colors.foreground, fontFamily: fontFamily.display, fontSize: 30, fontWeight: '900', marginTop: 4 },
  xpOrb: {
    width: 74,
    height: 74,
    borderRadius: 37,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.input,
    borderWidth: 7,
    borderColor: colors.primary,
  },
  xpPct: { color: colors.foreground, fontFamily: fontFamily.sans, fontSize: 18, fontWeight: '900' },
  xpTrack: { height: 8, borderRadius: 999, backgroundColor: colors.border, overflow: 'hidden', marginTop: spacing.lg },
  xpFill: { height: '100%', borderRadius: 999, backgroundColor: colors.primary },
  heroSub: { color: colors.muted, fontFamily: fontFamily.sans, fontSize: 12, lineHeight: 18, marginTop: spacing.md },
  heroActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  heroActionPrimary: { flex: 1, height: 44, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  heroActionPrimaryText: { color: colors.onPrimary, fontFamily: fontFamily.sans, fontSize: 13, fontWeight: '900' },
  heroActionGhost: { flex: 1, height: 44, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.input, borderWidth: 1, borderColor: colors.border },
  heroActionGhostText: { color: colors.foreground, fontFamily: fontFamily.sans, fontSize: 13, fontWeight: '900' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.sm },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.sm },
  section: { gap: spacing.sm },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: colors.foreground, fontFamily: fontFamily.sans, fontSize: typography.base, fontWeight: '900' },
  sectionHint: { color: colors.muted, fontFamily: fontFamily.sans, fontSize: 11, fontWeight: '800' },
  sectionAction: { color: colors.primary, fontFamily: fontFamily.sans, fontSize: 12, fontWeight: '900' },
  activityCard: {
    height: 178,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  barWrap: { flex: 1, alignItems: 'center', gap: 8 },
  barTrack: { height: 112, width: 18, borderRadius: 999, justifyContent: 'flex-end', overflow: 'hidden', backgroundColor: colors.input },
  barFill: { width: '100%', borderRadius: 999, backgroundColor: colors.primary },
  barLabel: { color: colors.muted, fontFamily: fontFamily.sans, fontSize: 10, fontWeight: '900' },
  emptyCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
  emptyTitle: { color: colors.foreground, fontFamily: fontFamily.sans, fontSize: typography.sm, fontWeight: '900' },
  emptyText: { color: colors.muted, fontFamily: fontFamily.sans, fontSize: 12, lineHeight: 18, marginTop: 4 },
  planStack: { gap: spacing.sm },
  planRow: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
  },
  planStatus: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planStatusDone: { backgroundColor: colors.green, borderColor: colors.green },
  checkMark: { color: '#06130b', fontFamily: fontFamily.sans, fontSize: 12, fontWeight: '900' },
  planTitle: { color: colors.foreground, fontFamily: fontFamily.sans, fontSize: typography.sm, fontWeight: '900' },
  planMeta: { color: colors.muted, fontFamily: fontFamily.sans, fontSize: 11, marginTop: 3, fontWeight: '700' },
});
