import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Image, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius, typography } from '../lib/theme';
import { getLeaderboard, LeaderboardResult } from '../services/leaderboard';
import { useAuth } from '../contexts/AuthContext';
import Skeleton from '../components/Skeleton';

const MEDAL = ['🥇', '🥈', '🥉'];

export default function LeaderboardScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [result, setResult] = useState<LeaderboardResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setError(null);
      setResult(await getLeaderboard());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ padding: 20, gap: 12 }}>
        <View style={{ width: 140, height: 22, borderRadius: 6, backgroundColor: colors.border, opacity: 0.5 }} />
        <View style={{ height: 80, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }} />
        <View style={{ height: 140, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border }}>
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.border, opacity: 0.35 }} />
            <View style={{ flex: 1, gap: 6 }}>
              <View style={{ width: '60%', height: 12, borderRadius: 4, backgroundColor: colors.border, opacity: 0.4 }} />
              <View style={{ width: '40%', height: 10, borderRadius: 4, backgroundColor: colors.border, opacity: 0.25 }} />
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border }}>
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.border, opacity: 0.35 }} />
            <View style={{ flex: 1, gap: 6 }}>
              <View style={{ width: '60%', height: 12, borderRadius: 4, backgroundColor: colors.border, opacity: 0.4 }} />
              <View style={{ width: '40%', height: 10, borderRadius: 4, backgroundColor: colors.border, opacity: 0.25 }} />
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border }}>
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.border, opacity: 0.35 }} />
            <View style={{ flex: 1, gap: 6 }}>
              <View style={{ width: '60%', height: 12, borderRadius: 4, backgroundColor: colors.border, opacity: 0.4 }} />
              <View style={{ width: '40%', height: 10, borderRadius: 4, backgroundColor: colors.border, opacity: 0.25 }} />
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border }}>
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.border, opacity: 0.35 }} />
            <View style={{ flex: 1, gap: 6 }}>
              <View style={{ width: '60%', height: 12, borderRadius: 4, backgroundColor: colors.border, opacity: 0.4 }} />
              <View style={{ width: '40%', height: 10, borderRadius: 4, backgroundColor: colors.border, opacity: 0.25 }} />
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border }}>
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.border, opacity: 0.35 }} />
            <View style={{ flex: 1, gap: 6 }}>
              <View style={{ width: '60%', height: 12, borderRadius: 4, backgroundColor: colors.border, opacity: 0.4 }} />
              <View style={{ width: '40%', height: 10, borderRadius: 4, backgroundColor: colors.border, opacity: 0.25 }} />
            </View>
          </View>
      </View>
    </View>
  );

  if (error || !result) return (
    <View style={s.center}>
      <Text style={s.errorIcon}>🏆</Text>
      <Text style={s.errorTitle}>Leaderboard unavailable</Text>
      <Text style={s.errorText}>{error || 'No data'}</Text>
      <TouchableOpacity style={s.retryBtn} onPress={() => { setLoading(true); load(); }}>
        <Text style={s.retryBtnText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  const { entries, myRank } = result;
  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={[s.content, { paddingTop: insets.top + spacing.sm }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
    >
      <View style={s.headerRow}>
        <View>
          <Text style={s.title}>Leaderboard</Text>
          <Text style={s.subtitle}>{entries.length} students ranked globally</Text>
        </View>
        <View style={s.livePill}>
          <View style={s.liveDot} />
          <Text style={s.liveText}>Live</Text>
        </View>
      </View>

      {/* My rank card */}
      {myRank && myRank.rank > 3 && (
        <View style={s.myRankCard}>
          <Text style={s.myRankNum}>#{myRank.rank}</Text>
          <View style={s.myRankAvatar}>
            <Text style={s.myRankAvatarTxt}>{user?.email?.slice(0,2).toUpperCase() || 'ME'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.myRankName}>You</Text>
            <Text style={s.myRankTitle}>{myRank.xp.toLocaleString()} XP · Level {myRank.level} · {myRank.title}</Text>
          </View>
          <Text style={s.myRankLabel}>Your rank</Text>
        </View>
      )}

      {/* Podium */}
      {top3.length > 0 && (
        <View style={s.podium}>
          {/* 2nd */}
          {top3[1] && (
            <View style={[s.podiumItem, s.podiumSecond]}>
              <Text style={s.podiumMedal}>{MEDAL[1]}</Text>
              <Image source={{ uri: top3[1].avatar }} style={s.podiumAvatar} />
              <Text style={s.podiumName} numberOfLines={1}>{top3[1].name}</Text>
              <Text style={s.podiumXp}>{top3[1].xp} XP</Text>
              <View style={[s.podiumBar, { height: 60 }]} />
            </View>
          )}
          {/* 1st */}
          {top3[0] && (
            <View style={[s.podiumItem, s.podiumFirst]}>
              <Text style={s.podiumMedal}>{MEDAL[0]}</Text>
              <Image source={{ uri: top3[0].avatar }} style={[s.podiumAvatar, s.podiumAvatarFirst]} />
              <Text style={s.podiumName} numberOfLines={1}>{top3[0].name}</Text>
              <Text style={s.podiumXp}>{top3[0].xp} XP</Text>
              <View style={[s.podiumBar, { height: 90, backgroundColor: colors.primary }]} />
            </View>
          )}
          {/* 3rd */}
          {top3[2] && (
            <View style={[s.podiumItem, s.podiumThird]}>
              <Text style={s.podiumMedal}>{MEDAL[2]}</Text>
              <Image source={{ uri: top3[2].avatar }} style={s.podiumAvatar} />
              <Text style={s.podiumName} numberOfLines={1}>{top3[2].name}</Text>
              <Text style={s.podiumXp}>{top3[2].xp} XP</Text>
              <View style={[s.podiumBar, { height: 45 }]} />
            </View>
          )}
        </View>
      )}

      {/* Full table */}
      <View style={s.tableWrap}>
        <View style={s.tableHeader}>
          <Text style={[s.tableHeadText, { width: 30 }]}>#</Text>
          <Text style={[s.tableHeadText, { flex: 2 }]}>STUDENT</Text>
          <Text style={[s.tableHeadText, { flex: 1.5 }]}>TITLE</Text>
          <Text style={[s.tableHeadText, { flex: 1, textAlign: 'right' }]}>XP</Text>
        </View>
        {entries.map((entry, i) => {
          const isMe = entry.user_id === user?.id;
          return (
            <View key={entry.id || i} style={[s.row, isMe && s.rowMe]}>
              <View style={{ width: 30 }}>
                {i < 3 ? <Text style={{ fontSize: 14 }}>{MEDAL[i]}</Text> : <Text style={s.rowRank}>{i + 1}</Text>}
              </View>
              <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Image source={{ uri: entry.avatar }} style={s.rowAvatar} />
                <Text style={[s.rowName, isMe && { color: colors.primary }]} numberOfLines={1}>{entry.name}{isMe ? ' (You)' : ''}</Text>
              </View>
              <View style={{ flex: 1.5 }}>
                <Text style={s.rowTitle} numberOfLines={1}>{entry.title || `Level ${entry.level}`}</Text>
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={s.rowXp}>{entry.xp.toLocaleString()}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: 140 },
  center: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  title: { color: colors.foreground, fontSize: typography.xl, fontWeight: '800' },
  subtitle: { color: colors.muted, fontSize: typography.xs, marginTop: 2 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.green + '15', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.green },
  liveText: { color: colors.green, fontSize: 11, fontWeight: '600' },
  errorIcon: { fontSize: 48 },
  errorTitle: { color: colors.foreground, fontSize: typography.lg, fontWeight: '700' },
  errorText: { color: colors.muted, fontSize: typography.sm, textAlign: 'center', paddingHorizontal: spacing.lg },
  retryBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.md },
  retryBtnText: { color: '#fff', fontWeight: '700' },
  
  myRankCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.primary + '10', borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.primary + '30' },
  myRankNum: { color: colors.primary, fontSize: typography.base, fontWeight: '800', width: 28 },
  myRankAvatar: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  myRankAvatarTxt: { color: '#fff', fontSize: 10, fontWeight: '900' },
  myRankName: { color: colors.foreground, fontSize: typography.sm, fontWeight: '700' },
  myRankTitle: { color: colors.muted, fontSize: 11 },
  myRankLabel: { color: colors.primary, fontSize: 11, fontWeight: '600' },
  
  podium: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md, backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  podiumItem: { alignItems: 'center', flex: 1 },
  podiumFirst: {},
  podiumSecond: {},
  podiumThird: {},
  podiumMedal: { fontSize: 20, marginBottom: 8 },
  podiumAvatar: { width: 48, height: 48, borderRadius: 16, borderWidth: 2, borderColor: colors.border, marginBottom: 8 },
  podiumAvatarFirst: { width: 64, height: 64, borderRadius: 20, borderColor: colors.primary },
  podiumName: { color: colors.foreground, fontSize: typography.xs, fontWeight: '700', textAlign: 'center' },
  podiumXp: { color: colors.primary, fontSize: 11, fontWeight: '600', marginBottom: 6 },
  podiumBar: { width: '80%', backgroundColor: colors.background, borderTopLeftRadius: 8, borderTopRightRadius: 8, borderWidth: 1, borderColor: colors.border },
  
  tableWrap: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', backgroundColor: colors.background, paddingVertical: 10, paddingHorizontal: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  tableHeadText: { color: colors.muted, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowMe: { backgroundColor: colors.primary + '10' },
  rowRank: { color: colors.muted, fontSize: typography.xs, fontWeight: '600' },
  rowAvatar: { width: 28, height: 28, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  rowName: { color: colors.foreground, fontSize: typography.xs, fontWeight: '600' },
  rowTitle: { color: colors.muted, fontSize: 10 },
  rowXp: { color: colors.foreground, fontSize: typography.xs, fontWeight: '700' },
});
