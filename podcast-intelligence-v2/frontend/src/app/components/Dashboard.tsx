"use client";

import { useState, useCallback, useRef } from "react";
import { UploadCloud, FileAudio, X, CheckCircle2, Loader2, AlertCircle, Mic, Video, Link, Download } from "lucide-react";
import type { Podcast } from "@/app/page";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface DashboardProps {
  onPodcastReady: (podcast: Podcast) => void;
}

type UploadState = "idle" | "dragging" | "uploading" | "processing" | "done" | "error";

export default function Dashboard({ onPodcastReady }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<"upload" | "youtube">("upload");
  
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [processingStatus, setProcessingStatus] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // YouTube specific states
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [audioAvailable, setAudioAvailable] = useState(false);
  const [youtubeVideoId, setYoutubeVideoId] = useState("");

  const ACCEPTED_TYPES = ["audio/mpeg", "audio/mp4", "audio/wav", "audio/x-m4a", "audio/ogg", "audio/webm", "video/mp4"];
  const MAX_FILE_SIZE_MB = 500;

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type) && !file.name.match(/\.(mp3|mp4|wav|m4a|ogg|webm)$/i)) {
      return "Unsupported file type. Please upload an MP3, MP4, WAV, M4A, OGG, or WebM file.";
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      return `File too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.`;
    }
    return null;
  };

  const handleFile = (file: File) => {
    const error = validateFile(file);
    if (error) {
      setErrorMessage(error);
      setUploadState("error");
      return;
    }
    setSelectedFile(file);
    setUploadState("idle");
    setErrorMessage("");
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setUploadState("idle");
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setUploadState("dragging");
  }, []);

  const handleDragLeave = useCallback(() => {
    setUploadState("idle");
  }, []);

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploadState("uploading");
    setUploadProgress(0);
    setErrorMessage("");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      // Simulate progress since fetch doesn't expose upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 12, 85));
      }, 200);

      const response = await fetch(`${API_URL}/api/v1/analyze`, {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Server error: ${response.status}`);
      }

      const podcast: Podcast = await response.json();

      if (podcast.status === "processing") {
        setUploadState("processing");
        setProcessingStatus("Transcribing audio with Whisper…");
        // Poll for completion
        await pollForCompletion(podcast.id);
      } else {
        setUploadState("done");
        onPodcastReady(podcast);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown upload error";
      setErrorMessage(message);
      setUploadState("error");
    }
  };

  const handleYouTubeExtract = async () => {
    if (!youtubeUrl) return;

    setIsExtracting(true);
    setErrorMessage("");

    try {
      const response = await fetch(`${API_URL}/api/v1/audio/extract-youtube`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: youtubeUrl }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Server error: ${response.status}`);
      }

      const data = await response.json();

      if (data.status === "success") {
        setErrorMessage("");
        setAudioAvailable(data.audioAvailable || false);
        if (data.video_id) setYoutubeVideoId(data.video_id);

        setUploadState("done");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown extraction error";
      setErrorMessage(message);
      setUploadState("error");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleTranscribeLocal = async () => {
    if (!youtubeVideoId) return;

    setUploadState("uploading");
    setUploadProgress(100);
    setErrorMessage("");

    try {
      const response = await fetch(`${API_URL}/api/v1/analyze/local/${youtubeVideoId}`, {
        method: "POST",
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Server error: ${response.status}`);
      }

      const podcast: Podcast = await response.json();

      if (podcast.status === "processing") {
        setUploadState("processing");
        setProcessingStatus("Transcribing audio with Whisper…");
        // Poll for completion
        await pollForCompletion(podcast.id);
      } else {
        setUploadState("done");
        onPodcastReady(podcast);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown analysis error";
      setErrorMessage(message);
      setUploadState("error");
    }
  };

  const pollForCompletion = async (podcastId: string) => {
    const statuses = [
      "Transcribing audio with Whisper…",
      "Segmenting semantic chapters…",
      "Running sentiment analysis with LLaMA 3.3…",
      "Finalising and saving to database…",
    ];
    let statusIdx = 0;

    return new Promise<void>((resolve, reject) => {
      const interval = setInterval(async () => {
        try {
          statusIdx = (statusIdx + 1) % statuses.length;
          setProcessingStatus(statuses[statusIdx]);

          const res = await fetch(`${API_URL}/api/v1/analyze/${podcastId}`);
          if (!res.ok) return;
          const podcast: Podcast = await res.json();

          if (podcast.status === "completed") {
            clearInterval(interval);
            setUploadState("done");
            onPodcastReady(podcast);
            resolve();
          } else if (podcast.status === "failed") {
            clearInterval(interval);
            setErrorMessage("Processing failed on the server. Check backend logs.");
            setUploadState("error");
            reject(new Error("Processing failed"));
          }
        } catch {
          // Retry silently
        }
      }, 3000);
    });
  };

  const reset = () => {
    setUploadState("idle");
    setSelectedFile(null);
    setUploadProgress(0);
    setErrorMessage("");
    setProcessingStatus("");
    setYoutubeUrl("");
    setIsExtracting(false);
    setAudioAvailable(false);
    setYoutubeVideoId("");
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <Mic size={12} />
            AI-Powered Transcription
          </div>
          <h2 className="text-3xl font-bold text-white">Import Your Podcast</h2>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            Upload an audio file or import directly from YouTube to generate a full transcript, semantic chapters, and sentiment analysis.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex p-1 bg-white/[0.03] border border-white/10 rounded-xl max-w-sm mx-auto">
          <button
            onClick={() => { setActiveTab("upload"); reset(); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === "upload" ? "bg-indigo-500/20 text-indigo-300 shadow-sm" : "text-slate-400 hover:text-slate-300 hover:bg-white/5"
            }`}
          >
            <UploadCloud size={16} />
            Direct File Upload
          </button>
          <button
            onClick={() => { setActiveTab("youtube"); reset(); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === "youtube" ? "bg-red-500/20 text-red-400 shadow-sm" : "text-slate-400 hover:text-slate-300 hover:bg-white/5"
            }`}
          >
            <Video size={16} />
            YouTube Link
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "upload" && (
          <div
            id="upload-dropzone"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => !selectedFile && fileInputRef.current?.click()}
            className={`
              relative rounded-2xl border-2 border-dashed transition-all duration-300 p-12 text-center cursor-pointer
              ${uploadState === "dragging"
                ? "border-indigo-500 bg-indigo-500/10 scale-[1.01]"
                : selectedFile
                ? "border-emerald-500/40 bg-emerald-500/5 cursor-default"
                : "border-white/10 bg-white/[0.02] hover:border-indigo-500/50 hover:bg-indigo-500/5"
              }
            `}
          >
            <input
              ref={fileInputRef}
              id="file-input"
              type="file"
              className="hidden"
              accept=".mp3,.mp4,.wav,.m4a,.ogg,.webm"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />

            {!selectedFile ? (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-300
                    ${uploadState === "dragging" ? "bg-indigo-500/30 scale-110" : "bg-indigo-500/10"}`}>
                    <UploadCloud
                      size={36}
                      className={`transition-colors duration-300 ${uploadState === "dragging" ? "text-indigo-300" : "text-indigo-500/60"}`}
                    />
                  </div>
                </div>
                <div>
                  <p className="text-slate-300 font-semibold text-lg">
                    {uploadState === "dragging" ? "Drop it here!" : "Drag & drop your audio file"}
                  </p>
                  <p className="text-slate-500 text-sm mt-1">
                    or <span className="text-indigo-400 hover:text-indigo-300 cursor-pointer font-medium">browse</span> to choose a file
                  </p>
                </div>
                <p className="text-slate-600 text-xs">MP3 · MP4 · WAV · M4A · OGG · WebM — up to 500MB</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 flex items-center justify-center border border-emerald-500/20">
                    <FileAudio size={28} className="text-emerald-400" />
                  </div>
                </div>
                <div>
                  <p className="text-white font-semibold text-base">{selectedFile.name}</p>
                  <p className="text-slate-500 text-sm mt-0.5">{formatFileSize(selectedFile.size)}</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); reset(); }}
                  className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/10 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === "youtube" && (
          <div className="p-8 rounded-2xl border border-white/10 bg-white/[0.02]">
            <div className="space-y-4">
               <div className="flex justify-center mb-6">
                 <div className="w-20 h-20 rounded-2xl flex items-center justify-center bg-red-500/10 text-red-500/60 border border-red-500/20">
                    <Video size={36} />
                 </div>
               </div>
               <div className="space-y-2">
                 <label htmlFor="youtube-url" className="text-sm font-medium text-slate-300 flex items-center gap-2">
                   <Link size={14} className="text-slate-500" />
                   YouTube Video Link
                 </label>
                 <input
                   id="youtube-url"
                   type="text"
                   placeholder="Paste YouTube video URL here..."
                   value={youtubeUrl}
                   onChange={(e) => setYoutubeUrl(e.target.value)}
                   disabled={isExtracting || uploadState === "processing"}
                   className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all disabled:opacity-50"
                 />
               </div>
               
               <button
                 onClick={handleYouTubeExtract}
                 disabled={!youtubeUrl || isExtracting || uploadState === "processing"}
                 className="w-full py-3.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-semibold text-sm transition-all duration-200 shadow-lg shadow-red-500/20 hover:shadow-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 {isExtracting ? (
                   <span className="flex items-center justify-center gap-2">
                     <Loader2 size={18} className="animate-spin" />
                     Extracting Audio...
                   </span>
                 ) : (
                   "Extract Audio MP3"
                 )}
               </button>
            </div>
          </div>
        )}

        {/* Upload progress bar */}
        {(uploadState === "uploading" || uploadState === "processing") && !isExtracting && (
          <div className="glass-panel rounded-xl p-5 space-y-3 bg-white/5 border border-white/10 mt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Loader2 size={16} className="text-indigo-400 animate-spin" />
                <span className="text-sm font-medium text-slate-300">
                  {uploadState === "uploading" ? "Uploading…" : processingStatus}
                </span>
              </div>
              {uploadState === "uploading" && (
                <span className="text-sm text-indigo-400 font-semibold tabular-nums">{uploadProgress}%</span>
              )}
            </div>
            {uploadState === "uploading" && (
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}
          </div>
        )}

        {/* Error state */}
        {uploadState === "error" && errorMessage && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 mt-4">
            <AlertCircle size={20} className="text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-amber-400 text-sm font-semibold mb-1">Action Required</h4>
              <p className="text-red-200 text-sm leading-relaxed">{errorMessage}</p>
              <button onClick={reset} className="text-xs text-red-400/80 hover:text-red-300 mt-2 font-medium underline underline-offset-2">
                Clear Error
              </button>
            </div>
          </div>
        )}

        {/* Success state */}
        {uploadState === "done" && (
          <div className="flex flex-col gap-3 p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 mt-4 shadow-lg shadow-emerald-500/5">
            <div className="flex items-center gap-3">
              <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0" />
              <p className="text-emerald-300 text-sm font-medium">
                {activeTab === "youtube" ? "Audio extracted successfully! You can download the MP3 or transcribe it directly." : "Analysis complete! Redirecting to Analytics view in a few seconds…"}
              </p>
            </div>
            
            <div className="pt-3 border-t border-emerald-500/10 flex flex-wrap gap-3">
              {audioAvailable && (
                <>
                  <a 
                    href={`${API_URL}/api/v1/audio/download-local/${youtubeVideoId}`} 
                    download 
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-sm font-semibold transition-all duration-200 border border-emerald-500/30 hover:border-emerald-500/50"
                  >
                    <Download size={16} />
                    Download MP3
                  </a>
                  <button
                    onClick={handleTranscribeLocal}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-sm font-semibold transition-all duration-200 border border-indigo-500/30 hover:border-indigo-500/50"
                  >
                    <Mic size={16} />
                    Transcribe Extracted MP3
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Upload CTA for File Upload Tab */}
        {activeTab === "upload" && selectedFile && uploadState !== "uploading" && uploadState !== "processing" && uploadState !== "done" && uploadState !== "error" && (
          <button
            id="btn-analyze"
            onClick={handleUpload}
            className="w-full py-3.5 mt-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-sm transition-all duration-200 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:scale-[1.01] active:scale-[0.99]"
          >
            Analyze Podcast with AI
          </button>
        )}
      </div>
    </div>
  );
}
