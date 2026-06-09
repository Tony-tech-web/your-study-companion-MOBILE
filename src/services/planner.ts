import api from './api';
import { StudyPlan, StudyPlanBlock } from '../types';

interface PlanPayload {
  subjects: string[];
  scheduleBlocks: StudyPlanBlock[];
  completedSessionIds: string[];
}

const parseJson = (raw: any) => {
  if (typeof raw !== 'string') return raw;
  try { return JSON.parse(raw || '[]'); } catch { return []; }
};

const normalizePlanPayload = (raw: any): PlanPayload => {
  const parsed = parseJson(raw);
  if (parsed && !Array.isArray(parsed) && typeof parsed === 'object') {
    const subjectsRaw = Array.isArray(parsed.subjects) ? parsed.subjects : [];
    return {
      subjects: subjectsRaw.map((s: any) => typeof s === 'string' ? s : (s?.name || s?.title || String(s))).filter(Boolean),
      scheduleBlocks: Array.isArray(parsed.scheduleBlocks) ? parsed.scheduleBlocks : [],
      completedSessionIds: Array.isArray(parsed.completedSessionIds) ? parsed.completedSessionIds : [],
    };
  }

  const arr = Array.isArray(parsed) ? parsed : [];
  return {
    subjects: arr.map((s: any) => typeof s === 'string' ? s : (s?.name || s?.title || String(s))).filter(Boolean),
    scheduleBlocks: [],
    completedSessionIds: [],
  };
};

const calculateProgress = (payload: PlanPayload, fallback = 0) => {
  const total = payload.scheduleBlocks.length;
  if (total === 0) return fallback;
  return Math.round((payload.completedSessionIds.length / total) * 100);
};

const toApiSubjects = (data: Partial<StudyPlan>) => ({
  subjects: data.subjects || [],
  scheduleBlocks: data.scheduleBlocks || [],
  completedSessionIds: data.completedSessionIds || [],
});

const normalizePlan = (plan: any): StudyPlan => {
  const payload = normalizePlanPayload(plan.subjects);
  return {
    id: plan.id,
    name: plan.name,
    subjects: payload.subjects,
    progress: calculateProgress(payload, plan.progress || 0),
    totalHours: plan.total_hours || 0,
    scheduleBlocks: payload.scheduleBlocks,
    completedSessionIds: payload.completedSessionIds,
  };
};

export const getStudyPlans = async (): Promise<StudyPlan[]> => {
  const response = await api.get('/api/study-plans');
  return response.data.map(normalizePlan);
};

export const createStudyPlan = async (data: Partial<StudyPlan>): Promise<StudyPlan> => {
  const response = await api.post('/api/study-plans', {
    name: data.name,
    subjects: toApiSubjects(data),
    total_hours: data.totalHours,
  });
  return normalizePlan(response.data);
};

export const updateStudyPlan = async (id: string, data: Partial<StudyPlan>): Promise<StudyPlan> => {
  const response = await api.put(`/api/study-plans/${id}`, {
    name: data.name,
    subjects: toApiSubjects(data),
    total_hours: data.totalHours,
  });
  return normalizePlan(response.data);
};

export const deleteStudyPlan = async (id: string): Promise<void> => {
  await api.delete(`/api/study-plans/${id}`);
};

export const randomizeStudyPlan = async (data: {
  subjects: string[];
  totalHours: number;
  daysPerWeek?: number;
}): Promise<{ blocks: StudyPlanBlock[]; summary: string }> => {
  const response = await api.post('/api/study-plans/randomize', {
    subjects: data.subjects,
    total_hours: data.totalHours,
    days_per_week: data.daysPerWeek || 5,
  });
  return response.data;
};
