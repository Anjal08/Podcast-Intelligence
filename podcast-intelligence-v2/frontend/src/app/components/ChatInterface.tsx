"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Send, Loader2, Bot, User, AlertCircle, Trash2, BrainCircuit } from "lucide-react";
import type { Podcast } from "@/app/page";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface ChatInterfaceProps {
  podcast: Podcast;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

const MessageBubble = ({ message }: { message: Message }) => {
  const isUser = message.role === "user";
  return (
    <div className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center ${
          isUser
            ? "bg-indigo-500/20 border border-indigo-500/30"
            : "bg-purple-500/20 border border-purple-500/30"
        }`}
      >
        {isUser ? (
          <User size={15} className="text-indigo-400" />
        ) : (
          <BrainCircuit size={15} className="text-purple-400" />
        )}
      </div>

      {/* Bubble */}
      <div
        className={`max-w-[72%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-indigo-600/30 border border-indigo-500/30 text-white rounded-tr-sm"
            : "glass-panel text-slate-200 rounded-tl-sm"
        }`}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
        <p
          className={`text-[10px] mt-1.5 font-medium ${
            isUser ? "text-indigo-400/60 text-right" : "text-slate-600"
          }`}
        >
          {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </div>
  );
};

const TypingIndicator = () => (
  <div className="flex items-start gap-3">
    <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
      <BrainCircuit size={15} className="text-purple-400" />
    </div>
    <div className="glass-panel rounded-2xl rounded-tl-sm px-4 py-3">
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-2 h-2 rounded-full bg-purple-400/60 animate-bounce"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </div>
  </div>
);

const SUGGESTED_PROMPTS = [
  "What are the main topics discussed?",
  "Summarise the key takeaways",
  "Which chapter had the most positive sentiment?",
  "What technical concepts were mentioned?",
];

export default function ChatInterface({ podcast }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  // Load conversation history from backend
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const res = await fetch(`${API_URL}/api/v1/ask/${podcast.id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.messages && data.messages.length > 0) {
            setMessages(data.messages);
          }
        }
      } catch {
        // Ignore — fresh chat
      } finally {
        setHistoryLoaded(true);
      }
    };
    loadHistory();
  }, [podcast.id]);

  const sendMessage = async (prompt: string) => {
    if (!prompt.trim() || isLoading) return;

    const userMsg: Message = {
      role: "user",
      content: prompt.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);
    setError("");

    // Auto-resize textarea back
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    try {
      const res = await fetch(`${API_URL}/api/v1/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), podcast_id: podcast.id }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Error: ${res.status}`);
      }

      const data = await res.json();
      const allMessages: Message[] = data.messages ?? [];
      // Get the last assistant message
      const lastAssistant = [...allMessages].reverse().find((m) => m.role === "assistant");

      if (lastAssistant) {
        setMessages((prev) => [...prev, lastAssistant]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to get a response.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-resize
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 140) + "px";
  };

  const clearHistory = () => setMessages([]);

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Bot size={16} className="text-purple-400" />
          <span className="text-sm font-semibold text-slate-300">
            Chatting about: <span className="text-white">{podcast.filename}</span>
          </span>
        </div>
        {messages.length > 0 && (
          <button
            id="btn-clear-chat"
            onClick={clearHistory}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-red-500/10"
          >
            <Trash2 size={13} />
            Clear
          </button>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        {!historyLoaded ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 size={24} className="text-indigo-400 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full space-y-6 text-center">
            {/* Welcome state */}
            <div className="w-16 h-16 rounded-2xl bg-purple-500/15 border border-purple-500/20 flex items-center justify-center">
              <BrainCircuit size={28} className="text-purple-400" />
            </div>
            <div className="space-y-1.5">
              <p className="text-slate-200 font-semibold text-base">Ask anything about this podcast</p>
              <p className="text-slate-500 text-sm max-w-sm">
                I have read the full transcript and am ready to answer your questions with context.
              </p>
            </div>
            {/* Suggested prompts */}
            <div className="flex flex-wrap gap-2 justify-center max-w-sm">
              {SUGGESTED_PROMPTS.map((p) => (
                <button
                  key={p}
                  id={`suggested-prompt-${p.slice(0, 10).replace(/\s+/g, "-").toLowerCase()}`}
                  onClick={() => sendMessage(p)}
                  className="text-xs px-3 py-2 rounded-xl glass-panel hover:border-indigo-500/30 text-slate-400 hover:text-indigo-300 transition-all duration-200"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => <MessageBubble key={i} message={msg} />)
        )}
        {isLoading && <TypingIndicator />}
        {error && (
          <div className="flex items-center gap-2 text-xs text-red-400 glass-panel rounded-xl p-3 border-red-500/20">
            <AlertCircle size={14} />
            {error}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="px-6 py-4 border-t border-white/5">
        <div className="relative flex items-end gap-3 glass-panel rounded-2xl p-3">
          <textarea
            ref={textareaRef}
            id="chat-input"
            value={input}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask about the transcript… (Enter to send, Shift+Enter for new line)"
            disabled={isLoading}
            rows={1}
            className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-600 resize-none outline-none leading-relaxed py-1 max-h-36 overflow-y-auto disabled:opacity-50"
          />
          <button
            id="btn-send"
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            className="flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 flex items-center justify-center transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-md hover:shadow-indigo-500/20"
          >
            {isLoading ? (
              <Loader2 size={15} className="text-white animate-spin" />
            ) : (
              <Send size={15} className="text-white" />
            )}
          </button>
        </div>
        <p className="text-center text-[10px] text-slate-700 mt-2">
          Responses are grounded in the podcast transcript context
        </p>
      </div>
    </div>
  );
}
