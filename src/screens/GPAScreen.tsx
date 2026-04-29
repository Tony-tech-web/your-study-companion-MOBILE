import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Modal, ActivityIndicator, RefreshControl, Alert, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LineChart } from 'react-native-chart-kit';
import { colors, spacing, radius, typography } from '../lib/theme';
import { getGPARecords, createGPARecord, deleteGPARecord } from '../services/gpa';
import { GPARecord } from '../types';

const classify = (gpa: number) => {
  if (gpa >= 4.5) return 'First Class';
  if (gpa >= 3.5) return 'Second Upper';
  if (gpa >= 2.4) return 'Second Lower';
  if (gpa >= 1.5) return 'Third Class';
  return 'Pass';
};

const InlineError = ({ msg }: { msg: string }) => msg ? (
  <View style={ie.wrap}><Text style={ie.text}>{msg}</Text></View>
) : null;
const ie = StyleSheet.create({
  wrap: { backgroundColor: colors.red + '18', borderRadius: radius.sm, padding: spacing.sm, borderWidth: 1, borderColor: colors.red + '30', marginBottom: spacing.sm },
  text: { color: colors.red, fontSize: typography.xs },
});

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
  const [formError, setFormError] = useState('');

  const load = async () => {
    try { setRecords(await getGPARecords()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);

  const highest = records.length > 0 ? Math.max(...records.map(r => Number(r.gpa))) : 0;
  const average = records.length > 0 ? records.reduce((a, r) => a + Number(r.gpa), 0) / records.length : 0;
  const chartData = [...records].reverse().map(r => ({ sem: r.semester, gpa: Number(r.gpa) }));

  const resetForm = () => { setSemester(''); setGpa(''); setCredits(''); setCourses(''); setFormError(''); };

  const handleSave = async () => {
    if (!semester || !gpa) { setFormError('Semester and GPA are required'); return; }
    const g = parseFloat(gpa);
    if (isNaN(g) || g < 0 || g > 5) { setFormError('GPA must be between 0 and 5'); return; }
    setSaving(true); setFormError('');
    try {
      const record = await createGPARecord({
        semester, gpa: g,
        totalCredits: parseInt(credits) || 0,
        courses: courses.split(',').map(c => c.trim()).filter(Boolean),
        class: classify(g),
      });
      setRecords(prev => [record, ...prev]);
      setShowAdd(false); resetForm();
    } catch (e: any) { setFormError(e.message || 'Failed to save GPA record'); }
    finally { setSaving(false); }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Record', 'Remove this GPA record permanently?', [
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
        {[0,1,2,3].map(i => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border }}>
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.border, opacity: 0.35 }} />
            <View style={{ flex: 1, gap: 6 }}>
              <View style={{ width: '60%', height: 12, borderRadius: 4, backgroundColor: colors.border, opacity: 0.4 }} />
              <View style={{ width: '40%', height: 10, borderRadius: 4, backgroundColor: colors.border, opacity: 0.25 }} />
            </View>
          </View>
        ))}
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

      <ScrollView contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}>

        {/* Summary cards */}
        {records.length > 0 && (
          <View style={s.summaryRow}>
            <View style={[s.summaryCard, { backgroundColor: colors.primary }]}>
              <Text style={s.summaryValueLight}>{highest.toFixed(2)}</Text>
              <Text style={s.summaryLabelLight}>Highest</Text>
              <Text style={s.summaryClassLight}>{classify(highest)}</Text>
            </View>
            <View style={s.summaryCard}>
              <Text style={s.summaryValue}>{average.toFixed(2)}</Text>
              <Text style={s.summaryLabel}>Average</Text>
              <Text style={s.summaryClass}>{classify(average)}</Text>
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
            <View style={s.emptyIcon}><Text style={s.emptyIconText}>G</Text></View>
            <Text style={s.emptyTitle}>No GPA records yet</Text>
            <Text style={s.emptyText}>Track your academic performance each semester</Text>
            <TouchableOpacity style={s.emptyBtn} onPress={() => setShowAdd(true)}>
              <Text style={s.emptyBtnText}>Add First Record</Text>
            </TouchableOpacity>
          </View>
        ) : records.map(record => (
          <View key={record.id} style={s.recordCard}>
            <View style={s.recordHeader}>
              <View style={{ flex: 1 }}>
                <Text style={s.recordSemester}>{record.semester}</Text>
                <Text style={s.recordClass}>{record.class}</Text>
              </View>
              <View style={s.recordRight}>
                <Text style={[s.recordGpa, { color: record.gpa >= 3.5 ? colors.green : record.gpa >= 2.4 ? colors.primary : colors.red }]}>
                  {Number(record.gpa).toFixed(2)}
                </Text>
                <TouchableOpacity onPress={() => handleDelete(record.id)} style={s.deleteBtn}>
                  <Text style={s.deleteBtnText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
            {record.totalCredits > 0 && <Text style={s.recordCredits}>{record.totalCredits} credits</Text>}
            <View style={s.gpaTrack}>
              <View style={[s.gpaFill, {
                width: `${(Number(record.gpa) / 5) * 100}%`,
                backgroundColor: record.gpa >= 3.5 ? colors.green : record.gpa >= 2.4 ? colors.primary : colors.red
              }]} />
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Add Modal */}
      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet">
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Add GPA Record</Text>
            <TouchableOpacity onPress={() => { setShowAdd(false); resetForm(); }}>
              <Text style={s.modalClose}>Cancel</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={s.modalContent}>
            <InlineError msg={formError} />
            {[
              { label: 'Semester *', value: semester, onChange: setSemester, placeholder: 'e.g. 2024/2025 First Semester', kb: 'default' as const },
              { label: 'GPA (0–5) *', value: gpa, onChange: setGpa, placeholder: 'e.g. 4.2', kb: 'decimal-pad' as const },
              { label: 'Total Credits', value: credits, onChange: setCredits, placeholder: 'e.g. 18', kb: 'numeric' as const },
              { label: 'Courses (comma-separated)', value: courses, onChange: setCourses, placeholder: 'CSC301, MTH201', kb: 'default' as const },
            ].map(f => (
              <View key={f.label} style={s.formField}>
                <Text style={s.formLabel}>{f.label}</Text>
                <TextInput style={s.formInput} value={f.value} onChangeText={f.onChange}
                  placeholder={f.placeholder} placeholderTextColor={colors.muted} keyboardType={f.kb} />
              </View>
            ))}
            {gpa && !isNaN(parseFloat(gpa)) && (
              <View style={s.previewBadge}>
                <Text style={s.previewText}>Classification: <Text style={{ color: colors.primary, fontWeight: '700' }}>{classify(parseFloat(gpa))}</Text></Text>
              </View>
            )}
            <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.card },
  title: { color: colors.foreground, fontSize: typography.lg, fontWeight: '800' },
  addBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md },
  addBtnText: { color: '#fff', fontSize: typography.sm, fontWeight: '700' },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: 120 },
  summaryRow: { flexDirection: 'row', gap: spacing.sm },
  summaryCard: { flex: 1, backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.sm, alignItems: 'center', borderWidth: 1, borderColor: colors.border, justifyContent: 'center' },
  summaryValue: { color: colors.primary, fontSize: typography['2xl'], fontWeight: '800' },
  summaryLabel: { color: colors.muted, fontSize: typography.xs, marginTop: 2 },
  summaryClass: { color: colors.foreground, fontSize: 10, fontWeight: '600', marginTop: 2 },
  summaryValueLight: { color: '#fff', fontSize: typography['2xl'], fontWeight: '800' },
  summaryLabelLight: { color: 'rgba(255,255,255,0.7)', fontSize: typography.xs, marginTop: 2 },
  summaryClassLight: { color: '#fff', fontSize: 10, fontWeight: '600', marginTop: 2 },
  empty: { alignItems: 'center', padding: spacing.xxl, gap: spacing.md },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  emptyIconText: { color: '#fff', fontSize: typography.xl, fontWeight: '900' },
  emptyTitle: { color: colors.foreground, fontSize: typography.lg, fontWeight: '700' },
  emptyText: { color: colors.muted, fontSize: typography.sm, textAlign: 'center' },
  emptyBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.lg },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: typography.sm },
  recordCard: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border, gap: spacing.sm },
  recordHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  recordSemester: { color: colors.foreground, fontSize: typography.sm, fontWeight: '700' },
  recordClass: { color: colors.muted, fontSize: typography.xs, marginTop: 2 },
  recordRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  recordGpa: { fontSize: typography['2xl'], fontWeight: '900' },
  recordCredits: { color: colors.muted, fontSize: typography.xs },
  deleteBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.red + '40' },
  deleteBtnText: { color: colors.red, fontSize: 10, fontWeight: '600' },
  gpaTrack: { height: 4, backgroundColor: colors.border, borderRadius: radius.full, overflow: 'hidden' },
  gpaFill: { height: '100%', borderRadius: radius.full },
  modal: { flex: 1, backgroundColor: colors.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.card },
  modalTitle: { color: colors.foreground, fontSize: typography.xl, fontWeight: '800' },
  modalClose: { color: colors.primary, fontSize: typography.base, fontWeight: '600' },
  modalContent: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  formField: { gap: 6 },
  formLabel: { color: colors.muted, fontSize: typography.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  formInput: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, color: colors.foreground, fontSize: typography.base, borderWidth: 1, borderColor: colors.border },
  previewBadge: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  previewText: { color: colors.muted, fontSize: typography.xs },
  saveBtn: { backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.md, alignItems: 'center', marginTop: spacing.sm },
  saveBtnText: { color: '#fff', fontSize: typography.base, fontWeight: '700' },
  // Chart section
  chartCard: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  chartTitle: { color: colors.foreground, fontSize: typography.base, fontWeight: '700' },
  chartSub: { color: colors.muted, fontSize: typography.xs },
  chartEmpty: { paddingVertical: spacing.xl, alignItems: 'center' },
});
