export interface Job {
  job_id: string;
  filename: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress?: number;
  message?: string;
  stems?: string[];
}

export interface APIResponse {
  job_id: string;
  filename: string;
  message: string;
}

export interface JobStatusResponse {
  job_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress?: number;
  message?: string;
  stems?: string[];
}
