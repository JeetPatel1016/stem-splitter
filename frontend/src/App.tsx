import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  Link2,
  Music,
  Mic2,
  Drum,
  Guitar,
  Waves,
  Download,
  Loader2,
  CheckCircle2,
  X,
  Volume2,
  Pause,
  Play
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { uploadFile, submitURL, getJobStatus, downloadStem } from "./api";

type ProcessingState = "idle" | "uploading" | "processing" | "complete" | "error";

interface Stem {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState("file");
  const [url, setUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [processingState, setProcessingState] = useState<ProcessingState>("idle");
  const [overallProgress, setOverallProgress] = useState(0);
  const [playingStems, setPlayingStems] = useState<string[]>([]);
  const [numTracks, setNumTracks] = useState("htdemucs");
  const [separationQuality, setSeparationQuality] = useState(1);
  const [processingPrecision, setProcessingPrecision] = useState(1);
  const [memoryOptimization, setMemoryOptimization] = useState(true);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [availableStems, setAvailableStems] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const qualityLabels = ["Fast", "Balanced", "High"];
  const precisionLabels = ["Standard", "Enhanced", "Maximum"];

  const stems: Stem[] = [
    { id: "vocals", name: "Vocals", icon: <Mic2 className="w-6 h-6" />, color: "from-violet-500 to-purple-600" },
    { id: "drums", name: "Drums", icon: <Drum className="w-6 h-6" />, color: "from-cyan-500 to-teal-600" },
    { id: "bass", name: "Bass", icon: <Guitar className="w-6 h-6" />, color: "from-pink-500 to-rose-600" },
    { id: "other", name: "Other", icon: <Waves className="w-6 h-6" />, color: "from-amber-500 to-orange-600" },
  ];

  const pollJobStatus = async (jobId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const status = await getJobStatus(jobId);

        if (status.progress !== undefined) {
          setOverallProgress(status.progress);
        }

        if (status.status === "processing") {
          setProcessingState("processing");
        } else if (status.status === "completed") {
          clearInterval(pollInterval);
          setProcessingState("complete");
          setOverallProgress(100);
          if (status.stems) {
            setAvailableStems(status.stems);
          }
        } else if (status.status === "failed") {
          clearInterval(pollInterval);
          setProcessingState("error");
          setErrorMessage(status.message || "Processing failed");
        }
      } catch (error) {
        console.error("Error polling job status:", error);
      }
    }, 2000);

    // Stop polling after 10 minutes
    setTimeout(() => clearInterval(pollInterval), 600000);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      setProcessingState("uploading");
      setOverallProgress(0);
      setErrorMessage("");

      try {
        const shiftsMap = [0, 1, 5];
        const overlapMap = [0.25, 0.4, 0.7];

        const response = await uploadFile(file, {
          model: numTracks,
          shifts: shiftsMap[separationQuality],
          overlap: overlapMap[processingPrecision],
          split: memoryOptimization,
        });

        setCurrentJobId(response.job_id);
        setProcessingState("processing");
        pollJobStatus(response.job_id);
      } catch (error) {
        setProcessingState("error");
        const err = error as { response?: { data?: { detail?: string } } };
        setErrorMessage(err.response?.data?.detail || "Failed to upload file");
      }
    }
  };

  const handleUrlSubmit = async () => {
    if (url.trim()) {
      setFileName(url.split("/").pop() || "audio-from-url.mp3");
      setProcessingState("uploading");
      setOverallProgress(0);
      setErrorMessage("");

      try {
        const shiftsMap = [0, 1, 5];
        const overlapMap = [0.25, 0.4, 0.7];

        const response = await submitURL(url, {
          model: numTracks,
          shifts: shiftsMap[separationQuality],
          overlap: overlapMap[processingPrecision],
          split: memoryOptimization,
        });

        setCurrentJobId(response.job_id);
        setProcessingState("processing");
        pollJobStatus(response.job_id);
      } catch (error) {
        setProcessingState("error");
        const err = error as { response?: { data?: { detail?: string } } };
        setErrorMessage(err.response?.data?.detail || "Failed to process URL");
      }
    }
  };

  const toggleStemPlay = (stemId: string) => {
    setPlayingStems((prev) =>
      prev.includes(stemId)
        ? prev.filter((id) => id !== stemId)
        : [...prev, stemId]
    );
  };

  const resetState = () => {
    setProcessingState("idle");
    setOverallProgress(0);
    setFileName("");
    setUrl("");
    setPlayingStems([]);
    setCurrentJobId(null);
    setAvailableStems([]);
    setErrorMessage("");
  };

  const handleDownloadStem = (stemId: string) => {
    if (currentJobId) {
      const downloadUrl = downloadStem(currentJobId, stemId);
      window.open(downloadUrl, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute inset-0 bg-gradient-radial from-primary/20 via-background to-background pointer-events-none" />

      <header className="relative z-10 border-b border-border/50 backdrop-blur-sm bg-background/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/20">
              <Music className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold tracking-tight">StemSplit</span>
          </div>
          <nav className="flex items-center gap-6">
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Docs</a>
            <Button variant="outline" size="sm">
              Sign In
            </Button>
          </nav>
        </div>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl md:text-6xl font-bold mb-4 tracking-tight">
            Split Audio Into <span className="text-primary">Stems</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            AI-powered stem separation. Extract vocals, drums, bass, and instrumentals from any audio file in seconds.
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {processingState === "idle" && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              <div className="backdrop-blur-sm bg-card/50 border border-border/50 rounded-2xl p-8 shadow-xl">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
                    <TabsTrigger value="file">
                      <Upload className="w-4 h-4 mr-2" />
                      Upload File
                    </TabsTrigger>
                    <TabsTrigger value="url">
                      <Link2 className="w-4 h-4 mr-2" />
                      From URL
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="file" className="mt-0">
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-border/50 rounded-xl p-12 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 group"
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="audio/*"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                        <Upload className="w-8 h-8 text-primary" />
                      </div>
                      <p className="text-lg font-medium mb-2">Drop your audio file here</p>
                      <p className="text-sm text-muted-foreground">or click to browse</p>
                      <p className="text-xs text-muted-foreground mt-4">Supports MP3, WAV, FLAC, M4A, OGG</p>
                    </div>
                  </TabsContent>

                  <TabsContent value="url" className="mt-0">
                    <div className="max-w-xl mx-auto">
                      <div className="flex gap-3">
                        <Input
                          type="url"
                          placeholder="Paste audio URL (YouTube, SoundCloud, direct link...)"
                          value={url}
                          onChange={(e) => setUrl(e.target.value)}
                          className="flex-1 h-12"
                        />
                        <Button
                          onClick={handleUrlSubmit}
                          disabled={!url.trim()}
                          className="h-12 px-8"
                        >
                          Fetch
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-3 text-center">
                        YouTube, SoundCloud, Spotify, and direct audio URLs supported
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="mt-8 pt-8 border-t border-border/30">
                  <h3 className="text-lg font-semibold mb-6 text-center">Processing Parameters</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="num-tracks" className="text-sm font-medium">Number of Tracks to Extract</Label>
                      <Select value={numTracks} onValueChange={setNumTracks}>
                        <SelectTrigger id="num-tracks">
                          <SelectValue placeholder="Select tracks" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="htdemucs">4 Tracks: Drums, Bass, Vocals, Other (Recommended)</SelectItem>
                          <SelectItem value="htdemucs_ft">4 Tracks: Drums, Bass, Vocals, Other (Fine-tuned)</SelectItem>
                          <SelectItem value="htdemucs_6s">6 Tracks: Drums, Bass, Vocals, Other, Guitar, Piano</SelectItem>
                          <SelectItem value="mdx_extra">4 Tracks: Drums, Bass, Vocals, Other (Alternative)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Separation Quality</Label>
                      <div className="px-1">
                        <input
                          type="range"
                          min="0"
                          max="2"
                          step="1"
                          value={separationQuality}
                          onChange={(e) => setSeparationQuality(Number(e.target.value))}
                          className="w-full h-2 bg-muted/50 rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-2">
                          {qualityLabels.map((label, i) => (
                            <span key={label} className={separationQuality === i ? "text-primary font-medium" : ""}>{label}</span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Processing Precision</Label>
                      <div className="px-1">
                        <input
                          type="range"
                          min="0"
                          max="2"
                          step="1"
                          value={processingPrecision}
                          onChange={(e) => setProcessingPrecision(Number(e.target.value))}
                          className="w-full h-2 bg-muted/50 rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-2">
                          {precisionLabels.map((label, i) => (
                            <span key={label} className={processingPrecision === i ? "text-primary font-medium" : ""}>{label}</span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between bg-muted/20 rounded-xl p-4 border border-border/30">
                      <div className="space-y-1">
                        <Label htmlFor="memory-optimization" className="text-sm font-medium cursor-pointer">Memory Optimization</Label>
                        <p className="text-xs text-muted-foreground">Recommended for audio files longer than 5 mins</p>
                      </div>
                      <Switch
                        id="memory-optimization"
                        checked={memoryOptimization}
                        onCheckedChange={setMemoryOptimization}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {(processingState === "uploading" || processingState === "processing") && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="backdrop-blur-sm bg-card/50 border border-border/50 rounded-2xl p-8 shadow-xl"
            >
              <div className="text-center mb-8">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6 animate-pulse">
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                </div>
                <h2 className="text-2xl font-semibold mb-2">
                  {processingState === "uploading" ? "Uploading..." : "Separating Stems..."}
                </h2>
                <p className="text-muted-foreground">{fileName}</p>
              </div>

              <div className="max-w-md mx-auto">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">
                    {processingState === "uploading" ? "Uploading" : "Processing"}
                  </span>
                  <span className="font-mono text-primary">{Math.round(overallProgress)}%</span>
                </div>
                <Progress value={overallProgress} className="h-2" />
              </div>

              {processingState === "processing" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8"
                >
                  {stems.map((stem, index) => (
                    <motion.div
                      key={stem.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-muted/30 rounded-xl p-4 text-center"
                    >
                      <div className={`w-10 h-10 rounded-lg bg-linear-to-br ${stem.color} flex items-center justify-center mx-auto mb-2 opacity-50`}>
                        {stem.icon}
                      </div>
                      <p className="text-sm font-medium text-muted-foreground">{stem.name}</p>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </motion.div>
          )}

          {processingState === "complete" && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              <div className="backdrop-blur-sm bg-card/50 border border-border/50 rounded-2xl p-8 shadow-xl">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-linear-to-br from-emerald-500 to-green-600 flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold">Separation Complete</h2>
                      <p className="text-sm text-muted-foreground">{fileName}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={resetState}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  {availableStems.map((stemName, index) => {
                    const stem = stems.find(s => s.id === stemName) || stems.find(s => s.name.toLowerCase() === stemName.toLowerCase()) || stems[index % stems.length];
                    return (
                      <motion.div
                        key={stemName}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-card/50 border border-border/50 rounded-xl p-5 hover:border-primary/30 transition-all group"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl bg-linear-to-br ${stem.color} flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform`}>
                            {stem.icon}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold capitalize">{stemName}</h3>
                            <p className="text-xs text-muted-foreground">WAV • 44.1kHz • Stereo</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleStemPlay(stemName)}
                              className="h-9 w-9 rounded-lg"
                            >
                              {playingStems.includes(stemName) ? (
                                <Pause className="w-4 h-4" />
                              ) : (
                                <Play className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-9 w-9 rounded-lg"
                              onClick={() => handleDownloadStem(stemName)}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        {playingStems.includes(stemName) && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            className="mt-4 pt-4 border-t border-border/30"
                          >
                            <div className="flex items-center gap-3">
                              <Volume2 className="w-4 h-4 text-muted-foreground" />
                              <div className="flex-1 h-8 bg-muted/30 rounded-lg overflow-hidden flex items-center gap-0.5 px-1">
                                {Array.from({ length: 40 }).map((_, i) => (
                                  <motion.div
                                    key={i}
                                    className={`w-1 rounded-full bg-linear-to-t ${stem.color}`}
                                    animate={{
                                      height: [8, Math.random() * 24 + 8, 8],
                                    }}
                                    transition={{
                                      duration: 0.5,
                                      repeat: Infinity,
                                      delay: i * 0.02,
                                    }}
                                  />
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    size="lg"
                    className="px-8"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Download All Stems
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={resetState}
                  >
                    Split Another Track
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {processingState === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              <div className="backdrop-blur-sm bg-card/50 border border-destructive/50 rounded-2xl p-8 shadow-xl">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                    <X className="w-8 h-8 text-destructive" />
                  </div>
                  <h2 className="text-2xl font-semibold mb-2">Processing Failed</h2>
                  <p className="text-muted-foreground mb-6">{errorMessage}</p>
                  <Button onClick={resetState}>Try Again</Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-20 text-center"
        >
          <p className="text-muted-foreground text-sm mb-6">Powered by state-of-the-art AI models</p>
          <div className="flex flex-wrap justify-center gap-8 opacity-40">
            {["Demucs", "Hybrid Transformer", "Deep Learning", "PyTorch"].map((tech) => (
              <span key={tech} className="text-sm font-mono">{tech}</span>
            ))}
          </div>
        </motion.div>
      </main>

      <footer className="relative z-10 border-t border-border/30 mt-20">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-linear-to-br from-primary to-primary/60 flex items-center justify-center">
              <Music className="w-3 h-3 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold">StemSplit</span>
          </div>
          <p className="text-xs text-muted-foreground">© 2026 StemSplit. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
