import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Modal, ActivityIndicator, RefreshControl, Alert,
  Dimensions,
} from 'react-native';
import { colors, spacing, radius, typography } from '../lib/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getStudyPlans, createStudyPlan, updateStudyPlan, deleteStudyPlan, randomizeStudyPlan } from '../services/planner';
import { callEdgeFunction } from '../lib/supabase';
import { StudyPlan, StudyPlanBlock } from '../types';
import { getBillingUsage, recordAiUsageEvent } from '../services/billing';
import { scheduleStudyReminder } from '../services/notifications';

const { width: SCREEN_W } = Dimensions.get('window');
const PLAN_COLORS = ['#6366f1','#10b981','#f27d26','#8b5cf6','#f59e0b','#ef4444'];

// ─── Helpers ───────────────────────────────────────────────────────────────
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const pad = (value: number) => String(value).padStart(2, '0');

const getBlockMinute = (block: StudyPlanBlock) => Number.isFinite(block.minute) ? block.minute! : 0;
const getDurationMinutes = (block: StudyPlanBlock) =>
  Number.isFinite(block.durationMinutes) ? block.durationMinutes! : Math.max(15, Math.round((block.duration || 1) * 60));

const formatBlockTime = (block: StudyPlanBlock) => {
  const hour = Math.max(0, Math.min(23, Number(block.hour) || 0));
  const minute = Math.max(0, Math.min(59, getBlockMinute(block)));
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${pad(minute)} ${suffix}`;
};

const formatDuration = (block: StudyPlanBlock) => {
  const mins = getDurationMinutes(block);
  if (mins % 60 === 0) return `${mins / 60}h`;
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
};

const normalizeBlocks = (blocks: StudyPlanBlock[] = []) => blocks.map((block, index) => {
  const durationMinutes = getDurationMinutes(block);
  return {
    ...block,
    day: Math.max(0, Math.min(6, Number(block.day) || 0)),
    hour: Math.max(0, Math.min(23, Number(block.hour) || 9)),
    minute: Math.max(0, Math.min(59, getBlockMinute(block))),
    duration: Math.max(0.25, Math.round((durationMinutes / 60) * 4) / 4),
    durationMinutes,
    color: block.color || PLAN_COLORS[index % PLAN_COLORS.length],
  };
});

const parseTimeInput = (value: string) => {
  const [rawHour, rawMinute] = value.split(':');
  const hour = Math.max(0, Math.min(23, Number(rawHour) || 0));
  const minute = Math.max(0, Math.min(59, Number(rawMinute) || 0));
  return { hour, minute };
};

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
const CreatePlanModal = ({ visible, onClose, onSave, initialPlan }: { visible: boolean; onClose: () => void; onSave: (p: StudyPlan) => void; initialPlan?: StudyPlan | null }) => {
  const [name, setName] = useState('');
  const [subjectsInput, setSubjectsInput] = useState('');
  const [hours, setHours] = useState('');
  const [daysPerWeek, setDaysPerWeek] = useState('5');
  const [error, setError] = useState('');
  const [step, setStep] = useState<'form' | 'generating' | 'done'>('form');
  const [saving, setSaving] = useState(false);
  const [scheduleBlocks, setScheduleBlocks] = useState<StudyPlanBlock[]>([]);

  const reset = () => { setName(''); setSubjectsInput(''); setHours(''); setDaysPerWeek('5'); setError(''); setStep('form'); setSaving(false); setScheduleBlocks([]); };

  useEffect(() => {
    if (!visible) return;
    if (initialPlan) {
      setName(initialPlan.name);
      setSubjectsInput(initialPlan.subjects.join(', '));
      setHours(String(initialPlan.totalHours || ''));
      setScheduleBlocks(normalizeBlocks(initialPlan.scheduleBlocks || []));
      setError('');
      setStep('form');
    } else {
      reset();
    }
  }, [visible, initialPlan]);

  const handleGenerate = async () => {
    if (!name || !hours || !subjectsInput) { setError('Please fill all fields'); return; }
    setError(''); setStep('generating');
    try {
      const usage = await getBillingUsage().catch(() => null);
      if (usage?.ai_token_limit > 0 && usage?.tokens_remaining <= 0) {
        throw new Error('AI token allowance exhausted');
      }
      const messages = [{
        role: 'user',
        content: `Generate a weekly study schedule for "${name}". Subjects: ${subjectsInput}. Hours/week: ${hours}. Days/week: ${daysPerWeek}. Return JSON only with blocks: [{day,hour,minute,subject,duration,durationMinutes,color}]. day is 0=Sun. hour is 24h. minute must be 0, 15, 30, or 45. durationMinutes must be 45, 60, 75, 90, or 120. Use readable AM/PM-friendly study times between 7:00 and 21:00. Use these colors: ${PLAN_COLORS.join(',')}. No markdown, no emoji.`,
      }];
      const res = await callEdgeFunction('ai-chat', {
        messages,
        providerId: 'auto', mode: 'chat',
      });
      if (!res.ok) throw new Error('AI failed');
      const data = await res.json();
      const text = data.text || data.reply || data.message || '';
      const parsed = JSON.parse(String(text).replace(/```json|```/g, '').trim());
      setScheduleBlocks(normalizeBlocks(Array.isArray(parsed.blocks) ? parsed.blocks : []));
      await recordAiUsageEvent({
        provider: 'edge:auto',
        feature: 'planner_generate',
        prompt: messages,
        completion: text,
      }).catch(() => {});
      setStep('done');
    } catch {
      try {
        const subjects = subjectsInput.split(',').map(s => s.trim()).filter(Boolean);
        const randomized = await randomizeStudyPlan({
          subjects,
          totalHours: parseInt(hours) || subjects.length,
          daysPerWeek: parseInt(daysPerWeek) || 5,
        });
        setScheduleBlocks(normalizeBlocks(randomized.blocks));
      } catch {
        setScheduleBlocks([]);
      }
      setStep('done');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        name,
        subjects: subjectsInput.split(',').map(s => s.trim()).filter(Boolean),
        totalHours: parseInt(hours) || 0,
        scheduleBlocks: normalizeBlocks(scheduleBlocks),
        completedSessionIds: initialPlan?.completedSessionIds || [],
        progress: initialPlan?.progress || 0,
      };
      const plan = initialPlan ? await updateStudyPlan(initialPlan.id, payload) : await createStudyPlan(payload);
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
          <Text style={cm.title}>{step === 'generating' ? 'AI is planning...' : step === 'done' ? 'Ready to save' : initialPlan ? 'Edit Study Plan' : 'New Study Plan'}</Text>
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
                <Text style={cm.generateBtnText}>Generate with AI</Text>
              </TouchableOpacity>
              {initialPlan ? (
                <TouchableOpacity style={cm.secondaryBtn} onPress={() => setStep('done')}>
                  <Text style={cm.secondaryBtnText}>Edit Schedule Times</Text>
                </TouchableOpacity>
              ) : null}
            </>
          )}

          {step === 'generating' && (
            <View style={cm.genWrap}>
              <ActivityIndicator color={colors.primary} size="large" />
              <Text style={cm.genText}>Orbit is building your schedule...</Text>
              <Text style={cm.genSub}>Optimising for {daysPerWeek} days/week</Text>
            </View>
          )}

          {step === 'done' && (
            <View style={cm.doneWrap}>
              <View style={cm.doneIcon}><Text style={cm.doneIconText}>✓</Text></View>
              <Text style={cm.doneTitle}>Schedule ready</Text>
              <Text style={cm.doneSub}>Your plan "{name}" is ready with {scheduleBlocks.length} scheduled session{scheduleBlocks.length === 1 ? '' : 's'}.</Text>
              {scheduleBlocks.map((block, index) => (
                <View key={`${block.subject}-${index}`} style={cm.scheduleEditor}>
                  <View style={cm.scheduleTop}>
                    <TextInput
                      style={cm.subjectInput}
                      value={block.subject}
                      onChangeText={(subject) => setScheduleBlocks(prev => normalizeBlocks(prev.map((item, i) => i === index ? { ...item, subject } : item)))}
                      placeholder="Subject"
                      placeholderTextColor={colors.muted}
                    />
                    <Text style={cm.scheduleMeta}>{formatDuration(block)}</Text>
                  </View>
                  <View style={cm.dayPills}>
                    {DAY_NAMES.map((dayName, day) => (
                      <TouchableOpacity
                        key={dayName}
                        style={[cm.dayPill, block.day === day && cm.dayPillActive]}
                        onPress={() => setScheduleBlocks(prev => normalizeBlocks(prev.map((item, i) => i === index ? { ...item, day } : item)))}>
                        <Text style={[cm.dayPillText, block.day === day && cm.dayPillTextActive]}>{dayName}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={cm.timeRow}>
                    <View style={cm.timeField}>
                      <Text style={cm.smallLabel}>Start time</Text>
                      <TextInput
                        style={cm.compactInput}
                        value={`${pad(block.hour)}:${pad(getBlockMinute(block))}`}
                        onChangeText={(value) => {
                          const { hour, minute } = parseTimeInput(value);
                          setScheduleBlocks(prev => normalizeBlocks(prev.map((item, i) => i === index ? { ...item, hour, minute } : item)));
                        }}
                        placeholder="09:30"
                        placeholderTextColor={colors.muted}
                        keyboardType="numbers-and-punctuation"
                      />
                    </View>
                    <View style={cm.timeField}>
                      <Text style={cm.smallLabel}>Minutes</Text>
                      <TextInput
                        style={cm.compactInput}
                        value={String(getDurationMinutes(block))}
                        onChangeText={(value) => {
                          const durationMinutes = Math.max(15, Math.min(240, Number(value) || 60));
                          setScheduleBlocks(prev => normalizeBlocks(prev.map((item, i) => i === index ? { ...item, durationMinutes, duration: durationMinutes / 60 } : item)));
                        }}
                        placeholder="90"
                        placeholderTextColor={colors.muted}
                        keyboardType="numeric"
                      />
                    </View>
                    <Text style={cm.previewTime}>{formatBlockTime(block)}</Text>
                  </View>
                </View>
              ))}
              {error ? <View style={cm.errorBox}><Text style={cm.errorText}>{error}</Text></View> : null}
              <TouchableOpacity style={[cm.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={cm.saveBtnText}>{initialPlan ? 'Save Changes' : 'Save Plan'}</Text>}
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
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: 130 },
  field: { gap: 6 },
  label: { color: colors.muted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, color: colors.foreground, fontSize: 15, borderWidth: 1, borderColor: colors.border },
  generateBtn: { backgroundColor: colors.primary, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center', marginTop: spacing.sm },
  generateBtnText: { color: colors.onPrimary, fontSize: 15, fontWeight: '800', letterSpacing: 0.2 },
  secondaryBtn: { borderRadius: radius.lg, padding: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.input },
  secondaryBtnText: { color: colors.foreground, fontSize: 14, fontWeight: '800' },
  genWrap: { alignItems: 'center', paddingVertical: 60, gap: 16 },
  genText: { color: colors.foreground, fontSize: 16, fontWeight: '700' },
  genSub: { color: colors.muted, fontSize: 13 },
  doneWrap: { alignItems: 'center', gap: 12, paddingVertical: 32 },
  doneIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  doneIconText: { color: '#fff', fontSize: 32, fontWeight: '900' },
  doneTitle: { color: colors.foreground, fontSize: 22, fontWeight: '900' },
  doneSub: { color: colors.muted, fontSize: 14, textAlign: 'center' },
  scheduleEditor: { width: '100%', borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 12, gap: 10 },
  scheduleTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  subjectInput: { flex: 1, minHeight: 42, borderRadius: 14, backgroundColor: colors.input, borderWidth: 1, borderColor: colors.border, color: colors.foreground, paddingHorizontal: 12, fontSize: 13, fontWeight: '700' },
  scheduleMeta: { color: colors.primary, fontSize: 12, fontWeight: '900' },
  dayPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  dayPill: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.input },
  dayPillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayPillText: { color: colors.muted, fontSize: 10, fontWeight: '900' },
  dayPillTextActive: { color: colors.onPrimary },
  timeRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  timeField: { flex: 1, gap: 5 },
  smallLabel: { color: colors.muted, fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.6 },
  compactInput: { height: 42, borderRadius: 14, backgroundColor: colors.input, borderWidth: 1, borderColor: colors.border, color: colors.foreground, paddingHorizontal: 12, fontSize: 13, fontWeight: '800' },
  previewTime: { minWidth: 74, height: 42, borderRadius: 14, overflow: 'hidden', textAlign: 'center', textAlignVertical: 'center', color: colors.foreground, backgroundColor: colors.input, borderWidth: 1, borderColor: colors.border, fontSize: 11, fontWeight: '900', paddingTop: 12 },
  saveBtn: { backgroundColor: colors.primary, borderRadius: radius.lg, paddingHorizontal: 40, paddingVertical: spacing.md, marginTop: spacing.sm },
  saveBtnText: { color: colors.onPrimary, fontSize: 16, fontWeight: '800' },
  errorBox: { backgroundColor: colors.red + '18', borderRadius: radius.sm, padding: spacing.sm, borderWidth: 1, borderColor: colors.red + '30' },
  errorText: { color: colors.red, fontSize: 13 },
});

// ─── Plan Detail ───────────────────────────────────────────────────────────
const PlanDetail = ({ plan, onBack, onDelete, onEdit }: { plan: StudyPlan; onBack: () => void; onDelete: () => void; onEdit: () => void }) => {
  const [completedSessions, setCompletedSessions] = useState<Set<string>>(new Set(plan.completedSessionIds || []));

  const weekDays = [1,2,3,4,5];
  const sessionTimes = ['09:00','11:00','14:00','16:00'];
  const dayColors = PLAN_COLORS;

  const fallbackBlocks: StudyPlanBlock[] = plan.subjects.flatMap((sub, si) =>
    weekDays.slice(0, Math.max(1, Math.ceil(weekDays.length / Math.max(plan.subjects.length, 1)))).map((day, di) => ({
      day: weekDays[(si + di) % weekDays.length],
      hour: parseInt(sessionTimes[di % sessionTimes.length], 10),
      minute: 0,
      subject: sub,
      duration: 1,
      durationMinutes: 60,
      color: dayColors[si % dayColors.length],
    }))
  );
  const scheduleBlocks = normalizeBlocks(plan.scheduleBlocks?.length ? plan.scheduleBlocks : fallbackBlocks);
  const sessionId = (block: StudyPlanBlock) => `${plan.id}-${block.day}-${block.hour}-${getBlockMinute(block)}-${block.subject}`.toLowerCase().replace(/[^a-z0-9-]+/g, '-');
  const sessions = scheduleBlocks.map(block => ({
    id: sessionId(block),
    subject: block.subject,
    day: block.day,
    hour: block.hour,
    minute: getBlockMinute(block),
    time: formatBlockTime(block),
    duration: formatDuration(block),
    color: block.color,
  }));

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
            updateStudyPlan(plan.id, {
              ...plan,
              scheduleBlocks,
              completedSessionIds: Array.from(next),
            }).catch(console.error);
            return next;
          });
        }},
      ]
    );
  };

  const remindSession = async (subject: string, day: number, hour: number, minute: number) => {
    try {
      await scheduleStudyReminder({
        title: `Study: ${subject}`,
        body: `${plan.name} starts soon.`,
        day,
        hour,
        minute,
      });
      Alert.alert('Reminder set', `Orbit will remind you 15 minutes before ${subject}.`);
    } catch (error: any) {
      Alert.alert('Reminder unavailable', error?.message || 'Could not schedule this reminder.');
    }
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
        <TouchableOpacity onPress={onEdit} style={pd.editBtn}>
          <Text style={pd.editText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete}>
          <Text style={pd.deleteText}>Delete</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 130 }}>
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
                <Text style={pd.sessionTime}>{sess.time} · {sess.duration}</Text>
              </View>
              <TouchableOpacity style={pd.reminderBtn} onPress={() => remindSession(sess.subject, sess.day, sess.hour, sess.minute)}>
                <Text style={pd.reminderText}>Remind</Text>
              </TouchableOpacity>
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
                <Text style={pd.sessionTime}>{DAY_NAMES[sess.day]} · {sess.time} · {sess.duration}</Text>
              </View>
              <TouchableOpacity style={pd.reminderBtn} onPress={() => remindSession(sess.subject, sess.day, sess.hour, sess.minute)}>
                <Text style={pd.reminderText}>Remind</Text>
              </TouchableOpacity>
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
  editBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.input },
  editText: { color: colors.foreground, fontSize: 12, fontWeight: '800' },
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
  reminderBtn: { height: 34, paddingHorizontal: 12, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.input, borderWidth: 1, borderColor: colors.border, marginRight: 10 },
  reminderText: { color: colors.muted, fontSize: 11, fontWeight: '900' },
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
  const [editingPlan, setEditingPlan] = useState<StudyPlan | null>(null);
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

  const planDates = useMemo(() => {
    const s = new Set<string>();
    for (let day = 1; day <= getDaysInMonth(calYear, calMonth); day += 1) {
      const date = new Date(calYear, calMonth, day);
      const hasSession = plans.some(plan => (plan.scheduleBlocks || []).some(block => block.day === date.getDay()));
      if (hasSession) {
        s.add(`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`);
      }
    }
    return s;
  }, [plans, calYear, calMonth]);

  const selectedSessions = useMemo(() => plans.flatMap((plan, planIndex) =>
    (plan.scheduleBlocks || []).filter(block => block.day === selectedDate.getDay()).map(block => ({
      plan,
      block,
      color: block.color || PLAN_COLORS[planIndex % PLAN_COLORS.length],
    }))
  ), [plans, selectedDate]);

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
    return <PlanDetail
      plan={selectedPlan}
      onBack={() => setSelectedPlan(null)}
      onDelete={() => handleDelete(selectedPlan.id)}
      onEdit={() => {
        setEditingPlan(selectedPlan);
        setSelectedPlan(null);
        setShowCreate(true);
      }}
    />;
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
      <CreatePlanModal
        visible={showCreate}
        initialPlan={editingPlan}
        onClose={() => { setShowCreate(false); setEditingPlan(null); }}
        onSave={p => {
          setPlans(prev => editingPlan ? prev.map(plan => plan.id === p.id ? p : plan) : [p, ...prev]);
          setEditingPlan(null);
        }}
      />

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
        contentContainerStyle={{ paddingBottom: 130 }}>

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

        {selectedSessions.length === 0 ? (
          <View style={pl.dayActionCard}>
            <Text style={pl.dayActionTitle}>Nothing scheduled on this day</Text>
            <Text style={pl.dayActionSub}>Create a plan or modify an existing one to place study sessions here.</Text>
            <TouchableOpacity style={pl.dayActionBtn} onPress={() => setShowCreate(true)}>
              <Text style={pl.dayActionBtnText}>Add Plan</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={pl.dayActionCard}>
            <Text style={pl.dayActionTitle}>Scheduled sessions</Text>
            {selectedSessions.map(({ plan, block, color }) => (
              <View key={`${plan.id}-${block.day}-${block.hour}-${getBlockMinute(block)}-${block.subject}`} style={pl.daySession}>
                <View style={[pl.daySessionBar, { backgroundColor: color }]} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={pl.daySessionTitle} numberOfLines={1}>{block.subject}</Text>
                  <Text style={pl.daySessionMeta}>{plan.name} · {formatBlockTime(block)} · {formatDuration(block)}</Text>
                </View>
                <TouchableOpacity style={pl.daySessionBtn} onPress={() => { setEditingPlan(plan); setShowCreate(true); }}>
                  <Text style={pl.daySessionBtnText}>Modify</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[pl.daySessionBtn, pl.daySessionDelete]} onPress={() => handleDelete(plan.id)}>
                  <Text style={[pl.daySessionBtnText, { color: colors.red }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {plans.length === 0 ? (
          <View style={pl.empty}>
            <Text style={pl.emptyTitle}>No study plans yet</Text>
            <Text style={pl.emptySub}>Create one with AI to get your schedule</Text>
            <TouchableOpacity style={pl.emptyBtn} onPress={() => setShowCreate(true)}>
              <Text style={pl.emptyBtnText}>Create with AI</Text>
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
  addBtnText: { color: colors.onPrimary, fontSize: 13, fontWeight: '800' },
  statsRow: { flexDirection: 'row', gap: 8, marginHorizontal: spacing.md, marginTop: spacing.md },
  statCard: { flex: 1, backgroundColor: colors.card, borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  statValue: { color: colors.primary, fontSize: 22, fontWeight: '900' },
  statLabel: { color: colors.muted, fontSize: 10, marginTop: 2, fontWeight: '600' },
  sectionLabel: { color: colors.foreground, fontSize: 15, fontWeight: '800', paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: 8, letterSpacing: -0.2 },
  dayActionCard: { marginHorizontal: spacing.md, marginBottom: spacing.md, backgroundColor: colors.card, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: 10 },
  dayActionTitle: { color: colors.foreground, fontSize: 15, fontWeight: '800' },
  dayActionSub: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  dayActionBtn: { alignSelf: 'flex-start', backgroundColor: colors.primary, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8 },
  dayActionBtnText: { color: colors.onPrimary, fontSize: 12, fontWeight: '800' },
  daySession: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.input, padding: 10 },
  daySessionBar: { width: 4, height: 42, borderRadius: 4 },
  daySessionTitle: { color: colors.foreground, fontSize: 13, fontWeight: '800' },
  daySessionMeta: { color: colors.muted, fontSize: 11, marginTop: 2 },
  daySessionBtn: { borderRadius: 10, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 8, paddingVertical: 6 },
  daySessionDelete: { borderColor: colors.red + '35' },
  daySessionBtnText: { color: colors.foreground, fontSize: 10, fontWeight: '800' },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyTitle: { color: colors.foreground, fontSize: 17, fontWeight: '700' },
  emptySub: { color: colors.muted, fontSize: 13 },
  emptyBtn: { marginTop: 8, backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 16 },
  emptyBtnText: { color: colors.onPrimary, fontSize: 14, fontWeight: '800' },
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
