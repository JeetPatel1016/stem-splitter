import { useState, useCallback } from "react";
import FileUpload from "./components/FileUpload";
import URLInput from "./components/URLInput";
import JobStatus from "./components/JobStatus";
import { type Job } from "./types";
import { ThemeProvider } from "./components/theme-provider";

function App() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [activeTab, setActiveTab] = useState<"upload" | "url">("upload");

  const addJob = useCallback((job: Job) => {
    setJobs((prev) => [job, ...prev]);
  }, []);

  const updateJob = useCallback((jobId: string, updates: Partial<Job>) => {
    setJobs((prev) =>
      prev.map((job) => (job.job_id === jobId ? { ...job, ...updates } : job))
    );
  }, []);

  const removeJob = useCallback((jobId: string) => {
    setJobs((prev) => prev.filter((job) => job.job_id !== jobId));
  }, []);

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <div className="min-h-screen bg-linear-to-br from-purple-500 via-pink-500 to-red-500">
        <div className="container mx-auto px-4 py-8">
          <header className="text-center mb-12">
            <h1 className="text-5xl font-bold text-white mb-4">
              Stem Splitter
            </h1>
            <p className="text-xl text-white opacity-90">
              Separate your music into individual tracks - vocals, drums, bass,
              and more
            </p>
          </header>

          <div className="max-w-4xl mx-auto">
            {/* Input Section */}
            <div className="bg-white rounded-2xl shadow-2xl p-8 mb-8">
              {/* Tab Buttons */}
              <div className="flex gap-4 mb-6 border-b border-gray-200">
                <button
                  onClick={() => setActiveTab("upload")}
                  className={`pb-4 px-4 font-semibold transition-colors ${
                    activeTab === "upload"
                      ? "text-purple-600 border-b-2 border-purple-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Upload File
                </button>
                <button
                  onClick={() => setActiveTab("url")}
                  className={`pb-4 px-4 font-semibold transition-colors ${
                    activeTab === "url"
                      ? "text-purple-600 border-b-2 border-purple-600"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  From URL
                </button>
              </div>

              {/* Tab Content */}
              {activeTab === "upload" ? (
                <FileUpload onJobCreated={addJob} />
              ) : (
                <URLInput onJobCreated={addJob} />
              )}
            </div>

            {/* Jobs Section */}
            {jobs.length > 0 && (
              <div className="bg-white rounded-2xl shadow-2xl p-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">
                  Processing Jobs
                </h2>
                <div className="space-y-4">
                  {jobs.map((job) => (
                    <JobStatus
                      key={job.job_id}
                      job={job}
                      onUpdate={updateJob}
                      onRemove={removeJob}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <footer className="text-center mt-12 text-white opacity-75">
            <p>Powered by Demucs AI Model</p>
          </footer>
        </div>
      </div>
    </ThemeProvider>
  );
}

export default App;
