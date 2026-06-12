"use client";

import { useState } from "react";
import Dashboard from "@/app/components/Dashboard";
import Analytics from "@/app/components/Analytics";
import ChatInterface from "@/app/components/ChatInterface";
import { BrainCircuit, LayoutDashboard, MessageSquare, BarChart3 } from "lucide-react";

type View = "dashboard" | "analytics" | "chat";

export interface Chapter {
  timestamp: string;
  title: string;
  sentiment: string;
  summary: string;
}

export interface Podcast {
  id: string;
  filename: string;
  file_hash: string;
  status: string;
  transcript_text: string;
  generated_chapters: Chapter[];
}

export default function Home() {
  const [activeView, setActiveView] = useState<View>("dashboard");
  const [activePodcast, setActivePodcast] = useState<Podcast | null>(null);

  const navItems: { id: View; label: string; icon: React.ReactNode }[] = [
    { id: "dashboard", label: "Upload", icon: <LayoutDashboard size={18} /> },
    { id: "analytics", label: "Analytics", icon: <BarChart3 size={18} /> },
    { id: "chat", label: "Chat", icon: <MessageSquare size={18} /> },
  ];

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar Navigation */}
      <nav className="w-64 flex-shrink-0 flex flex-col glass-panel border-r border-white/5">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-white/5">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30">
            <BrainCircuit size={20} className="text-indigo-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-tight">Podcast Intel</p>
            <p className="text-[10px] text-indigo-400/80 font-medium tracking-wider uppercase">Platform v2</p>
          </div>
        </div>

        {/* Nav Items */}
        <div className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              onClick={() => setActiveView(item.id)}
              disabled={item.id !== "dashboard" && !activePodcast}
              className={`
                w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                ${activeView === item.id
                  ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                }
                ${item.id !== "dashboard" && !activePodcast ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
              `}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>

        {/* Active Podcast info */}
        {activePodcast && (
          <div className="mx-3 mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <p className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider mb-1">Active Podcast</p>
            <p className="text-xs text-slate-300 truncate">{activePodcast.filename}</p>
            <div className={`mt-2 inline-flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full
              ${activePodcast.status === "completed" ? "bg-emerald-500/15 text-emerald-400" :
                activePodcast.status === "processing" ? "bg-amber-500/15 text-amber-400 processing-glow" :
                "bg-red-500/15 text-red-400"}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full 
                ${activePodcast.status === "completed" ? "bg-emerald-400" :
                  activePodcast.status === "processing" ? "bg-amber-400" : "bg-red-400"}`}
              />
              {activePodcast.status}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/5">
          <p className="text-[10px] text-slate-600 text-center">
            Powered by Whisper · Groq · LLaMA 3.3
          </p>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {/* Top bar */}
        <header className="flex items-center justify-between px-8 py-4 border-b border-white/5 glass-panel">
          <div>
            <h1 className="text-lg font-bold text-white">
              {activeView === "dashboard" && "Upload Podcast"}
              {activeView === "analytics" && "Semantic Analysis"}
              {activeView === "chat" && "AI Chat Interface"}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {activeView === "dashboard" && "Drop your audio file to begin intelligent analysis"}
              {activeView === "analytics" && "AI-generated chapter segmentation and sentiment breakdown"}
              {activeView === "chat" && "Ask anything about your podcast transcript"}
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            <span className="text-xs text-indigo-300 font-medium">API Online</span>
          </div>
        </header>

        {/* View Content */}
        <div className="flex-1 overflow-auto">
          {activeView === "dashboard" && (
            <Dashboard
              onPodcastReady={(podcast) => {
                setActivePodcast(podcast);
                setActiveView("analytics");
              }}
            />
          )}
          {activeView === "analytics" && activePodcast && (
            <Analytics
              podcast={activePodcast}
              onOpenChat={() => setActiveView("chat")}
            />
          )}
          {activeView === "chat" && activePodcast && (
            <ChatInterface podcast={activePodcast} />
          )}
        </div>
      </main>
    </div>
  );
}
