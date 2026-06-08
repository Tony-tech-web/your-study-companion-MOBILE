import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Image, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { colors, spacing, radius, typography } from '../lib/theme';
import { getLeaderboard, LeaderboardResult } from '../services/leaderboard';
import { useAuth } from '../contexts/AuthContext';



export default function LeaderboardScreen() {
  const { user } = useAuth();
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
      <View style={s.trophyIcon}><Text style={s.trophyText}>Ranks</Text></View>
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
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
    >
      <Text style={s.title}>Leaderboard</Text>

      {/* My rank card */}
      {myRank && (
        <View style={s.myRankCard}>
          <Text style={s.myRankLabel}>Your Rank</Text>
          <View style={s.myRankRow}>
            <Text style={s.myRankNum}>#{myRank.rank}</Text>
            <View>
              <Text style={s.myRankXp}>{myRank.xp} XP</Text>
              <Text style={s.myRankTitle}>{myRank.title}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Podium */}
      {top3.length > 0 && (
        <View style={s.podium}>
          {/* 2nd */}
          {top3[1] && (
            <View style={[s.podiumItem, s.podiumSecond]}>
              <View style={[s.medal, s.medal2]}><Text style={s.medalText}>2</Text></View>
              <Image source={{ uri: top3[1].avatar }} style={s.podiumAvatar} />
              <Text style={s.podiumName} numberOfLines={1}>{top3[1].name}</Text>
              <Text style={s.podiumXp}>{top3[1].xp} XP</Text>
              <View style={[s.podiumBar, { height: 60 }]} />
            </View>
          )}
          {/* 1st */}
          {top3[0] && (
            <View style={[s.podiumItem, s.podiumFirst]}>
              <View style={[s.medal, s.medal1]}><Text style={s.medalText}>1</Text></View>
              <Image source={{ uri: top3[0].avatar }} style={[s.podiumAvatar, s.podiumAvatarFirst]} />
              <Text style={s.podiumName} numberOfLines={1}>{top3[0].name}</Text>
              <Text style={s.podiumXp}>{top3[0].xp} XP</Text>
              <View style={[s.podiumBar, { height: 90, backgroundColor: colors.primary }]} />
            </View>
          )}
          {/* 3rd */}
          {top3[2] && (
            <View style={[s.podiumItem, s.podiumThird]}>
              <View style={[s.medal, s.medal3]}><Text style={s.medalText}>3</Text></View>
              <Image source={{ uri: top3[2].avatar }} style={s.podiumAvatar} />
              <Text style={s.podiumName} numberOfLines={1}>{top3[2].name}</Text>
              <Text style={s.podiumXp}>{top3[2].xp} XP</Text>
              <View style={[s.podiumBar, { height: 45 }]} />
            </View>
          )}
        </View>
      )}

      {/* Rest of leaderboard */}
      {rest.map((entry, i) => {
        const isMe = entry.user_id === user?.id;
        return (
          <View key={entry.id} style={[s.row, isMe && s.rowMe]}>
            <Text style={s.rowRank}>#{entry.rank}</Text>
            <Image source={{ uri: entry.avatar }} style={s.rowAvatar} />
            <View style={{ flex: 1 }}>
              <Text style={s.rowName}>{entry.name}{isMe ? ' (You)' : ''}</Text>
              <Text style={s.rowTitle}>{entry.title || `Level ${entry.level}`}</Text>
            </View>
            <Text style={s.rowXp}>{entry.xp} XP</Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: 130 },
  center: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  title: { color: colors.foreground, fontSize: typography['2xl'], fontWeight: '800' },

  errorTitle: { color: colors.foreground, fontSize: typography.lg, fontWeight: '700' },
  errorText: { color: colors.muted, fontSize: typography.sm, textAlign: 'center', paddingHorizontal: spacing.lg },
  trophyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  trophyText: { color: "#fff", fontSize: typography.xl, fontWeight: "900" },
  medal: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  medal1: { backgroundColor: colors.primary },
  medal2: { backgroundColor: "#94a3b8" },
  medal3: { backgroundColor: "#b45309" },
  medalText: { color: "#fff", fontSize: 11, fontWeight: "900" },
  retryBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.md },
  retryBtnText: { color: colors.onPrimary, fontWeight: '700' },
  myRankCard: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.primary + '50' },
  myRankLabel: { color: colors.muted, fontSize: typography.xs, marginBottom: spacing.sm },
  myRankRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  myRankNum: { color: colors.primary, fontSize: typography['3xl'], fontWeight: '900' },
  myRankXp: { color: colors.foreground, fontSize: typography.lg, fontWeight: '700' },
  myRankTitle: { color: colors.muted, fontSize: typography.xs },
  podium: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  podiumItem: { alignItems: 'center', flex: 1 },
  podiumFirst: {},
  podiumSecond: {},
  podiumThird: {},
  podiumMedal: { fontSize: 24, marginBottom: 4 },
  podiumAvatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: colors.border, marginBottom: 4 },
  podiumAvatarFirst: { width: 60, height: 60, borderRadius: 30, borderColor: colors.primary },
  podiumName: { color: colors.foreground, fontSize: typography.xs, fontWeight: '700', textAlign: 'center' },
  podiumXp: { color: colors.primary, fontSize: 10, fontWeight: '600', marginBottom: 4 },
  podiumBar: { width: '100%', backgroundColor: colors.card, borderTopLeftRadius: 4, borderTopRightRadius: 4, borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  rowMe: { borderColor: colors.primary },
  rowRank: { color: colors.muted, fontSize: typography.sm, fontWeight: '700', width: 32 },
  rowAvatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.border },
  rowName: { color: colors.foreground, fontSize: typography.sm, fontWeight: '600' },
  rowTitle: { color: colors.muted, fontSize: typography.xs, marginTop: 1 },
  rowXp: { color: colors.primary, fontSize: typography.sm, fontWeight: '700' },
});
