import api from './api';

export interface ProfileUpdatePayload {
  full_name?: string;
  phone_number?: string;
  avatar_url?: string;
  matric_number?: string;
  field_of_study?: string;
}

export async function getMyProfile() {
  const response = await api.get('/api/profiles/me');
  return response.data;
}

export async function updateMyProfile(payload: ProfileUpdatePayload) {
  const response = await api.put('/api/profiles/me', payload);
  return response.data;
}
