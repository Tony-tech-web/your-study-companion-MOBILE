import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Modal, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { colors, spacing, radius, typography } from '../lib/theme';
import { getStudyPlans, createStudyPlan, deleteStudyPlan } from '../services/planner';
import { StudyPlan } from '../types';

const InlineError = ({ msg }: { msg: string }) => msg ? (
  <View style={ie.wrap}><Text style={ie.text}>{msg}</Text></View>
) : null;
const ie = StyleSheet.create({
  wrap: { backgroundColor: colors.red + '18', borderRadius: radius.sm, padding: spacing.sm, borderWidth: 1, borderColor: colors.red + '30', marginBottom: spacing.sm },
  text: { color: colors.red, fontSize: typography.xs },
});

export default function PlannerScreen() {
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [subjects, setSubjects] = useState('');
  const [hours, setHours] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = async () => {
    try { setPlans(await getStudyPlans()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => { setName(''); setSubjects(''); setHours(''); setFormError(''); };

  const handleSave = async () => {
    if (!name.trim()) { setFormError('Plan name is required'); return; }
    if (!hours || isNaN(parseInt(hours))) { setFormError('Please enter valid hours'); return; }
    setSaving(true); setFormError('');
    try {
      const plan = await createStudyPlan({
        name: name.trim(),
        subjects: subjects.split(',').map(s => s.trim()).filter(Boolean),
        totalHours: parseInt(hours),
      });
      setPlans(prev => [plan, ...prev]);
      setShowAdd(false); resetForm();
    } catch (e: any) { setFormError(e.message || 'Failed to create plan'); }
    finally { setSaving(false); }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Plan', 'Remove this study plan permanently?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await deleteStudyPlan(id).catch(() => {});
        setPlans(prev => prev.filter(p => p.id !== id));
      }},
    ]);
  };

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ padding: 20, gap: 12 }}>
        {[0,1,2,3].map(i => (
          <View key={i} style={{ backgroundColor: colors.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.border, gap: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ width: '50%', height: 14, borderRadius: 4, backgroundColor: colors.border, opacity: 0.4 }} />
              <View style={{ width: 50, height: 14, borderRadius: 4, backgroundColor: colors.border, opacity: 0.25 }} />
            </View>
            <View style={{ width: '70%', height: 10, borderRadius: 4, backgroundColor: colors.border, opacity: 0.3 }} />
            <View style={{ height: 4, borderRadius: 99, backgroundColor: colors.border, opacity: 0.3 }} />
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <View style={s.root}>
      <View style={s.header}>
        <View>
          <Text style={s.title}>Study Planner</Text>
          <Text style={s.sub}>{plans.length} active plan{plans.length !== 1 ? 's' : ''}</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={() => setShowAdd(true)}>
          <Text style={s.addBtnText}>+ New Plan</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}>

        {/* Stats row */}
        {plans.length > 0 && (
          <View style={s.statsRow}>
            {[
              { label: 'Total Plans', value: String(plans.length) },
              { label: 'Hours', value: `${plans.reduce((a, p) => a + p.totalHours, 0)}h` },
              { label: 'Avg Progress', value: `${Math.round(plans.reduce((a, p) => a + p.progress, 0) / plans.length)}%` },
            ].map(st => (
              <View key={st.label} style={s.statCard}>
                <Text style={s.statValue}>{st.value}</Text>
                <Text style={s.statLabel}>{st.label}</Text>
              </View>
            ))}
          </View>
        )}

        {plans.length === 0 ? (
          <View style={s.empty}>
            <View style={s.emptyIcon}><Text style={s.emptyIconText}>P</Text></View>
            <Text style={s.emptyTitle}>No study plans yet</Text>
            <Text style={s.emptyText}>Create a plan to track your study sessions</Text>
            <TouchableOpacity style={s.emptyBtn} onPress={() => setShowAdd(true)}>
              <Text style={s.emptyBtnText}>Create First Plan</Text>
            </TouchableOpacity>
          </View>
        ) : plans.map(plan => (
          <View key={plan.id} style={s.planCard}>
            <View style={s.planHeader}>
              <View style={{ flex: 1 }}>
                <Text style={s.planName}>{plan.name}</Text>
                {plan.subjects.length > 0 && (
                  <View style={s.subjectRow}>
                    {plan.subjects.slice(0, 3).map(sub => (
                      <View key={sub} style={s.subjectTag}>
                        <Text style={s.subjectTagText}>{sub}</Text>
                      </View>
                    ))}
                    {plan.subjects.length > 3 && (
                      <Text style={s.moreSubjects}>+{plan.subjects.length - 3}</Text>
                    )}
                  </View>
                )}
              </View>
              <TouchableOpacity onPress={() => handleDelete(plan.id)} style={s.deleteBtn}>
                <Text style={s.deleteBtnText}>Delete</Text>
              </TouchableOpacity>
            </View>
            <View style={s.planMeta}>
              <Text style={s.planHours}>{plan.totalHours}h allocated</Text>
              <Text style={s.planProgress}>{plan.progress}%</Text>
            </View>
            <View style={s.progressTrack}>
              <View style={[s.progressFill, { width: `${plan.progress}%` }]} />
            </View>
          </View>
        ))}
      </ScrollView>

      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet">
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>New Study Plan</Text>
            <TouchableOpacity onPress={() => { setShowAdd(false); resetForm(); }}>
              <Text style={s.modalClose}>Cancel</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={s.modalContent}>
            <InlineError msg={formError} />
            {[
              { label: 'Plan Name *', value: name, onChange: setName, placeholder: 'e.g. Final Exam Prep', kb: 'default' as const },
              { label: 'Subjects (comma-separated)', value: subjects, onChange: setSubjects, placeholder: 'Math, Physics, Chemistry', kb: 'default' as const },
              { label: 'Total Hours *', value: hours, onChange: setHours, placeholder: 'e.g. 20', kb: 'numeric' as const },
            ].map(f => (
              <View key={f.label} style={s.formField}>
                <Text style={s.formLabel}>{f.label}</Text>
                <TextInput style={s.formInput} value={f.value} onChangeText={f.onChange}
                  placeholder={f.placeholder} placeholderTextColor={colors.muted} keyboardType={f.kb} />
              </View>
            ))}
            <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>Create Plan</Text>}
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
  sub: { color: colors.muted, fontSize: typography.xs, marginTop: 2 },
  addBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md },
  addBtnText: { color: '#fff', fontSize: typography.sm, fontWeight: '700' },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: 120 },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  statCard: { flex: 1, backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  statValue: { color: colors.primary, fontSize: typography.xl, fontWeight: '800' },
  statLabel: { color: colors.muted, fontSize: typography.xs, marginTop: 2 },
  empty: { alignItems: 'center', padding: spacing.xxl, gap: spacing.md },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  emptyIconText: { color: '#fff', fontSize: typography.xl, fontWeight: '900' },
  emptyTitle: { color: colors.foreground, fontSize: typography.lg, fontWeight: '700' },
  emptyText: { color: colors.muted, fontSize: typography.sm, textAlign: 'center' },
  emptyBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.lg },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: typography.sm },
  planCard: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border, gap: spacing.sm },
  planHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  planName: { color: colors.foreground, fontSize: typography.base, fontWeight: '700' },
  subjectRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  subjectTag: { backgroundColor: colors.input, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: colors.border },
  subjectTagText: { color: colors.muted, fontSize: 10, fontWeight: '600' },
  moreSubjects: { color: colors.muted, fontSize: 10, alignSelf: 'center' },
  deleteBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.red + '40' },
  deleteBtnText: { color: colors.red, fontSize: 10, fontWeight: '600' },
  planMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  planHours: { color: colors.muted, fontSize: typography.xs },
  planProgress: { color: colors.primary, fontSize: typography.xs, fontWeight: '700' },
  progressTrack: { height: 4, backgroundColor: colors.border, borderRadius: radius.full, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: radius.full },
  modal: { flex: 1, backgroundColor: colors.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.card },
  modalTitle: { color: colors.foreground, fontSize: typography.xl, fontWeight: '800' },
  modalClose: { color: colors.primary, fontSize: typography.base, fontWeight: '600' },
  modalContent: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  formField: { gap: 6 },
  formLabel: { color: colors.muted, fontSize: typography.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  formInput: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, color: colors.foreground, fontSize: typography.base, borderWidth: 1, borderColor: colors.border },
  saveBtn: { backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.md, alignItems: 'center', marginTop: spacing.sm },
  saveBtnText: { color: '#fff', fontSize: typography.base, fontWeight: '700' },
});
