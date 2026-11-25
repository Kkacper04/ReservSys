"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, HelpCircle, RotateCcw, Send, X } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  isError?: boolean;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const INITIAL_MESSAGE: Message = {
  role: "assistant",
  content:
    "Hello. Ask me about office booking rules, check-in windows, or workspace policies.",
};

export default function HelpDeskChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => inputRef.current?.focus(), 60);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const userMsg = input.trim();
    if (!userMsg || isLoading) return;

    setInput("");
    setErrorBanner(null);
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setIsLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/chat/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: userMsg }),
      });

      if (!res.ok) {
        let detail = "Unable to reach the knowledge base.";
        if (res.status === 401) {
          detail = "Please sign in to use the Help Desk assistant.";
        } else {
          try {
            const payload = await res.json();
            if (typeof payload?.detail === "string" && payload.detail.trim()) {
              detail = payload.detail;
            }
          } catch {
            // Keep fallback message
          }
        }
        throw new Error(detail);
      }

      const data = (await res.json()) as { reply?: string };
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply || "No response received from the assistant.",
        },
      ]);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Knowledge base is currently unavailable.";
      setErrorBanner(message);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: message, isError: true },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const resetConversation = () => {
    setMessages([INITIAL_MESSAGE]);
    setErrorBanner(null);
    inputRef.current?.focus();
  };

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full bg-white hover:bg-[#F7F6F2] text-[#161615] border border-[#CFCBC2] hover:border-[#1B4D3E] px-4 py-2.5 text-sm font-medium shadow-[0_6px_20px_rgba(22,22,21,0.10)] transition-colors cursor-pointer"
          aria-label="Open Office Help Desk"
        >
          <HelpCircle size={18} className="text-[#1B4D3E]" />
          <span>Help Desk</span>
        </button>
      )}

      {isOpen && (
        <aside
          className="fixed bottom-6 right-6 z-50 w-[calc(100vw-2rem)] sm:w-[390px] h-[500px] max-h-[80vh] bg-white border border-[#E4E2DC] rounded-xl shadow-[0_12px_36px_rgba(22,22,21,0.12)] flex flex-col overflow-hidden"
          aria-label="Office Help Desk"
        >
          <div className="px-4 py-3.5 bg-[#F7F6F2] border-b border-[#E4E2DC] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-8 h-8 rounded-lg bg-[#ECF4F0] border border-[#B9D5C9] text-[#1B4D3E] flex items-center justify-center shrink-0">
                <HelpCircle size={17} />
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-[#161615] leading-tight">
                  Office Help Desk
                </h3>
                <p className="text-xs text-[#6B6A65] truncate">
                  Administration Knowledge Base
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={resetConversation}
                className="p-1.5 rounded-md text-[#6B6A65] hover:text-[#161615] hover:bg-[#E4E2DC]/60 transition-colors cursor-pointer"
                title="Reset conversation"
                aria-label="Reset conversation"
              >
                <RotateCcw size={15} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-md text-[#6B6A65] hover:text-[#161615] hover:bg-[#E4E2DC]/60 transition-colors cursor-pointer"
                aria-label="Close Help Desk"
              >
                <X size={17} />
              </button>
            </div>
          </div>

          {errorBanner && (
            <div className="px-4 py-2 bg-[#FDF1F0] border-b border-[#EFC8C4] flex items-center justify-between gap-2 text-xs text-[#9E2A2B]">
              <span className="inline-flex items-center gap-1.5 min-w-0 truncate">
                <AlertCircle size={13} className="shrink-0" />
                <span className="truncate">{errorBanner}</span>
              </span>
              <button
                type="button"
                onClick={() => setErrorBanner(null)}
                className="shrink-0 hover:underline cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F7F6F2]/55">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-[#1B4D3E] text-white rounded-br-sm"
                      : msg.isError
                        ? "bg-[#FDF1F0] text-[#9E2A2B] border border-[#EFC8C4] rounded-bl-sm"
                        : "bg-white text-[#161615] border border-[#E4E2DC] rounded-bl-sm"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white text-[#6B6A65] border border-[#E4E2DC] rounded-xl rounded-bl-sm px-3.5 py-2.5 text-xs flex items-center gap-2">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-[#9A9890] rounded-full animate-pulse" />
                    <span
                      className="w-1.5 h-1.5 bg-[#9A9890] rounded-full animate-pulse"
                      style={{ animationDelay: "150ms" }}
                    />
                    <span
                      className="w-1.5 h-1.5 bg-[#9A9890] rounded-full animate-pulse"
                      style={{ animationDelay: "300ms" }}
                    />
                  </span>
                  <span>Looking up answer...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <form
            onSubmit={sendMessage}
            className="p-3 bg-white border-t border-[#E4E2DC] flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about policies, desks, check-in..."
              className="rs-input py-2"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="rs-btn-primary px-3 py-2 shrink-0"
              aria-label="Send message"
            >
              <Send size={16} />
            </button>
          </form>
        </aside>
      )}
    </>
  );
}
