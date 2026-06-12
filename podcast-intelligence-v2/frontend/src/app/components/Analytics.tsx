"use client";

import { useState } from "react";
import { 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  MessageSquare, 
  ChevronRight, 
  Layers, 
  ChevronDown, 
  ChevronUp, 
  Download, 
  Copy, 
  Check, 
  Search, 
  Mic 
} from "lucide-react";
import type { Podcast, Chapter } from "@/app/page";

interface AnalyticsProps {
  podcast: Podcast;
  onOpenChat: () => void;
}

const SentimentIcon = ({ sentiment }: { sentiment: string }) => {
  const s = sentiment?.toLowerCase();
  if (s === "positive") return <TrendingUp size={14} className="text-emerald-400" />;
  if (s === "negative") return <TrendingDown size={14} className="text-red-400" />;
  return <Minus size={14} className="text-amber-400" />;
};

const SentimentPill = ({ sentiment }: { sentiment: string }) => {
  const s = sentiment?.toLowerCase();
  const cls =
    s === "positive" ? "sentiment-pill-positive" :
    s === "negative" ? "sentiment-pill-negative" :
    "sentiment-pill-neutral";

  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${cls}`}>
      <SentimentIcon sentiment={sentiment} />
      {sentiment}
    </span>
  );
};

const ChapterCard = ({ chapter, index }: { chapter: Chapter; index: number }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className="glass-panel rounded-2xl border border-white/5 hover:border-indigo-500/20 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/5 group overflow-hidden"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-start justify-between gap-4 p-5 cursor-pointer select-none hover:bg-white/[0.01] transition-colors"
      >
        <div className="flex items-start gap-4 flex-1 min-w-0">
          {/* Chapter number */}
          <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-xs font-bold text-indigo-400 group-hover:bg-indigo-500/20 transition-colors">
            {String(index + 1).padStart(2, "0")}
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <h3 className="text-white font-semibold text-sm leading-snug truncate group-hover:text-indigo-200 transition-colors">
              {chapter.title}
            </h3>
            <div className="flex items-center gap-3 text-slate-500 text-[11px]">
              <div className="flex items-center gap-1">
                <Clock size={11} />
                <span className="font-mono">{chapter.timestamp}</span>
              </div>
              <span>•</span>
              <span className="capitalize">{chapter.sentiment} Sentiment</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <SentimentPill sentiment={chapter.sentiment} />
          <div className="text-slate-400 group-hover:text-slate-200 transition-colors">
            {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>
      </div>

      {/* Slide-down Summary */}
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isOpen ? "max-h-96 opacity-100 border-t border-white/5" : "max-h-0 opacity-0 pointer-events-none"
        }`}
      >
        <div className="p-5 bg-white/[0.01] text-slate-300 text-xs leading-relaxed space-y-2">
          {chapter.summary}
        </div>
      </div>

      {/* Slide Down Summary Toggle Bar */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-2 bg-indigo-500/5 hover:bg-indigo-500/10 border-t border-white/5 flex items-center justify-center gap-1.5 text-[11px] text-indigo-300 font-medium cursor-pointer transition-colors"
      >
        {isOpen ? "Hide Summary & Details" : "View Summary & Actions"}
        {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </div>
    </div>
  );
};

export default function Analytics({ podcast, onOpenChat }: AnalyticsProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [copied, setCopied] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  const chapters = podcast.generated_chapters ?? [];

  const sentimentCounts = chapters.reduce(
    (acc, ch) => {
      const s = ch.sentiment?.toLowerCase();
      if (s === "positive") acc.positive++;
      else if (s === "negative") acc.negative++;
      else acc.neutral++;
      return acc;
    },
    { positive: 0, neutral: 0, negative: 0 }
  );

  const wordCount = podcast.transcript_text ? podcast.transcript_text.trim().split(/\s+/).length : 0;
  const charCount = podcast.transcript_text ? podcast.transcript_text.length : 0;

  const handleCopy = () => {
    navigator.clipboard.writeText(podcast.transcript_text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(podcast, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    const safeFilename = podcast.filename.replace(/\.[^/.]+$/, "").replace(/[^a-z0-9]/gi, '_').toLowerCase();
    downloadAnchor.setAttribute("download", `${safeFilename}_analysis.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleDownloadPDF = async () => {
    try {
      setDownloadingPDF(true);
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);

      let y = 20;

      const checkPageBreak = (neededHeight: number) => {
        if (y + neededHeight > pageHeight - margin) {
          doc.addPage();
          y = margin;
          return true;
        }
        return false;
      };

      // Document Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(79, 70, 229); // Indigo 600
      doc.text("Podcast Intelligence Report", margin, y);
      y += 10;

      // Metadata
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139); // Slate 500
      doc.text(`Source File: ${podcast.filename}`, margin, y);
      y += 5;
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, margin, y);
      y += 5;
      doc.text(`Database ID: ${podcast.id}`, margin, y);
      y += 8;

      // Horizontal Rule
      doc.setDrawColor(226, 232, 240); // Slate 200
      doc.setLineWidth(0.5);
      doc.line(margin, y, margin + contentWidth, y);
      y += 10;

      // Chapters Section Header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42); // Slate 900
      doc.text("Semantic Chapters", margin, y);
      y += 8;

      chapters.forEach((chapter, index) => {
        const summaryLines = doc.splitTextToSize(chapter.summary, contentWidth - 10);
        const neededHeight = 15 + (summaryLines.length * 5);
        
        checkPageBreak(neededHeight);

        // Left accent bar
        doc.setDrawColor(99, 102, 241); // Indigo 500
        doc.setLineWidth(1);
        doc.line(margin, y - 4, margin, y + neededHeight - 8);

        // Title
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(15, 23, 42);
        doc.text(`${index + 1}. ${chapter.title}`, margin + 5, y);
        
        // Timestamp and Sentiment
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text(`Time: ${chapter.timestamp}   |   Sentiment: ${chapter.sentiment}`, margin + 5, y + 5);

        // Summary
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(51, 65, 85); // Slate 700
        doc.text(summaryLines, margin + 5, y + 10);

        y += neededHeight + 5;
      });

      y += 5;
      checkPageBreak(30);

      // Divider
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(margin, y, margin + contentWidth, y);
      y += 10;

      // Transcript Section Header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text("Full Transcription", margin, y);
      y += 8;

      // Transcript text
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105); // Slate 600

      const transcriptLines = doc.splitTextToSize(podcast.transcript_text, contentWidth);
      transcriptLines.forEach((line: string) => {
        checkPageBreak(6);
        doc.text(line, margin, y);
        y += 5.5;
      });

      const safeFilename = podcast.filename.replace(/\.[^/.]+$/, "").replace(/[^a-z0-9]/gi, '_').toLowerCase();
      doc.save(`${safeFilename}_report.pdf`);
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      alert("An error occurred while generating the PDF. Please try again.");
    } finally {
      setDownloadingPDF(false);
    }
  };

  const getHighlightedText = (text: string, highlight: string) => {
    if (!highlight.trim()) return text;
    const parts = text.split(new RegExp(`(${highlight.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi'));
    return (
      <>
        {parts.map((part, i) => 
          part.toLowerCase() === highlight.toLowerCase() ? (
            <mark key={i} className="bg-indigo-500/30 text-white font-medium rounded-sm px-0.5">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  const stats = [
    {
      label: "Total Chapters",
      value: chapters.length,
      icon: <Layers size={18} className="text-indigo-400" />,
      color: "indigo",
    },
    {
      label: "Positive",
      value: sentimentCounts.positive,
      icon: <TrendingUp size={18} className="text-emerald-400" />,
      color: "emerald",
    },
    {
      label: "Neutral",
      value: sentimentCounts.neutral,
      icon: <Minus size={18} className="text-amber-400" />,
      color: "amber",
    },
    {
      label: "Negative",
      value: sentimentCounts.negative,
      icon: <TrendingDown size={18} className="text-red-400" />,
      color: "red",
    },
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Stats & Actions Bar */}
      <div className="flex flex-col xl:flex-row gap-4 px-8 py-5 border-b border-white/5 bg-slate-950/40">
        <div className="flex flex-wrap gap-4 flex-1">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex items-center gap-3 glass-panel rounded-xl px-4 py-3 flex-1 min-w-[140px]"
            >
              <div className={`w-8 h-8 rounded-lg bg-${stat.color}-500/10 flex items-center justify-center`}>
                {stat.icon}
              </div>
              <div>
                <p className="text-xl font-bold text-white tabular-nums">{stat.value}</p>
                <p className="text-[11px] text-slate-500 font-medium">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Action Button Group */}
        <div className="flex flex-wrap items-center gap-3 flex-shrink-0">
          <button
            onClick={handleDownloadJSON}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold transition-all duration-200"
          >
            <Download size={14} />
            JSON
          </button>
          
          <button
            onClick={handleDownloadPDF}
            disabled={downloadingPDF}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold transition-all duration-200 disabled:opacity-50"
          >
            <Download size={14} />
            {downloadingPDF ? "Generating PDF..." : "PDF"}
          </button>

          <button
            id="btn-open-chat"
            onClick={onOpenChat}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/20 whitespace-nowrap"
          >
            <MessageSquare size={16} />
            Ask AI
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-8 py-6 bg-slate-950/20">
        <div className="space-y-6 max-w-5xl mx-auto">
          
          {/* Intelligent Transcription Card */}
          <div className="glass-panel rounded-2xl border border-white/5 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Mic size={18} />
                </div>
                <div>
                  <h3 className="text-white font-bold text-base">Intelligent Transcription</h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {wordCount} words · {charCount} characters
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {/* Search Bar */}
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search transcription..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors w-44 sm:w-56"
                  />
                </div>
                
                {/* Copy Button */}
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold transition-colors whitespace-nowrap"
                >
                  {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>

            {/* Transcript Scrollable Area */}
            <div className="p-5 rounded-2xl bg-black/40 border border-white/5 max-h-64 overflow-y-auto text-slate-300 text-xs sm:text-sm leading-relaxed font-sans whitespace-pre-wrap select-text">
              {getHighlightedText(podcast.transcript_text, searchTerm)}
            </div>
          </div>

          {/* Semantic Chapters Section */}
          <div className="space-y-4">
            <h3 className="text-white font-bold text-base flex items-center gap-2">
              <Layers size={18} className="text-indigo-400" />
              Semantic Chapters
            </h3>
            <p className="text-xs text-slate-600 font-medium uppercase tracking-wider">
              {chapters.length} semantic chapter{chapters.length !== 1 ? "s" : ""} · {podcast.filename}
            </p>
            
            {chapters.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-3 glass-panel rounded-2xl">
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
                  <Layers size={28} className="text-slate-600" />
                </div>
                <p className="text-slate-400 font-medium">No chapters generated yet</p>
                <p className="text-slate-600 text-sm max-w-xs">
                  The analysis may still be processing. Check back in a few moments.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {chapters.map((chapter, i) => (
                  <ChapterCard key={i} chapter={chapter} index={i} />
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
