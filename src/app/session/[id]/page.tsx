"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Send,
  Loader2,
  ChevronDown,
  ChevronUp,
  Cpu,
  User,
  MapPin,
  AlertTriangle,
  Wrench,
  Clock,
  MessageSquare,
} from "lucide-react";
import clsx from "clsx";
import { ChatMessage, formatRelativeTime } from "@/components/chat-message";
import type { Message } from "@/components/chat-message";
import { QuickActions } from "@/components/quick-actions";

interface SessionDetails {
  session: {
    id: string;
    technicianName: string;
    status: string;
    equipmentModelId: string | null;
    serialNumber: string | null;
    siteAddress: string | null;
    customerName: string | null;
    reportId: string | null;
    createdAt: string;
    completedAt: string | null;
    modelNumber?: string | null;
    modelDescription?: string | null;
    refrigerantType?: string | null;
    voltage?: string | null;
    btuRating?: number | null;
    seerRating?: number | null;
    productLine?: string | null;
    productLineCategory?: string | null;
    manufacturer?: string | null;
  };
  bulletins: any[];
  parts: any[];
}

const PRE_EQUIPMENT_HINTS = [
  "Carrier 24ANB636A003",
  "Trane 4TTR6036J1000A",
  "Lennox XC16-036-230",
];

const POST_EQUIPMENT_CHIPS = [
  "What parts does it use?",
  "Any bulletins?",
  "Check supersessions",
  "Diagnostic help",
];

const POST_DIAGNOSTIC_CHIPS = [
  "Generate report",
  "Check supplier stock",
  "Any bulletins?",
  "What parts does it use?",
];

export default function SessionWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const [sessionDetails, setSessionDetails] = useState<SessionDetails | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [contextExpanded, setContextExpanded] = useState(false);
  const [newMessageIds, setNewMessageIds] = useState<Set<string>>(new Set());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch session details
  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch(`/api/session/${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        setSessionDetails(data);
      }
    } catch (err) {
      console.error("Failed to fetch session:", err);
    }
  }, [sessionId]);

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/session/${sessionId}/message`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    }
  }, [sessionId]);

  // Initial load
  useEffect(() => {
    Promise.all([fetchSession(), fetchMessages()]).finally(() => setLoading(false));
  }, [fetchSession, fetchMessages]);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Clear new message animation after delay
  useEffect(() => {
    if (newMessageIds.size > 0) {
      const timer = setTimeout(() => setNewMessageIds(new Set()), 500);
      return () => clearTimeout(timer);
    }
  }, [newMessageIds]);

  // Determine quick action suggestions
  const hasEquipment = sessionDetails?.session?.equipmentModelId != null;
  const hasDiagnostic = messages.some((m) => m.messageType === "suggestion");
  const hasReport = messages.some((m) => m.messageType === "report_generated");

  let quickSuggestions: string[];
  if (!hasEquipment) {
    quickSuggestions = PRE_EQUIPMENT_HINTS;
  } else if (hasDiagnostic || hasReport) {
    quickSuggestions = POST_DIAGNOSTIC_CHIPS;
  } else {
    quickSuggestions = POST_EQUIPMENT_CHIPS;
  }

  // Send message
  const sendMessage = async (content: string) => {
    if (!content.trim() || sending) return;

    const trimmed = content.trim();
    setInput("");
    setSending(true);

    // Optimistic user message
    const optimisticMsg: Message = {
      id: `temp-${Date.now()}`,
      role: "user",
      messageType: "text",
      content: trimmed,
      metadata: null,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const res = await fetch(`/api/session/${sessionId}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed }),
      });

      if (res.ok) {
        const { userMessage, responses } = await res.json();

        // Replace optimistic message with real one + add responses
        const responseIds = new Set<string>();
        responses.forEach((r: Message) => responseIds.add(r.id));

        setMessages((prev) => {
          const without = prev.filter((m) => m.id !== optimisticMsg.id);
          return [...without, userMessage, ...responses];
        });
        setNewMessageIds(responseIds);

        // Refresh session details (equipment may have been identified)
        fetchSession();
      }
    } catch (err) {
      console.error("Failed to send message:", err);
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleChipSelect = (text: string) => {
    sendMessage(text);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const session = sessionDetails?.session;

  return (
    <div className="flex h-screen flex-col bg-slate-50 lg:flex-row">
      {/* ==================== */}
      {/* CHAT PANEL           */}
      {/* ==================== */}
      <div className="flex flex-1 flex-col min-h-0 lg:border-r lg:border-slate-200">
        {/* Chat Header */}
        <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white/95 backdrop-blur-sm px-4 py-3 shadow-sm">
          <button
            onClick={() => router.push("/session")}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 active:bg-slate-200 transition-colors -ml-1"
            aria-label="Back to sessions"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-sm font-semibold text-slate-900 truncate">
              {session?.customerName
                ? `${session.customerName} Service`
                : "Service Session"}
            </h1>
            <p className="text-xs text-slate-500 truncate">
              {session?.technicianName}
              {session?.modelNumber && ` \u00b7 ${session.modelNumber}`}
            </p>
          </div>
          {session?.status === "active" && (
            <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
              </span>
              Active
            </span>
          )}
        </div>

        {/* Mobile Context Bar (collapsible) */}
        <div className="lg:hidden">
          <button
            onClick={() => setContextExpanded(!contextExpanded)}
            className="flex w-full items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs text-slate-500"
          >
            <span className="flex items-center gap-2">
              {hasEquipment ? (
                <>
                  <Cpu className="h-3.5 w-3.5 text-green-500" />
                  <span className="font-medium text-slate-700">
                    {session?.manufacturer} {session?.modelNumber}
                  </span>
                </>
              ) : (
                <>
                  <MessageSquare className="h-3.5 w-3.5 text-slate-400" />
                  <span>Session Details</span>
                </>
              )}
            </span>
            {contextExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>

          {contextExpanded && (
            <div className="border-b border-slate-200 bg-white px-4 py-3">
              <ContextPanelContent
                session={session}
                bulletinsCount={sessionDetails?.bulletins?.length || 0}
                partsCount={sessionDetails?.parts?.length || 0}
                messages={messages}
              />
            </div>
          )}
        </div>

        {/* Messages Area */}
        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto py-4 space-y-2"
        >
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center px-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 mb-3">
                <MessageSquare className="h-7 w-7 text-blue-500" />
              </div>
              <p className="text-sm font-medium text-slate-600">
                Start by telling me what equipment you&apos;re working on.
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Enter a model number, or tap a suggestion below.
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              message={msg}
              isNew={newMessageIds.has(msg.id)}
              sessionId={sessionId}
            />
          ))}

          {/* Typing indicator */}
          {sending && (
            <div className="flex justify-start px-4 py-1">
              <div className="rounded-2xl rounded-bl-md bg-white px-4 py-3 shadow-sm border border-slate-100">
                <div className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-2 w-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="h-2 w-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions + Input */}
        <div className="sticky bottom-0 border-t border-slate-200 bg-slate-50 safe-bottom">
          {/* Quick Action Chips */}
          <QuickActions
            suggestions={quickSuggestions}
            onSelect={handleChipSelect}
            disabled={sending}
          />

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 px-4 pb-4 pt-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about equipment, parts, bulletins..."
              disabled={sending || session?.status !== "active"}
              className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:opacity-50 disabled:bg-slate-100"
            />
            <button
              type="submit"
              disabled={!input.trim() || sending || session?.status !== "active"}
              className={clsx(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-all",
                input.trim() && !sending
                  ? "bg-blue-600 text-white shadow-md shadow-blue-200 hover:bg-blue-700 active:scale-95"
                  : "bg-slate-200 text-slate-400"
              )}
              aria-label="Send message"
            >
              {sending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </button>
          </form>
        </div>
      </div>

      {/* ==================== */}
      {/* CONTEXT PANEL (Desktop Sidebar) */}
      {/* ==================== */}
      <div className="hidden lg:flex lg:w-80 xl:w-96 flex-col overflow-y-auto bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-800 mb-4">Session Context</h2>
        <ContextPanelContent
          session={session}
          bulletinsCount={sessionDetails?.bulletins?.length || 0}
          partsCount={sessionDetails?.parts?.length || 0}
          messages={messages}
        />
      </div>
    </div>
  );
}

// ===========================
// Context Panel Content
// ===========================

interface ContextPanelContentProps {
  session: SessionDetails["session"] | undefined;
  bulletinsCount: number;
  partsCount: number;
  messages: Message[];
}

function ContextPanelContent({
  session,
  bulletinsCount,
  partsCount,
  messages,
}: ContextPanelContentProps) {
  if (!session) return null;

  // Build timeline events from messages
  const events = messages
    .filter(
      (m) =>
        m.role === "system" &&
        m.messageType !== "text"
    )
    .map((m) => ({
      type: m.messageType,
      time: m.createdAt,
      label: getEventLabel(m.messageType),
    }));

  return (
    <div className="space-y-5">
      {/* Customer & Site */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <User className="h-4 w-4 text-slate-400 shrink-0" />
          <span className="text-slate-700">
            {session.customerName || "No customer set"}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
          <span className="text-slate-700">
            {session.siteAddress || "No address set"}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-slate-400 shrink-0" />
          <span className="text-slate-500 text-xs">
            Started {formatRelativeTime(session.createdAt)}
          </span>
        </div>
      </div>

      {/* Equipment Summary */}
      {session.equipmentModelId && (
        <div className="rounded-xl border border-green-200 bg-green-50/60 p-3.5 space-y-2">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-green-600" />
            <span className="text-xs font-semibold text-green-800 uppercase tracking-wider">
              Identified Equipment
            </span>
          </div>
          {session.manufacturer && (
            <span className="inline-flex items-center rounded-md bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700">
              {session.manufacturer}
            </span>
          )}
          <p className="text-sm font-bold text-slate-900">{session.modelNumber}</p>
          {session.modelDescription && (
            <p className="text-xs text-slate-600">{session.modelDescription}</p>
          )}
          {session.serialNumber && (
            <p className="text-xs text-slate-500 font-mono">
              S/N: {session.serialNumber}
            </p>
          )}
        </div>
      )}

      {/* Quick Stats */}
      {session.equipmentModelId && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center">
            <AlertTriangle className="mx-auto h-4 w-4 text-amber-500 mb-1" />
            <p className="text-lg font-bold text-slate-800">{bulletinsCount}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">
              Bulletins
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center">
            <Wrench className="mx-auto h-4 w-4 text-blue-500 mb-1" />
            <p className="text-lg font-bold text-slate-800">{partsCount}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">
              Parts
            </p>
          </div>
        </div>
      )}

      {/* Session Activity Timeline */}
      {events.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Session Activity
          </h3>
          <div className="space-y-0">
            {events.map((evt, i) => (
              <div key={i} className="flex gap-3">
                {/* Timeline line */}
                <div className="flex flex-col items-center">
                  <div className={clsx(
                    "h-2 w-2 rounded-full mt-1.5 shrink-0",
                    evt.type === "equipment_identified" ? "bg-green-400" :
                    evt.type === "bulletin_alert" ? "bg-amber-400" :
                    evt.type === "parts_info" ? "bg-blue-400" :
                    evt.type === "suggestion" ? "bg-purple-400" :
                    evt.type === "report_generated" ? "bg-indigo-400" :
                    "bg-slate-300"
                  )} />
                  {i < events.length - 1 && (
                    <div className="w-px flex-1 bg-slate-200 my-1" />
                  )}
                </div>
                {/* Event info */}
                <div className="pb-3 min-w-0">
                  <p className="text-xs font-medium text-slate-700 leading-tight">
                    {evt.label}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {formatRelativeTime(evt.time)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function getEventLabel(messageType: string): string {
  switch (messageType) {
    case "equipment_identified":
      return "Equipment identified";
    case "bulletin_alert":
      return "Service bulletin found";
    case "parts_info":
      return "Parts information retrieved";
    case "suggestion":
      return "Diagnostic suggestions provided";
    case "report_generated":
      return "Service report generated";
    case "measurement":
      return "Measurement recorded";
    default:
      return "Event";
  }
}
