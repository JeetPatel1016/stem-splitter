import React, { useState } from 'react';
import { submitURL } from '../api';
import { type Job } from '../types';

interface URLInputProps {
  onJobCreated: (job: Job) => void;
}

const URLInput: React.FC<URLInputProps> = ({ onJobCreated }) => {
  const [url, setUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await submitURL(url);
      onJobCreated({
        job_id: response.job_id,
        filename: response.filename,
        status: 'queued',
        progress: 0,
        message: 'URL submitted successfully',
      });
      setUrl('');
    } catch (err) {
      const errorMessage = err instanceof Error
        ? err.message
        : typeof err === 'object' && err !== null && 'response' in err && typeof err.response === 'object' && err.response !== null && 'data' in err.response && typeof err.response.data === 'object' && err.response.data !== null && 'detail' in err.response.data
          ? String(err.response.data.detail)
          : 'Failed to submit URL';
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label
          htmlFor="url-input"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Enter audio URL (YouTube, SoundCloud, etc.)
        </label>
        <input
          id="url-input"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!url.trim() || submitting}
        className="w-full bg-linear-to-r from-purple-600 to-pink-600 text-white font-semibold py-4 px-6 rounded-xl hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105"
      >
        {submitting ? (
          <span className="flex items-center justify-center">
            <svg
              className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Processing...
          </span>
        ) : (
          'Download and Split Stems'
        )}
      </button>

      <div className="text-sm text-gray-500 mt-4">
        <p className="font-medium mb-1">Supported platforms:</p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>YouTube</li>
          <li>SoundCloud</li>
          <li>Bandcamp</li>
          <li>And many more via yt-dlp</li>
        </ul>
      </div>
    </form>
  );
};

export default URLInput;
