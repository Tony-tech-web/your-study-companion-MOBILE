import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { colors, spacing, radius, typography } from '../lib/theme';
import { getDocuments, deleteDocument } from '../services/documents';
import { supabase } from '../lib/supabase';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Document } from '../types';

export default function CoursesScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [pdfs, setPdfs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const data = await getDocuments();
      setPdfs(data);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
      if (result.canceled) return;
      
      const file = result.assets[0];
      if (!file.name.toLowerCase().endsWith('.pdf') && file.mimeType !== 'application/pdf') {
        Alert.alert('Error', 'Only PDF files are allowed');
        return;
      }
      if (file.size && file.size > 50 * 1024 * 1024) {
        Alert.alert('Error', 'File too large (max 50MB)');
        return;
      }

      setUploading(true);
      
      const filePath = `${user?.id}/${Date.now()}_${file.name.replace(/\\s+/g, '_')}`;
      const fileData = await fetch(file.uri).then(r => r.arrayBuffer());

      const { error: uploadErr } = await supabase.storage
        .from('student-pdfs')
        .upload(filePath, fileData, { contentType: 'application/pdf', upsert: false });

      if (uploadErr) throw new Error(uploadErr.message);

      const res = await api.post('/api/pdfs', {
        file_name: file.name,
        file_path: filePath,
        file_size: file.size || 0,
      });

      setPdfs(prev => [{
        id: res.data.id,
        name: res.data.file_name,
        uploadedAt: new Date(res.data.uploaded_at).toLocaleDateString(),
        size: res.data.file_size || '0KB',
        category: 'General',
        totalPages: res.data.total_pages || 0,
        scannedPages: res.data.scanned_pages || 0,
      }, ...prev]);

    } catch (err: any) {
      Alert.alert('Upload Failed', err.message || 'Something went wrong');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (doc: Document) => {
    Alert.alert('Delete PDF', `Remove "${doc.name}" from your library?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          // Note: Full frontend deletes from storage too, we would need file_path, but our `Document` type lacks it.
          // The backend `/api/pdfs/:id` usually handles its own DB removal. If we need to remove from storage,
          // we should ideally add filePath to the type, or let the backend do it.
          // For now we just call deleteDocument.
          await deleteDocument(doc.id);
          setPdfs(prev => prev.filter(p => p.id !== doc.id));
        } catch {
          Alert.alert('Error', 'Failed to delete document');
        }
      }}
    ]);
  };

  return (
    <View style={s.root}>
      <View style={[s.header, { paddingTop: insets.top + spacing.sm }]}>
        <View>
          <Text style={s.title}>Course Materials</Text>
          <Text style={s.subtitle}>{pdfs.length} PDF{pdfs.length !== 1 ? 's' : ''} in your library</Text>
        </View>
        <TouchableOpacity style={s.uploadBtn} onPress={handleUpload} disabled={uploading}>
          {uploading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.uploadBtnText}>+ Upload</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
      >
        <View style={s.infoBox}>
          <Text style={s.infoBoxTitle}>Use PDFs in AI Assistant</Text>
          <Text style={s.infoBoxText}>Go to Orbit AI to teach from or test yourself on these materials.</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : pdfs.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>📚</Text>
            <Text style={s.emptyTitle}>Your library is empty</Text>
            <Text style={s.emptyText}>Upload your first PDF to get started</Text>
          </View>
        ) : (
          <View style={s.list}>
            {pdfs.map((doc, i) => (
              <View key={doc.id || i} style={s.row}>
                <View style={s.iconWrap}>
                  <Text style={{ fontSize: 16 }}>📄</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.rowTitle} numberOfLines={1}>{doc.name}</Text>
                  <Text style={s.rowSub}>
                    {doc.uploadedAt} · {doc.scannedPages > 0 ? `${doc.scannedPages}/${doc.totalPages} pages scanned` : 'Ready to scan'}
                  </Text>
                </View>
                <TouchableOpacity style={s.deleteBtn} onPress={() => handleDelete(doc)}>
                  <Text style={s.deleteBtnText}>🗑</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.card },
  title: { color: colors.foreground, fontSize: typography.lg, fontWeight: '800' },
  subtitle: { color: colors.muted, fontSize: typography.xs, marginTop: 2 },
  uploadBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 8, minWidth: 80, alignItems: 'center' },
  uploadBtnText: { color: '#fff', fontSize: typography.sm, fontWeight: '700' },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: 140 },
  infoBox: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.primary + '30' },
  infoBoxTitle: { color: colors.foreground, fontSize: typography.sm, fontWeight: '700' },
  infoBoxText: { color: colors.muted, fontSize: typography.xs, marginTop: 4 },
  empty: { alignItems: 'center', padding: spacing.xxl },
  emptyIcon: { fontSize: 48, marginBottom: spacing.md, opacity: 0.8 },
  emptyTitle: { color: colors.foreground, fontSize: typography.base, fontWeight: '700', marginBottom: 4 },
  emptyText: { color: colors.muted, fontSize: typography.sm, textAlign: 'center' },
  list: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, gap: spacing.sm },
  iconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.red + '15', alignItems: 'center', justifyContent: 'center' },
  rowTitle: { color: colors.foreground, fontSize: typography.sm, fontWeight: '600' },
  rowSub: { color: colors.muted, fontSize: typography.xs, marginTop: 2 },
  deleteBtn: { padding: spacing.sm },
  deleteBtnText: { fontSize: 16 },
});
