import api from './api';

export const deactivateAccount = async () => {
  const response = await api.post('/api/account/deactivate');
  return response.data;
};

export const deleteAccount = async () => {
  await api.delete('/api/account');
};
