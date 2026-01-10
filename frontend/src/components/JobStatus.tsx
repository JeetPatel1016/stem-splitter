import React, { useEffect } from 'react';
import { getJobStatus, downloadStem, deleteJob } from '../api';
import { type Job } from '../types';

interface JobStatusProps {
  job: Job;
  onUpdate: (jobId: string, updates: Partial<Job>) => void;
  onRemove: (jobId: string) => void;
}

const JobStatus: React.FC<JobStatusProps> = ({ job, onUpdate, onRemove }) => {
  useEffect(() => {
    if (job.status === 'completed' || job.status === 'failed') {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const status = await getJobStatus(job.job_id);
        onUpdate(job.job_id, status);
      } catch (error) {
        console.error('Failed to fetch job status:', error);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [job.job_id, job.status, onUpdate]);

  const handleDelete = async () => {
    try {
      await deleteJob(job.job_id);
      onRemove(job.job_id);
    } catch (error) {
      console.error('Failed to delete job:', error);
    }
  };

  const getStatusColor = () => {
    switch (job.status) {
      case 'queued':
        return 'bg-blue-100 text-blue-800';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="border border-gray-200 rounded-xl p-6 bg-white shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-800 mb-1">{job.filename}</h3>
          <p className="text-sm text-gray-500">Job ID: {job.job_id.slice(0, 8)}</p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor()}`}
          >
            {job.status.toUpperCase()}
          </span>
          <button
            onClick={handleDelete}
            className="text-gray-400 hover:text-red-600 transition-colors"
            title="Delete job"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>

      {job.message && (
        <p className="text-sm text-gray-600 mb-3">{job.message}</p>
      )}

      {(job.status === 'queued' || job.status === 'processing') && (
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Progress</span>
            <span>{job.progress || 0}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-linear-to-r from-purple-600 to-pink-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${job.progress || 0}%` }}
            ></div>
          </div>
        </div>
      )}

      {job.status === 'completed' && job.stems && job.stems.length > 0 && (
        <div className="mt-4">
          <h4 className="font-semibold text-gray-700 mb-3">Download Stems:</h4>
          <div className="grid grid-cols-2 gap-3">
            {job.stems.map((stem) => (
              <a
                key={stem}
                href={downloadStem(job.job_id, stem)}
                download
                className="flex items-center justify-center gap-2 px-4 py-3 bg-linear-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-105"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                <span className="font-medium capitalize">{stem}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {job.status === 'failed' && (
        <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <p className="font-semibold">Processing failed</p>
          {job.message && <p className="text-sm mt-1">{job.message}</p>}
        </div>
      )}
    </div>
  );
};

export default JobStatus;
