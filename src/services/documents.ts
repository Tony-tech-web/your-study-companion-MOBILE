import api from './api';
import { Document } from '../types';

export const getDocuments = async (): Promise<Document[]> => {
  const response = await api.get('/api/pdfs');
  return response.data.map((pdf: any) => ({
    id: pdf.id,
    name: pdf.file_name,
    uploadedAt: new Date(pdf.uploaded_at).toLocaleDateString(),
    size: pdf.file_size || '0KB',
    category: 'General',
    totalPages: pdf.total_pages || 0,
    scannedPages: pdf.scanned_pages || 0,
  }));
};

export const deleteDocument = async (id: string): Promise<void> => {
  await api.delete(`/api/pdfs/${id}`);
};

export const scanDocument = async (id: string, pages: number = 2): Promise<Document> => {
  const response = await api.post(`/api/pdfs/${id}/scan`, { pages });
  const pdf = response.data;
  return {
    id: pdf.id,
    name: pdf.file_name,
    uploadedAt: new Date(pdf.uploaded_at).toLocaleDateString(),
    size: pdf.file_size || '0KB',
    category: 'General',
    totalPages: pdf.total_pages || 0,
    scannedPages: pdf.scanned_pages || 0,
  };
};
