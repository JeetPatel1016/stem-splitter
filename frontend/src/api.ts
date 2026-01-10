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

export const downloadStem = (jobId: string, stem: string): string => {
  return `${API_URL}/download/${jobId}/${stem}`;
};

export const deleteJob = async (jobId: string): Promise<void> => {
  await api.delete(`/job/${jobId}`);
};

export default api;
