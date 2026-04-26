import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius, typography } from '../../lib/theme';
import { getDocuments } from '../../services/documents';
import { callEdgeFunction } from '../../lib/supabase';
import { Document } from '../../types';

interface LibraryPanelProps {
  visible: boolean;
  onClose: () => void;
  onPdfsExtracted: (text: string, pages: string[], pdfs: Document[]) => void;
}

export default function LibraryPanel({ visible, onClose, onPdfsExtracted }: LibraryPanelProps) {
  const insets = useSafeAreaInsets();
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [extracting, setExtracting] = useState(false);
  const [progressText, setProgressText] = useState('');

  useEffect(() => {
    if (visible) loadDocs();
  }, [visible]);

  const loadDocs = async () => {
    setLoading(true);
    try {
      const data = await getDocuments();
      setDocs(data);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to load library');
    } finally {
      setLoading(false);
    }
  };

  const toggleDoc = (id: string) => {
    const next = new Set(selectedDocs);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedDocs(next);
  };

  const handleExtract = async () => {
    if (selectedDocs.size === 0) return;
    setExtracting(true);
    setProgressText('Extracting text from documents...');
    
    let combinedText = '';
    let allPages: string[] = [];
    const selectedPdfs = docs.filter(d => selectedDocs.has(d.id));

    try {
      for (const pdf of selectedPdfs) {
        setProgressText(`Reading ${pdf.name}...`);
        
        // Ensure path logic works depending on how it's saved. Typically it's user_id/filename
        const filePath = pdf.filePath || pdf.file_path; 
        
        const res = await callEdgeFunction('parse-pdf', { filePath });
        if (!res.ok) throw new Error('Failed to parse PDF on server');
        
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        
        combinedText += `\\n\\n--- Document: ${pdf.name} ---\\n\\n${data.text}`;
        allPages = [...allPages, ...(data.pages || [])];
      }
      
      onPdfsExtracted(combinedText.trim(), allPages, selectedPdfs);
      onClose();
    } catch (e: any) {
      Alert.alert('Extraction Error', e.message || 'Failed to read documents');
    } finally {
      setExtracting(false);
      setProgressText('');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[s.root, { paddingBottom: insets.bottom }]}>
        <View style={s.header}>
          <Text style={s.title}>📚 Library Panel</Text>
          <TouchableOpacity onPress={onClose} style={s.closeBtn}>
            <Text style={s.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.subtitle}>Select study materials to give Orbit AI context.</Text>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
        ) : docs.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>📂</Text>
            <Text style={s.emptyText}>No PDFs found. Upload some in the Courses tab.</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={s.list}>
            {docs.map(doc => {
              const isSelected = selectedDocs.has(doc.id);
              return (
                <TouchableOpacity 
                  key={doc.id} 
                  style={[s.card, isSelected && s.cardSelected]} 
                  onPress={() => toggleDoc(doc.id)}
                >
                  <View style={s.cardLeft}>
                    <Text style={s.cardIcon}>📄</Text>
                    <View>
                      <Text style={s.docName}>{doc.name}</Text>
                      <Text style={s.docMeta}>{doc.totalPages} pages · {doc.size}</Text>
                    </View>
                  </View>
                  <View style={[s.checkbox, isSelected && s.checkboxChecked]}>
                    {isSelected && <Text style={s.checkMark}>✓</Text>}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Action Bottom Bar */}
        <View style={s.footer}>
          <TouchableOpacity 
            style={[s.extractBtn, (selectedDocs.size === 0 || extracting) && s.extractBtnDisabled]} 
            onPress={handleExtract}
            disabled={selectedDocs.size === 0 || extracting}
          >
            {extracting ? (
              <View style={s.row}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={s.extractBtnText}>{progressText}</Text>
              </View>
            ) : (
              <Text style={s.extractBtnText}>
                Import {selectedDocs.size} Document{selectedDocs.size !== 1 ? 's' : ''}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { color: colors.foreground, fontSize: typography.lg, fontWeight: '800' },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: colors.muted, fontSize: 16, fontWeight: '600' },
  subtitle: { color: colors.muted, fontSize: typography.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  
  list: { padding: spacing.lg, gap: spacing.md },
  card: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  cardSelected: { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cardIcon: { fontSize: 24 },
  docName: { color: colors.foreground, fontSize: typography.sm, fontWeight: '600', marginBottom: 2 },
  docMeta: { color: colors.muted, fontSize: typography.xs },
  
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkMark: { color: '#fff', fontSize: 14, fontWeight: '800', marginTop: -2 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  emptyIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyText: { color: colors.muted, fontSize: typography.sm, textAlign: 'center' },

  footer: { padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.card },
  extractBtn: { backgroundColor: colors.primary, padding: spacing.md, borderRadius: radius.lg, alignItems: 'center' },
  extractBtnDisabled: { opacity: 0.5 },
  extractBtnText: { color: '#fff', fontSize: typography.base, fontWeight: '700', marginLeft: 8 },
  row: { flexDirection: 'row', alignItems: 'center' },
});
