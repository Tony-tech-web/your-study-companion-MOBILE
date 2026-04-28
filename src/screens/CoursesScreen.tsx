import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, RefreshControl, ActivityIndicator,
} from 'react-native';
import { colors, spacing, radius, typography } from '../lib/theme';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { SafeAreaView } from 'react-native-safe-area-context';

interface PDF {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  uploaded_at: string;
}

const formatSize = (bytes: number | null) => {
  if (!bytes) return 'Unknown';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export default function CoursesScreen() {
  const { user } = useAuth();
  const [pdfs, setPdfs] = useState<PDF[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try { setPdfs((await api.get('/api/pdfs')).data); }
    catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = (pdf: PDF) => {
    Alert.alert('Delete PDF', `Remove "${pdf.file_name}" from your library?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await api.delete(`/api/pdfs/${pdf.id}`);
            setPdfs(prev => prev.filter(p => p.id !== pdf.id));
          } catch { Alert.alert('Error', 'Failed to delete PDF'); }
        }
      },
    ]);
  };

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ padding: 20, gap: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <View style={{ width: 150, height: 22, borderRadius: 6, backgroundColor: colors.border, opacity: 0.4 }} />
          <View style={{ width: 70, height: 34, borderRadius: 10, backgroundColor: colors.border, opacity: 0.3 }} />
        </View>
        {[0, 1, 2, 3].map(i => (
          <View key={i} style={{ backgroundColor: colors.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: colors.border, opacity: 0.4 }} />
            <View style={{ flex: 1, gap: 6 }}>
              <View style={{ width: '70%', height: 13, borderRadius: 4, backgroundColor: colors.border, opacity: 0.4 }} />
              <View style={{ width: '45%', height: 10, borderRadius: 4, backgroundColor: colors.border, opacity: 0.25 }} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>Course Materials</Text>
          <Text style={s.sub}>{pdfs.length} PDF{pdfs.length !== 1 ? 's' : ''} in your library</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}>

        {/* Upload hint card */}
        <View style={s.uploadHint}>
          <View style={s.uploadIconWrap}>
            <Text style={s.uploadIconText}>+</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.uploadTitle}>Upload PDFs from the web app</Text>
            <Text style={s.uploadDesc}>Visit Orbit on your browser to upload course materials. They'll appear here automatically.</Text>
          </View>
        </View>

        {/* AI hint */}
        <View style={s.aiHint}>
          <View style={s.aiHintDot} />
          <Text style={s.aiHintText}>PDFs uploaded here are available in Orbit AI — use Teach mode to learn from them</Text>
        </View>

        {/* PDF list */}
        {pdfs.length === 0 ? (
          <View style={s.empty}>
            <View style={s.emptyIcon}><Text style={s.emptyIconChar}>C</Text></View>
            <Text style={s.emptyTitle}>No PDFs yet</Text>
            <Text style={s.emptyDesc}>Upload your course materials from the web app to see them here</Text>
          </View>
        ) : pdfs.map(pdf => (
          <TouchableOpacity key={pdf.id} style={s.pdfCard} activeOpacity={0.8}
            onLongPress={() => handleDelete(pdf)}>
            <View style={s.pdfIcon}>
              <Text style={s.pdfIconText}>PDF</Text>
            </View>
            <View style={s.pdfInfo}>
              <Text style={s.pdfName} numberOfLines={1}>{pdf.file_name}</Text>
              <Text style={s.pdfMeta}>{formatSize(pdf.file_size)} · {formatDate(pdf.uploaded_at)}</Text>
            </View>
            <TouchableOpacity onPress={() => handleDelete(pdf)} style={s.deleteBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={s.deleteBtnText}>Remove</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))}

        {pdfs.length > 0 && (
          <Text style={s.longPressHint}>Long-press a PDF to remove it</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, backgroundColor: colors.card },
  title: { fontSize: typography.lg, fontWeight: '800', color: colors.foreground, letterSpacing: -0.3 },
  sub: { fontSize: typography.xs, color: colors.muted, marginTop: 2 },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: 120 },
  uploadHint: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.card, borderRadius: radius.xl, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  uploadIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary + '20', borderWidth: 1, borderColor: colors.primary + '40', alignItems: 'center', justifyContent: 'center', shrink: 0 },
  uploadIconText: { color: colors.primary, fontSize: 24, fontWeight: '700', lineHeight: 28 },
  uploadTitle: { color: colors.foreground, fontSize: typography.sm, fontWeight: '700', marginBottom: 3 },
  uploadDesc: { color: colors.muted, fontSize: typography.xs, lineHeight: 16 },
  aiHint: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.primary + '10', borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.primary + '25' },
  aiHintDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary, flexShrink: 0 },
  aiHintText: { color: colors.primary, fontSize: typography.xs, flex: 1, lineHeight: 17, fontWeight: '500' },
  empty: { alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.md },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  emptyIconChar: { color: '#fff', fontSize: typography['2xl'], fontWeight: '900' },
  emptyTitle: { color: colors.foreground, fontSize: typography.lg, fontWeight: '700' },
  emptyDesc: { color: colors.muted, fontSize: typography.sm, textAlign: 'center', maxWidth: 260, lineHeight: 20 },
  pdfCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.card, borderRadius: radius.xl, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  pdfIcon: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: '#ef4444' + '18', borderWidth: 1, borderColor: '#ef4444' + '30', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  pdfIconText: { color: '#ef4444', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  pdfInfo: { flex: 1 },
  pdfName: { color: colors.foreground, fontSize: typography.sm, fontWeight: '600', marginBottom: 3 },
  pdfMeta: { color: colors.muted, fontSize: typography.xs },
  deleteBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.sm, borderWidth: 1, borderColor: '#ef4444' + '40' },
  deleteBtnText: { color: '#ef4444', fontSize: 10, fontWeight: '700' },
  longPressHint: { textAlign: 'center', color: colors.muted, fontSize: typography.xs, opacity: 0.4, marginTop: spacing.sm },
});
