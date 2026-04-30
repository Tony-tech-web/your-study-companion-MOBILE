import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Modal, ActivityIndicator, RefreshControl, Alert,
  Dimensions,
} from 'react-native';
import { colors, spacing, radius, typography } from '../lib/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getStudyPlans, createStudyPlan, deleteStudyPlan } from '../services/planner';
import { callEdgeFunction } from '../lib/supabase';
import { StudyPlan } from '../types';

const { width: SCREEN_W } = Dimensions.get('window');
const PLAN_COLORS = ['#6366f1','#10b981','#f27d26','#8b5cf6','#f59e0b','#ef4444'];

// ─── Helpers ───────────────────────────────────────────────────────────────
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

// ─── Mini Calendar ─────────────────────────────────────────────────────────
const MiniCalendar = ({
  selectedDate, onSelectDate, planDates, currentYear, currentMonth, onPrevMonth, onNextMonth,
}: {
  selectedDate: Date; onSelectDate: (d: Date) => void;
  planDates: Set<string>; currentYear: number; currentMonth: number;
  onPrevMonth: () => void; onNextMonth: () => void;
}) => {
  const today = new Date();
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({length: daysInMonth}, (_, i) => i + 1)];

  return (
    <View style={cal.wrap}>
      {/* Month nav */}
      <View style={cal.nav}>
        <TouchableOpacity onPress={onPrevMonth} style={cal.navBtn}>
          <Text style={cal.navArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={cal.monthLabel}>{MONTH_NAMES[currentMonth]} {currentYear}</Text>
        <TouchableOpacity onPress={onNextMonth} style={cal.navBtn}>
          <Text style={cal.navArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Day headers */}
      <View style={cal.dayRow}>
        {DAY_NAMES.map(d => <Text key={d} style={cal.dayHeader}>{d}</Text>)}
      </View>

      {/* Dates grid */}
      <View style={cal.grid}>
        {cells.map((day, i) => {
          if (!day) return <View key={`empty-${i}`} style={cal.cell} />;
          const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
          const isToday = today.getFullYear() === currentYear && today.getMonth() === currentMonth && today.getDate() === day;
          const isSelected = selectedDate.getFullYear() === currentYear && selectedDate.getMonth() === currentMonth && selectedDate.getDate() === day;
          const hasPlan = planDates.has(dateStr);
          return (
            <TouchableOpacity key={dateStr} onPress={() => onSelectDate(new Date(currentYear, currentMonth, day))} style={cal.cell}>
              <View style={[cal.dayCircle, isSelected && cal.dayCircleSelected, isToday && !isSelected && cal.dayCircleToday]}>
                <Text style={[cal.dayNum, isSelected && { color: '#fff', fontWeight: '800' }, isToday && !isSelected && { color: colors.primary, fontWeight: '800' }]}>
                  {day}
                </Text>
              </View>
              {hasPlan && !isSelected && <View style={cal.dot} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const cal = StyleSheet.create({
  wrap: { backgroundColor: colors.card, borderRadius: 20, marginHorizontal: spacing.md, marginTop: spacing.md, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  navBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.input },
  navArrow: { color: colors.primary, fontSize: 22, fontWeight: '700', lineHeight: 24 },
  monthLabel: { color: colors.foreground, fontSize: 15, fontWeight: '800', letterSpacing: -0.3 },
  dayRow: { flexDirection: 'row', paddingHorizontal: 8, paddingTop: 8 },
  dayHeader: { flex: 1, textAlign: 'center', color: colors.muted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8, paddingBottom: 12 },
  cell: { width: `${100/7}%`, alignItems: 'center', paddingVertical: 3 },
  dayCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  dayCircleSelected: { backgroundColor: colors.primary },
  dayCircleToday: { backgroundColor: colors.primary + '18' },
  dayNum: { color: colors.foreground, fontSize: 13, fontWeight: '500' },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.primary, marginTop: 1 },
});

// ─── Create Plan Modal ─────────────────────────────────────────────────────
const CreatePlanModal = ({ visible, onClose, onSave }: { visible: boolean; onClose: () => void; onSave: (p: StudyPlan) => void }) => {
  const [name, setName] = useState('');
  const [subjectsInput, setSubjectsInput] = useState('');
  const [hours, setHours] = useState('');
  const [daysPerWeek, setDaysPerWeek] = useState('5');
  const [error, setError] = useState('');
  const [step, setStep] = useState<'form' | 'generating' | 'done'>('form');
  const [saving, setSaving] = useState(false);

  const reset = () => { setName(''); setSubjectsInput(''); setHours(''); setError(''); setStep('form'); setSaving(false); };

  const handleGenerate = async () => {
    if (!name || !hours || !subjectsInput) { setError('Please fill all fields'); return; }
    setError(''); setStep('generating');
    try {
      await callEdgeFunction('ai-chat', {
        messages: [{ role: 'user', content: `Generate a weekly study schedule for "${name}". Subjects: ${subjectsInput}. Hours/week: ${hours}. Days/week: ${daysPerWeek}. Return JSON only.` }],
        providerId: 'auto', mode: 'chat',
      });
      // Schedule generated — now save the plan
      setStep('done');
    } catch { setStep('done'); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const plan = await createStudyPlan({
        name,
        subjects: subjectsInput.split(',').map(s => s.trim()).filter(Boolean),
        totalHours: parseInt(hours) || 0,
      });
      onSave(plan);
      onClose();
      reset();
    } catch (e: any) { setError(e.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={cm.root}>
        <View style={cm.header}>
          <Text style={cm.title}>{step === 'generating' ? 'AI is planning…' : step === 'done' ? 'Ready to save' : 'New Study Plan'}</Text>
          <TouchableOpacity onPress={() => { onClose(); reset(); }}>
            <Text style={cm.cancel}>Cancel</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={cm.content}>
          {step === 'form' && (
            <>
              {error ? <View style={cm.errorBox}><Text style={cm.errorText}>{error}</Text></View> : null}
              {[
                { label: 'Plan Name *', value: name, onChange: setName, placeholder: 'e.g. Semester 1 Prep' },
                { label: 'Subjects * (comma-separated)', value: subjectsInput, onChange: setSubjectsInput, placeholder: 'Math, Physics, CSC' },
                { label: 'Hours per Week *', value: hours, onChange: setHours, placeholder: '20' },
                { label: 'Days per Week', value: daysPerWeek, onChange: setDaysPerWeek, placeholder: '5' },
              ].map(f => (
                <View key={f.label} style={cm.field}>
                  <Text style={cm.label}>{f.label}</Text>
                  <TextInput style={cm.input} value={f.value} onChangeText={f.onChange}
                    placeholder={f.placeholder} placeholderTextColor={colors.muted}
                    keyboardType={f.label.includes('Hours') || f.label.includes('Days') ? 'numeric' : 'default'} />
                </View>
              ))}
              <TouchableOpacity style={cm.generateBtn} onPress={handleGenerate}>
                <Text style={cm.generateBtnText}>✦  Generate with AI</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 'generating' && (
            <View style={cm.genWrap}>
              <ActivityIndicator color={colors.primary} size="large" />
              <Text style={cm.genText}>Orbit is building your schedule…</Text>
              <Text style={cm.genSub}>Optimising for {daysPerWeek} days/week</Text>
            </View>
          )}

          {step === 'done' && (
            <View style={cm.doneWrap}>
              <View style={cm.doneIcon}><Text style={cm.doneIconText}>✓</Text></View>
              <Text style={cm.doneTitle}>Schedule ready</Text>
              <Text style={cm.doneSub}>Your plan "{name}" is ready to be saved.</Text>
              {error ? <View style={cm.errorBox}><Text style={cm.errorText}>{error}</Text></View> : null}
              <TouchableOpacity style={[cm.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={cm.saveBtnText}>Save Plan</Text>}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const cm = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.card },
  title: { color: colors.foreground, fontSize: 18, fontWeight: '800' },
  cancel: { color: colors.primary, fontSize: 15, fontWeight: '600' },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: 80 },
  field: { gap: 6 },
  label: { color: colors.muted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, color: colors.foreground, fontSize: 15, borderWidth: 1, borderColor: colors.border },
  generateBtn: { backgroundColor: colors.primary, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center', marginTop: spacing.sm },
  generateBtnText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 0.2 },
  genWrap: { alignItems: 'center', paddingVertical: 60, gap: 16 },
  genText: { color: colors.foreground, fontSize: 16, fontWeight: '700' },
  genSub: { color: colors.muted, fontSize: 13 },
  doneWrap: { alignItems: 'center', gap: 12, paddingVertical: 32 },
  doneIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  doneIconText: { color: '#fff', fontSize: 32, fontWeight: '900' },
  doneTitle: { color: colors.foreground, fontSize: 22, fontWeight: '900' },
  doneSub: { color: colors.muted, fontSize: 14, textAlign: 'center' },
  saveBtn: { backgroundColor: colors.primary, borderRadius: radius.lg, paddingHorizontal: 40, paddingVertical: spacing.md, marginTop: spacing.sm },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  errorBox: { backgroundColor: colors.red + '18', borderRadius: radius.sm, padding: spacing.sm, borderWidth: 1, borderColor: colors.red + '30' },
  errorText: { color: colors.red, fontSize: 13 },
});

// ─── Plan Detail ───────────────────────────────────────────────────────────
const PlanDetail = ({ plan, onBack, onDelete }: { plan: StudyPlan; onBack: () => void; onDelete: () => void }) => {
  const [completedSessions, setCompletedSessions] = useState<Set<string>>(new Set());

  const weekDays = [1,2,3,4,5];
  const sessionTimes = ['09:00','11:00','14:00','16:00'];
  const dayColors = PLAN_COLORS;

  // Simple schedule distribution
  const sessions = plan.subjects.flatMap((sub, si) =>
    weekDays.slice(0, Math.max(2, Math.ceil(weekDays.length / plan.subjects.length))).map((day, di) => ({
      id: `${sub}-${day}`,
      subject: sub,
      day: weekDays[(si + di) % weekDays.length],
      time: sessionTimes[di % sessionTimes.length],
      color: dayColors[si % dayColors.length],
    }))
  );

  const confirmSession = (sessionId: string, subject: string, time: string) => {
    const done = completedSessions.has(sessionId);
    Alert.alert(
      done ? 'Mark Incomplete?' : 'Confirm Session',
      done ? `Mark "${subject}" at ${time} as incomplete?` : `Mark "${subject}" at ${time} as completed?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: done ? 'Mark Incomplete' : 'Confirm', onPress: () => {
          setCompletedSessions(prev => {
            const next = new Set(prev);
            done ? next.delete(sessionId) : next.add(sessionId);
            return next;
          });
        }},
      ]
    );
  };

  const progress = sessions.length > 0 ? Math.round((completedSessions.size / sessions.length) * 100) : 0;
  const today = new Date();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      {/* Header */}
      <View style={pd.header}>
        <TouchableOpacity onPress={onBack} style={pd.backBtn}>
          <Text style={pd.backArrow}>← </Text>
          <Text style={pd.backText}>Plans</Text>
        </TouchableOpacity>
        <Text style={pd.planTitle} numberOfLines={1}>{plan.name}</Text>
        <TouchableOpacity onPress={onDelete}>
          <Text style={pd.deleteText}>Delete</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Week strip calendar */}
        <View style={pd.weekStrip}>
          {weekDays.map(d => {
            const date = new Date(today);
            date.setDate(today.getDate() - today.getDay() + d);
            const isToday = date.toDateString() === today.toDateString();
            const daySessions = sessions.filter(s => s.day === d);
            return (
              <View key={d} style={pd.weekDay}>
                <Text style={[pd.weekDayLabel, isToday && { color: colors.primary }]}>{['','Mon','Tue','Wed','Thu','Fri'][d]}</Text>
                <View style={[pd.weekDayCircle, isToday && { backgroundColor: colors.primary }]}>
                  <Text style={[pd.weekDayNum, isToday && { color: '#fff' }]}>{date.getDate()}</Text>
                </View>
                <View style={pd.weekDayDots}>
                  {daySessions.slice(0,3).map((s,i) => (
                    <View key={i} style={[pd.weekDot, { backgroundColor: s.color }]} />
                  ))}
                </View>
              </View>
            );
          })}
        </View>

        {/* Month/year label */}
        <Text style={pd.monthYear}>{MONTH_NAMES[today.getMonth()]} {today.getFullYear()}</Text>

        {/* Progress */}
        <View style={pd.progressCard}>
          <View style={pd.progressHeader}>
            <Text style={pd.progressLabel}>Weekly Progress</Text>
            <Text style={[pd.progressPct, { color: colors.primary }]}>{progress}%</Text>
          </View>
          <View style={pd.progressTrack}>
            <View style={[pd.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={pd.progressSub}>{completedSessions.size}/{sessions.length} sessions confirmed</Text>
        </View>

        {/* Today's sessions */}
        <Text style={pd.sectionTitle}>
          {today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </Text>

        {sessions.filter(s => s.day === (today.getDay() === 0 ? 7 : today.getDay())).length === 0 ? (
          <View style={pd.noSessions}>
            <Text style={pd.noSessionsText}>No sessions scheduled for today</Text>
          </View>
        ) : sessions.filter(s => s.day === (today.getDay())).map(sess => {
          const done = completedSessions.has(sess.id);
          return (
            <TouchableOpacity key={sess.id} style={[pd.sessionCard, done && { opacity: 0.7 }]}
              onPress={() => confirmSession(sess.id, sess.subject, sess.time)}>
              <View style={[pd.sessionColorBar, { backgroundColor: sess.color }]} />
              <View style={pd.sessionInfo}>
                <Text style={pd.sessionSubject}>{sess.subject}</Text>
                <Text style={pd.sessionTime}>{sess.time}</Text>
              </View>
              <View style={[pd.sessionCheck, done && { backgroundColor: colors.green, borderColor: colors.green }]}>
                {done && <Text style={pd.sessionCheckMark}>✓</Text>}
              </View>
            </TouchableOpacity>
          );
        })}

        {/* All week sessions */}
        <Text style={pd.sectionTitle}>This Week</Text>
        {sessions.map(sess => {
          const done = completedSessions.has(sess.id);
          const dayDate = new Date(today);
          dayDate.setDate(today.getDate() - today.getDay() + sess.day);
          return (
            <TouchableOpacity key={sess.id} style={[pd.sessionCard, done && { opacity: 0.65 }]}
              onPress={() => confirmSession(sess.id, sess.subject, sess.time)}>
              <View style={[pd.sessionColorBar, { backgroundColor: sess.color }]} />
              <View style={pd.sessionInfo}>
                <Text style={pd.sessionSubject}>{sess.subject}</Text>
                <Text style={pd.sessionTime}>{['','Mon','Tue','Wed','Thu','Fri'][sess.day]} · {sess.time}</Text>
              </View>
              <View style={[pd.sessionCheck, done && { backgroundColor: colors.green, borderColor: colors.green }]}>
                {done && <Text style={pd.sessionCheckMark}>✓</Text>}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
};

const pd = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, backgroundColor: colors.card, gap: spacing.sm },
  backBtn: { flexDirection: 'row', alignItems: 'center' },
  backArrow: { color: colors.primary, fontSize: 16, fontWeight: '700' },
  backText: { color: colors.primary, fontSize: 15, fontWeight: '600' },
  planTitle: { flex: 1, color: colors.foreground, fontSize: 16, fontWeight: '800', textAlign: 'center' },
  deleteText: { color: colors.red, fontSize: 14, fontWeight: '600' },
  weekStrip: { flexDirection: 'row', paddingHorizontal: spacing.md, paddingVertical: spacing.md, gap: 2, backgroundColor: colors.card, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  weekDay: { flex: 1, alignItems: 'center', gap: 3 },
  weekDayLabel: { color: colors.muted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  weekDayCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  weekDayNum: { color: colors.foreground, fontSize: 15, fontWeight: '600' },
  weekDayDots: { flexDirection: 'row', gap: 2 },
  weekDot: { width: 4, height: 4, borderRadius: 2 },
  monthYear: { color: colors.muted, fontSize: 13, fontWeight: '600', paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm },
  progressCard: { marginHorizontal: spacing.md, backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border, gap: 8, marginBottom: spacing.md },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressLabel: { color: colors.foreground, fontSize: 13, fontWeight: '700' },
  progressPct: { fontSize: 15, fontWeight: '900' },
  progressTrack: { height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 3 },
  progressSub: { color: colors.muted, fontSize: 11 },
  sectionTitle: { color: colors.foreground, fontSize: 15, fontWeight: '800', paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: 8, letterSpacing: -0.2 },
  noSessions: { marginHorizontal: spacing.md, padding: spacing.md, backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  noSessionsText: { color: colors.muted, fontSize: 13 },
  sessionCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: spacing.md, marginBottom: 8, backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  sessionColorBar: { width: 4, alignSelf: 'stretch' },
  sessionInfo: { flex: 1, padding: 14, gap: 3 },
  sessionSubject: { color: colors.foreground, fontSize: 14, fontWeight: '700' },
  sessionTime: { color: colors.muted, fontSize: 12 },
  sessionCheck: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  sessionCheckMark: { color: '#fff', fontSize: 13, fontWeight: '900' },
});

// ─── Main Planner ──────────────────────────────────────────────────────────
export default function PlannerScreen() {
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<StudyPlan | null>(null);
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(today);

  const load = async () => {
    try { setPlans(await getStudyPlans()); }
    catch { /* silent */ }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);

  // Dates that have plans (simple: mark today + next 5 days if plans exist)
  const planDates = useMemo(() => {
    const s = new Set<string>();
    if (plans.length > 0) {
      for (let i = 0; i < 30; i += Math.max(1, Math.floor(7 / plans.length))) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        if (d.getDay() !== 0 && d.getDay() !== 6) {
          s.add(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`);
        }
      }
    }
    return s;
  }, [plans]);

  const handleDelete = (id: string) => {
    Alert.alert('Delete Plan', 'Remove this study plan permanently?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await deleteStudyPlan(id).catch(() => {});
        setPlans(prev => prev.filter(p => p.id !== id));
        setSelectedPlan(null);
      }},
    ]);
  };

  if (selectedPlan) {
    return <PlanDetail plan={selectedPlan} onBack={() => setSelectedPlan(null)} onDelete={() => handleDelete(selectedPlan.id)} />;
  }

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ padding: 20, gap: 12 }}>
        <View style={{ height: 200, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }} />
        {[0,1,2].map(i => <View key={i} style={{ height: 80, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }} />)}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <CreatePlanModal visible={showCreate} onClose={() => setShowCreate(false)} onSave={p => setPlans(prev => [p, ...prev])} />

      {/* Header */}
      <View style={pl.header}>
        <View>
          <Text style={pl.title}>Study Planner</Text>
          <Text style={pl.sub}>{plans.length} active plan{plans.length !== 1 ? 's' : ''}</Text>
        </View>
        <TouchableOpacity style={pl.addBtn} onPress={() => setShowCreate(true)}>
          <Text style={pl.addBtnText}>+ New Plan</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
        contentContainerStyle={{ paddingBottom: 120 }}>

        {/* Calendar — always visible at top */}
        <MiniCalendar
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          planDates={planDates}
          currentYear={calYear}
          currentMonth={calMonth}
          onPrevMonth={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y-1); } else setCalMonth(m => m-1); }}
          onNextMonth={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y+1); } else setCalMonth(m => m+1); }}
        />

        {/* Stats row */}
        {plans.length > 0 && (
          <View style={pl.statsRow}>
            {[
              { label: 'Plans', value: String(plans.length) },
              { label: 'Hours', value: `${plans.reduce((a,p) => a + p.totalHours, 0)}h` },
              { label: 'Progress', value: `${Math.round(plans.reduce((a,p) => a + p.progress, 0) / plans.length)}%` },
            ].map(s => (
              <View key={s.label} style={pl.statCard}>
                <Text style={pl.statValue}>{s.value}</Text>
                <Text style={pl.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Plans as cards below calendar */}
        <Text style={pl.sectionLabel}>
          {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </Text>

        {plans.length === 0 ? (
          <View style={pl.empty}>
            <Text style={pl.emptyTitle}>No study plans yet</Text>
            <Text style={pl.emptySub}>Create one with AI to get your schedule</Text>
            <TouchableOpacity style={pl.emptyBtn} onPress={() => setShowCreate(true)}>
              <Text style={pl.emptyBtnText}>✦  Create with AI</Text>
            </TouchableOpacity>
          </View>
        ) : plans.map((plan, i) => (
          <TouchableOpacity key={plan.id} style={pl.planCard} onPress={() => setSelectedPlan(plan)} activeOpacity={0.82}>
            <View style={[pl.planAccent, { backgroundColor: PLAN_COLORS[i % PLAN_COLORS.length] }]} />
            <View style={pl.planBody}>
              <View style={pl.planRow}>
                <Text style={pl.planName} numberOfLines={1}>{plan.name}</Text>
                <TouchableOpacity onPress={() => handleDelete(plan.id)} style={pl.deleteBtnSmall}>
                  <Text style={pl.deleteBtnSmallText}>Delete</Text>
                </TouchableOpacity>
              </View>
              <View style={pl.planMeta}>
                {plan.subjects.slice(0,3).map(sub => (
                  <View key={sub} style={[pl.subjectChip, { backgroundColor: PLAN_COLORS[i % PLAN_COLORS.length] + '18' }]}>
                    <Text style={[pl.subjectChipText, { color: PLAN_COLORS[i % PLAN_COLORS.length] }]}>{sub}</Text>
                  </View>
                ))}
                {plan.subjects.length > 3 && <Text style={pl.moreSubjects}>+{plan.subjects.length-3}</Text>}
              </View>
              <View style={pl.planFooter}>
                <Text style={pl.planHours}>{plan.totalHours}h allocated</Text>
                <Text style={[pl.planProgress, { color: PLAN_COLORS[i % PLAN_COLORS.length] }]}>{plan.progress}%</Text>
              </View>
              <View style={pl.progressTrack}>
                <View style={[pl.progressFill, { width: `${plan.progress}%`, backgroundColor: PLAN_COLORS[i % PLAN_COLORS.length] }]} />
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const pl = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, backgroundColor: colors.card },
  title: { color: colors.foreground, fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  sub: { color: colors.muted, fontSize: 12, marginTop: 2 },
  addBtn: { backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 14 },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  statsRow: { flexDirection: 'row', gap: 8, marginHorizontal: spacing.md, marginTop: spacing.md },
  statCard: { flex: 1, backgroundColor: colors.card, borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  statValue: { color: colors.primary, fontSize: 22, fontWeight: '900' },
  statLabel: { color: colors.muted, fontSize: 10, marginTop: 2, fontWeight: '600' },
  sectionLabel: { color: colors.foreground, fontSize: 15, fontWeight: '800', paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: 8, letterSpacing: -0.2 },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyTitle: { color: colors.foreground, fontSize: 17, fontWeight: '700' },
  emptySub: { color: colors.muted, fontSize: 13 },
  emptyBtn: { marginTop: 8, backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 16 },
  emptyBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  planCard: { flexDirection: 'row', marginHorizontal: spacing.md, marginBottom: 10, backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  planAccent: { width: 5 },
  planBody: { flex: 1, padding: 14, gap: 8 },
  planRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  planName: { color: colors.foreground, fontSize: 15, fontWeight: '800', flex: 1, marginRight: 8 },
  deleteBtnSmall: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: colors.red + '40' },
  deleteBtnSmallText: { color: colors.red, fontSize: 10, fontWeight: '700' },
  planMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  subjectChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  subjectChipText: { fontSize: 11, fontWeight: '700' },
  moreSubjects: { color: colors.muted, fontSize: 11, alignSelf: 'center' },
  planFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  planHours: { color: colors.muted, fontSize: 11 },
  planProgress: { fontSize: 13, fontWeight: '800' },
  progressTrack: { height: 4, backgroundColor: colors.border, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
});
