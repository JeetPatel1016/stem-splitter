import axios from 'axios';
import { type APIResponse, type JobStatusResponse } from './types';

const API_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface SeparationParams {
  model?: string;
  shifts?: number;
  overlap?: number;
  split?: boolean;
}

export const uploadFile = async (file: File, params?: SeparationParams): Promise<APIResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  // Build query params
  const queryParams = new URLSearchParams();
  if (params?.model) queryParams.append('model', params.model);
  if (params?.shifts !== undefined) queryParams.append('shifts', params.shifts.toString());
  if (params?.overlap !== undefined) queryParams.append('overlap', params.overlap.toString());
  if (params?.split !== undefined) queryParams.append('split', params.split.toString());

  const url = `/upload${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

  const response = await api.post<APIResponse>(url, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};

export const submitURL = async (url: string, params?: SeparationParams): Promise<APIResponse> => {
  const response = await api.post<APIResponse>('/submit-url', { url, params });
  return response.data;
};

export const getJobStatus = async (jobId: string): Promise<JobStatusResponse> => {
  const response = await api.get<JobStatusResponse>(`/status/${jobId}`);
  return response.data;
};

export const downloadStem = async (jobId: string, stem: string): Promise<void> => {
  // URL encode the stem filename to handle spaces and special characters
  const encodedStem = encodeURIComponent(stem);
  const response = await api.get(`/download/${jobId}/${encodedStem}`, {
    responseType: 'blob',
  });

  // Create a blob URL and trigger download
  const blob = new Blob([response.data], { type: 'audio/wav' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = stem; // Use the original filename
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export const downloadAllStems = async (jobId: string, filename: string): Promise<void> => {
  const response = await api.get(`/download-all/${jobId}`, {
    responseType: 'blob',
  });

  // Create a blob URL and trigger download
  const blob = new Blob([response.data], { type: 'application/zip' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename} - stems.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export const deleteJob = async (jobId: string): Promise<void> => {
  await api.delete(`/job/${jobId}`);
};

export default api;
