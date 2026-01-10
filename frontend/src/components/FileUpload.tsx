import React, { useState, useCallback, useRef } from 'react';
import { uploadFile } from '../api';
import { type Job } from '../types';

interface FileUploadProps {
  onJobCreated: (job: Job) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onJobCreated }) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Separation parameters
  const [model, setModel] = useState('htdemucs');
  const [shifts, setShifts] = useState(1);
  const [overlap, setOverlap] = useState(0.25);
  const [split, setSplit] = useState(true);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setError(null);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const response = await uploadFile(file, { model, shifts, overlap, split });
      onJobCreated({
        job_id: response.job_id,
        filename: response.filename,
        status: 'queued',
        progress: 0,
        message: 'File uploaded successfully',
      });
      setFile(null);
      // Reset the file input element
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      const errorMessage = err instanceof Error
        ? err.message
        : typeof err === 'object' && err !== null && 'response' in err && typeof err.response === 'object' && err.response !== null && 'data' in err.response && typeof err.response.data === 'object' && err.response.data !== null && 'detail' in err.response.data
          ? String(err.response.data.detail)
          : 'Failed to upload file';
      setError(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          dragActive
            ? 'border-purple-500 bg-purple-50'
            : 'border-gray-300 hover:border-purple-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id="file-upload"
          ref={fileInputRef}
          accept=".mp3,.wav,.flac,.m4a,.ogg"
          onChange={handleChange}
          className="hidden"
        />
        <label
          htmlFor="file-upload"
          className="cursor-pointer flex flex-col items-center"
        >
          <svg
            className="w-16 h-16 text-gray-400 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <p className="text-lg font-medium text-gray-700 mb-2">
            {file ? file.name : 'Drag and drop your audio file here'}
          </p>
          <p className="text-sm text-gray-500">
            or click to browse (MP3, WAV, FLAC, M4A, OGG)
          </p>
        </label>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Advanced Options */}
      <div className="border border-gray-200 rounded-xl p-4">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between text-left font-medium text-gray-700 hover:text-gray-900"
        >
          <span>Advanced Options</span>
          <svg
            className={`w-5 h-5 transform transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showAdvanced && (
          <div className="mt-4 space-y-4">
            {/* Track Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of Tracks to Extract
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="htdemucs">4 Tracks: Drums, Bass, Vocals, Other (Recommended)</option>
                <option value="htdemucs_ft">4 Tracks: Drums, Bass, Vocals, Other (Fine-tuned)</option>
                <option value="htdemucs_6s">6 Tracks: Drums, Bass, Vocals, Other, Guitar, Piano</option>
                <option value="mdx_extra">4 Tracks: Drums, Bass, Vocals, Other (Alternative)</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Choose how many instrument tracks to separate. More tracks = longer processing.
              </p>
            </div>

            {/* Quality Slider */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Separation Quality: {shifts === 0 ? 'Fast' : shifts === 1 ? 'Balanced' : shifts <= 3 ? 'High' : 'Maximum'}
              </label>
              <input
                type="range"
                min="0"
                max="10"
                value={shifts}
                onChange={(e) => setShifts(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Fast (30s)</span>
                <span>Balanced (1m)</span>
                <span>High (2m)</span>
                <span>Max (5m+)</span>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Higher quality takes longer but produces cleaner separation results.
              </p>
            </div>

            {/* Precision Slider */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Processing Precision: {overlap <= 0.2 ? 'Standard' : overlap <= 0.4 ? 'Enhanced' : 'Maximum'}
              </label>
              <input
                type="range"
                min="0.1"
                max="0.9"
                step="0.05"
                value={overlap}
                onChange={(e) => setOverlap(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Standard</span>
                <span>Enhanced</span>
                <span>Maximum</span>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Higher precision reduces audio artifacts but increases processing time.
              </p>
            </div>

            {/* Memory Optimization Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Memory Optimization</label>
                <p className="text-xs text-gray-500">Recommended for files longer than 5 minutes</p>
              </div>
              <button
                type="button"
                onClick={() => setSplit(!split)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  split ? 'bg-purple-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    split ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={!file || uploading}
        className="w-full bg-linear-to-r from-purple-600 to-pink-600 text-white font-semibold py-4 px-6 rounded-xl hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105"
      >
        {uploading ? (
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
            Uploading...
          </span>
        ) : (
          'Upload and Split Stems'
        )}
      </button>
    </form>
  );
};

export default FileUpload;
