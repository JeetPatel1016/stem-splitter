import axios from 'axios';
import { type APIResponse, type JobStatusResponse } from './types';

const API_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const uploadFile = async (file: File): Promise<APIResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post<APIResponse>('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};

export const submitURL = async (url: string): Promise<APIResponse> => {
  const response = await api.post<APIResponse>('/submit-url', { url });
  return response.data;
};

export const getJobStatus = async (jobId: string): Promise<JobStatusResponse> => {
  const response = await api.get<JobStatusResponse>(`/status/${jobId}`);
  return response.data;
};

export const downloadStem = (jobId: string, stem: string): string => {
  return `${API_URL}/download/${jobId}/${stem}`;
};

export const deleteJob = async (jobId: string): Promise<void> => {
  await api.delete(`/job/${jobId}`);
};

export default api;
