import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Dimensions,
  TextInput, Modal, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LineChart } from 'react-native-chart-kit';
import { colors, spacing, radius, typography } from '../lib/theme';
import { getGPARecords, createGPARecord, deleteGPARecord } from '../services/gpa';
import { GPARecord } from '../types';

const GPA_CLASS = (gpa: number) => {
  if (gpa >= 4.5) return 'First Class';
  if (gpa >= 3.5) return 'Second Upper';
  if (gpa >= 2.4) return 'Second Lower';
  if (gpa >= 1.5) return 'Third Class';
  return 'Pass';
};

export default function GPAScreen() {
  const insets = useSafeAreaInsets();
  const [records, setRecords] = useState<GPARecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [semester, setSemester] = useState('');
  const [gpa, setGpa] = useState('');
  const [credits, setCredits] = useState('');
  const [courses, setCourses] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try { setRecords(await getGPARecords()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);

  const chartData = [...records].reverse().map((r, i) => ({
    sem: r.semester?.split(' ').slice(-2).join(' ') || `Sem ${i + 1}`,
    gpa: Number(r.gpa)
  }));
  
  const cumGPA = records.length > 0 ? (records.reduce((a, r) => a + Number(r.gpa), 0) / records.length).toFixed(2) : '0.00';
  const totalCreditsAll = records.reduce((a, r) => a + r.totalCredits, 0);

  const handleSave = async () => {
    if (!semester || !gpa) { Alert.alert('Error', 'Semester and GPA required'); return; }
    const g = parseFloat(gpa);
    if (isNaN(g) || g < 0 || g > 5) { Alert.alert('Error', 'GPA must be between 0 and 5'); return; }
    setSaving(true);
    try {
      const record = await createGPARecord({
        semester, gpa: g,
        totalCredits: parseInt(credits) || 0,
        courses: courses.split(',').map(c => c.trim()).filter(Boolean),
        class: GPA_CLASS(g),
      });
      setRecords(prev => [record, ...prev]);
      setShowAdd(false); setSemester(''); setGpa(''); setCredits(''); setCourses('');
    } catch { Alert.alert('Error', 'Failed to save GPA record'); }
    finally { setSaving(false); }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete', 'Remove this GPA record?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await deleteGPARecord(id).catch(() => {});
        setRecords(prev => prev.filter(r => r.id !== id));
      }},
    ]);
  };

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ padding: 20, gap: 12 }}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {[0,1,2].map(i => (
            <View key={i} style={{ flex: 1, height: 80, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 8 }}>
              <View style={{ width: '80%', height: 22, borderRadius: 6, backgroundColor: colors.border, opacity: 0.4 }} />
              <View style={{ width: '60%', height: 10, borderRadius: 4, backgroundColor: colors.border, opacity: 0.25 }} />
            </View>
          ))}
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

  return (
    <View style={s.root}>
      <View style={[s.header, { paddingTop: insets.top + spacing.sm }]}>
        <Text style={s.title}>GPA Tracker</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => setShowAdd(true)}>
          <Text style={s.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
      >
        {/* Summary */}
        {records.length > 0 && (
          <View style={s.summaryRow}>
            <View style={[s.summaryCard, { backgroundColor: colors.primary, borderColor: colors.primary }]}>
              <Text style={[s.summaryValue, { color: '#fff' }]}>{cumGPA}</Text>
              <Text style={[s.summaryLabel, { color: '#fff', opacity: 0.8 }]}>Cumulative GPA</Text>
              <Text style={[s.summaryClass, { color: '#fff' }]}>{GPA_CLASS(parseFloat(cumGPA))}</Text>
            </View>
            <View style={s.summaryCard}>
              <Text style={[s.summaryValue, { color: colors.foreground }]}>{totalCreditsAll}</Text>
              <Text style={s.summaryLabel}>Total Credits</Text>
              <Text style={s.summaryClass}>Across semesters</Text>
            </View>
            <View style={s.summaryCard}>
              <Text style={[s.summaryValue, { color: colors.foreground }]}>{records.length}</Text>
              <Text style={s.summaryLabel}>Semesters</Text>
              <Text style={s.summaryClass}>Logged</Text>
            </View>
          </View>
        )}

        {/* Chart */}
        <View style={s.chartCard}>
          <View style={s.chartHeader}>
            <Text style={s.chartTitle}>GPA Trajectory</Text>
            <Text style={s.chartSub}>All semesters</Text>
          </View>
          {chartData.length > 0 ? (
            <LineChart
              data={{
                labels: chartData.map(d => d.sem.substring(0, 5) + '...'),
                datasets: [{ data: chartData.map(d => d.gpa) }]
              }}
              width={Dimensions.get('window').width - (spacing.md * 4)}
              height={180}
              withInnerLines={false}
              withOuterLines={false}
              yAxisInterval={1}
              chartConfig={{
                backgroundColor: colors.card,
                backgroundGradientFrom: colors.card,
                backgroundGradientTo: colors.card,
                decimalPlaces: 2,
                color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`, // primary color
                labelColor: (opacity = 1) => colors.muted,
                style: { borderRadius: 16 },
                propsForDots: { r: '4', strokeWidth: '2', stroke: colors.primary }
              }}
              bezier
              style={{ marginVertical: 8, borderRadius: 16, marginLeft: -10 }}
            />
          ) : (
            <View style={s.chartEmpty}>
              <Text style={s.emptyText}>Add records to see your trajectory</Text>
            </View>
          )}
        </View>

        {/* Records */}
        <Text style={s.chartTitle}>Academic History</Text>
        {records.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>🎓</Text>
            <Text style={s.emptyTitle}>No GPA records yet</Text>
            <Text style={s.emptyText}>Track your academic performance each semester</Text>
          </View>
        ) : records.map(record => (
          <View key={record.id} style={s.recordCard}>
            <View style={s.recordHeader}>
              <View>
                <Text style={s.recordSemester}>{record.semester}</Text>
                <Text style={s.recordClass}>{record.class}</Text>
              </View>
              <View style={s.recordRight}>
                <Text style={[s.recordGpa, { color: Number(record.gpa || 0) >= 3.5 ? colors.green : Number(record.gpa || 0) >= 2.4 ? colors.primary : colors.red }]}>
                  {Number(record.gpa || 0).toFixed(2)}
                </Text>
                <TouchableOpacity onPress={() => handleDelete(record.id)}>
                  <Text style={s.deleteText}>🗑</Text>
                </TouchableOpacity>
              </View>
            </View>
            {record.totalCredits > 0 && <Text style={s.recordCredits}>{record.totalCredits} credits</Text>}
            {record.courses.length > 0 && (
              <View style={s.courseTags}>
                {record.courses.slice(0, 5).map(c => (
                  <View key={c} style={s.tag}><Text style={s.tagText}>{c}</Text></View>
                ))}
              </View>
            )}
            {/* GPA bar */}
            <View style={s.gpaTrack}>
              <View style={[s.gpaFill, { width: `${(Number(record.gpa || 0) / 5) * 100}%`, backgroundColor: Number(record.gpa || 0) >= 3.5 ? colors.green : Number(record.gpa || 0) >= 2.4 ? colors.primary : colors.red }]} />
            </View>
          </View>
        ))}
      </ScrollView>

      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet">
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Add GPA Record</Text>
            <TouchableOpacity onPress={() => { setShowAdd(false); setSemester(''); setGpa(''); setCredits(''); setCourses(''); }}>
              <Text style={s.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={s.modalContent}>
            <Text style={s.label}>Semester</Text>
            <TextInput style={s.input} value={semester} onChangeText={setSemester} placeholder="e.g. 2024/2025 First Semester" placeholderTextColor={colors.muted} />
            <Text style={s.label}>GPA (0 - 5)</Text>
            <TextInput style={s.input} value={gpa} onChangeText={setGpa} placeholder="e.g. 4.2" placeholderTextColor={colors.muted} keyboardType="decimal-pad" />
            <Text style={s.label}>Total Credits (optional)</Text>
            <TextInput style={s.input} value={credits} onChangeText={setCredits} placeholder="e.g. 18" placeholderTextColor={colors.muted} keyboardType="numeric" />
            <Text style={s.label}>Courses (comma-separated, optional)</Text>
            <TextInput style={[s.input, { minHeight: 80 }]} value={courses} onChangeText={setCourses} placeholder="e.g. CSC301, MTH201, PHY201" placeholderTextColor={colors.muted} multiline />
            <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>Save Record</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.card },
  title: { color: colors.foreground, fontSize: typography.lg, fontWeight: '800' },
  addBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md },
  addBtnText: { color: '#fff', fontSize: typography.sm, fontWeight: '700' },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: 140 },
  summaryRow: { flexDirection: 'row', gap: spacing.sm },
  summaryCard: { flex: 1, backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.sm, alignItems: 'center', borderWidth: 1, borderColor: colors.border, justifyContent: 'center' },
  summaryValue: { color: colors.primary, fontSize: typography['2xl'], fontWeight: '800' },
  summaryLabel: { color: colors.muted, fontSize: 10, marginTop: 4, textTransform: 'uppercase', fontWeight: '600' },
  summaryClass: { color: colors.muted, fontSize: 10, marginTop: 2 },
  chartCard: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  chartTitle: { color: colors.foreground, fontSize: typography.base, fontWeight: '700' },
  chartSub: { color: colors.muted, fontSize: 11 },
  chartEmpty: { height: 180, alignItems: 'center', justifyContent: 'center' },
  recordCard: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border, gap: spacing.sm },
  recordHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  recordSemester: { color: colors.foreground, fontSize: typography.sm, fontWeight: '700' },
  recordClass: { color: colors.muted, fontSize: typography.xs, marginTop: 2 },
  recordRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  recordGpa: { fontSize: typography['2xl'], fontWeight: '900' },
  deleteText: { fontSize: 16 },
  recordCredits: { color: colors.muted, fontSize: typography.xs },
  courseTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { backgroundColor: colors.background, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: colors.border },
  tagText: { color: colors.muted, fontSize: 11 },
  gpaTrack: { height: 4, backgroundColor: colors.border, borderRadius: radius.full, overflow: 'hidden' },
  gpaFill: { height: '100%', borderRadius: radius.full },
  empty: { alignItems: 'center', padding: spacing.xxl },
  emptyIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: { color: colors.foreground, fontSize: typography.lg, fontWeight: '700', marginBottom: spacing.sm },
  emptyText: { color: colors.muted, fontSize: typography.sm, textAlign: 'center' },
  modal: { flex: 1, backgroundColor: colors.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { color: colors.foreground, fontSize: typography.xl, fontWeight: '800' },
  modalClose: { color: colors.muted, fontSize: typography.xl },
  modalContent: { padding: spacing.lg, gap: spacing.sm, paddingBottom: 140 },
  label: { color: colors.muted, fontSize: typography.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  input: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, color: colors.foreground, fontSize: typography.base, borderWidth: 1, borderColor: colors.border },
  saveBtn: { backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.md, alignItems: 'center', marginTop: spacing.md },
  saveBtnText: { color: '#fff', fontSize: typography.base, fontWeight: '700' },
});
