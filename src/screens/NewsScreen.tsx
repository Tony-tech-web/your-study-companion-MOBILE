import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, RefreshControl } from 'react-native';
import { spacing, radius } from '../lib/theme';
import { getNews } from '../services/news';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMobileTheme } from '../contexts/ThemeContext';

interface NewsItem { id: string; title: string; date: string; image: string; category: string; excerpt: string; }

const SkeletonCard = ({ s }: { s: ReturnType<typeof styles> }) => (
  <View style={s.skeletonCard}>
    <View style={[s.skeletonImg, { opacity: 0.15 }]} />
    <View style={s.skeletonBody}>
      <View style={[s.skeletonLine, { width: '30%', height: 10 }]} />
      <View style={[s.skeletonLine, { width: '90%', height: 14, marginTop: 6 }]} />
      <View style={[s.skeletonLine, { width: '70%', height: 14, marginTop: 4 }]} />
      <View style={[s.skeletonLine, { width: '50%', height: 10, marginTop: 8 }]} />
    </View>
  </View>
);

export default function NewsScreen() {
  const { colors } = useMobileTheme();
  const s = styles(colors);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');

  const categories = ['All', 'Academic', 'Events', 'Research', 'General'];

  const load = async (refresh = false) => {
    try {
      const data = await getNews();
      setNews(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = activeCategory === 'All' ? news : news.filter(n => n.category?.toLowerCase() === activeCategory.toLowerCase());

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>Campus News</Text>
          <Text style={s.sub}>{news.length} articles from Elizade University</Text>
        </View>
        <View style={s.liveBadge}>
          <View style={s.liveDot} />
          <Text style={s.liveText}>Live</Text>
        </View>
      </View>

      {/* Category tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.categoryRow}>
        {categories.map(cat => (
          <TouchableOpacity key={cat} onPress={() => setActiveCategory(cat)}
            style={[s.catBtn, activeCategory === cat && s.catBtnActive]}>
            <Text style={[s.catText, activeCategory === cat && s.catTextActive]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor={colors.primary} />}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 130, gap: 12 }}>
        {loading
          ? [0, 1, 2, 3].map(i => <SkeletonCard key={i} s={s} />)
          : filtered.map((item, i) => (
            <TouchableOpacity key={item.id} style={s.card} activeOpacity={0.85}>
              <Image source={{ uri: item.image }} style={s.cardImg} resizeMode="cover"
                defaultSource={{ uri: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400&q=60' }} />
              <View style={s.cardBody}>
                <View style={s.catTag}><Text style={s.catTagText}>{item.category}</Text></View>
                <Text style={s.cardTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={s.cardExcerpt} numberOfLines={2}>{item.excerpt}</Text>
                <Text style={s.cardDate}>{item.date}</Text>
              </View>
            </TouchableOpacity>
          ))
        }
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingTop: 8, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  title: { fontSize: 20, fontWeight: '800', color: colors.foreground, letterSpacing: -0.5 },
  sub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(16,185,129,0.1)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10b981' },
  liveText: { fontSize: 11, fontWeight: '600', color: '#10b981' },
  categoryRow: { paddingHorizontal: spacing.md, paddingVertical: 10, gap: 8 },
  catBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  catBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  catText: { fontSize: 12, fontWeight: '600', color: colors.muted },
  catTextActive: { color: '#fff' },
  card: { backgroundColor: colors.card, borderRadius: radius.xl, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  cardImg: { width: '100%', height: 160, backgroundColor: colors.input },
  cardBody: { padding: 14, gap: 6 },
  catTag: { alignSelf: 'flex-start', backgroundColor: colors.primary + '18', borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  catTagText: { fontSize: 10, fontWeight: '700', color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.foreground, lineHeight: 21, letterSpacing: -0.2 },
  cardExcerpt: { fontSize: 12, color: colors.muted, lineHeight: 18 },
  cardDate: { fontSize: 11, color: colors.muted, opacity: 0.6 },
  // Skeleton
  skeletonCard: { backgroundColor: colors.card, borderRadius: radius.xl, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  skeletonImg: { width: '100%', height: 140, backgroundColor: colors.border },
  skeletonBody: { padding: 14, gap: 4 },
  skeletonLine: { backgroundColor: colors.border, borderRadius: 4, opacity: 0.5 },
});
