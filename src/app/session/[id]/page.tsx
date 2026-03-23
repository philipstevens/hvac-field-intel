"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
  AlertCircle,
  Clock,
  MessageSquare,
  Package,
  Lock,
  CheckCircle,
  FileText,
} from "lucide-react";
import clsx from "clsx";
import { ChatMessage, EquipmentIdentifiedCard, BulletinAlertCard, PartsInfoCard, formatRelativeTime, parseMetadata } from "@/components/chat-message";
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
    isDemo?: boolean | null;
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
  "Heatcraft BEH030A6K",
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
  const [sendError, setSendError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [contextExpanded, setContextExpanded] = useState(false);
  const [newMessageIds, setNewMessageIds] = useState<Set<string>>(new Set());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    Promise.all([fetchSession(), fetchMessages()]).finally(() => setLoading(false));
  }, [fetchSession, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (newMessageIds.size > 0) {
      const timer = setTimeout(() => setNewMessageIds(new Set()), 500);
      return () => clearTimeout(timer);
    }
  }, [newMessageIds]);

  const isDemo = !!sessionDetails?.session?.isDemo;

  const hasEquipment = sessionDetails?.session?.equipmentModelId != null;
  const hasDiagnostic = useMemo(() => messages.some((m) => m.messageType === "suggestion"), [messages]);
  const hasReport = useMemo(() => messages.some((m) => m.messageType === "report_generated"), [messages]);

  let quickSuggestions: string[];
  if (!hasEquipment) {
    quickSuggestions = PRE_EQUIPMENT_HINTS;
  } else if (hasDiagnostic || hasReport) {
    quickSuggestions = POST_DIAGNOSTIC_CHIPS;
  } else {
    quickSuggestions = POST_EQUIPMENT_CHIPS;
  }

  const sendMessage = async (content: string) => {
    if (!content.trim() || sending) return;

    const trimmed = content.trim();
    setInput("");
    setSendError(null);
    setSending(true);

    const optimisticMsg: Message = {
      id: `temp-${Date.now()}`,
      role: "user",
      messageType: "text",
      content: trimmed,
      metadata: null,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    const rollback = (msg: string) => {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
      setInput(trimmed);
      setSendError(msg);
    };

    // Demo sessions: messages are local-only, no API call, no AI response
    if (isDemo) {
      setSending(false);
      inputRef.current?.focus();
      return;
    }

    try {
      const res = await fetch(`/api/session/${sessionId}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed }),
      });

      if (res.ok) {
        const { userMessage, responses } = await res.json();

        const responseIds = new Set<string>();
        responses.forEach((r: Message) => responseIds.add(r.id));

        setMessages((prev) => {
          const without = prev.filter((m) => m.id !== optimisticMsg.id);
          return [...without, userMessage, ...responses];
        });
        setNewMessageIds(responseIds);

        // Safety-critical bulletins require immediate attention — auto-expand so the tech can't miss them
        const hasSafetyCritical = responses.some((r: Message) => {
          if (r.messageType !== "bulletin_alert") return false;
          const meta = parseMetadata(r.metadata);
          return meta?.severity === "safety_critical" || meta?.bulletins?.some((b: { severity: string }) => b.severity === "safety_critical");
        });
        if (hasSafetyCritical) setContextExpanded(true);

        fetchSession();
      } else {
        rollback("Failed to send — server error");
      }
    } catch (err) {
      console.error("Failed to send message:", err);
      rollback("Failed to send — check your connection");
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-field-bg">
        <Loader2 className="h-8 w-8 animate-spin text-field-accent" />
      </div>
    );
  }

  const session = sessionDetails?.session;

  return (
    <div className="flex h-screen flex-col bg-field-bg lg:flex-row">
      <div className="flex flex-1 flex-col min-h-0 lg:border-r lg:border-field-border">
        {/* Chat Header */}
        <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-field-border bg-field-surface/95 backdrop-blur-sm px-4 py-3">
          <button
            onClick={() => router.push("/session")}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-field-muted hover:bg-field-surface2 active:bg-field-surface3 transition-colors -ml-1 shrink-0"
            aria-label="Back to sessions"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-sm font-semibold text-field-text truncate">
              {session?.customerName
                ? `${session.customerName} Service`
                : "Service Session"}
            </h1>
            <p className="text-xs text-field-muted truncate">
              {session?.technicianName}
              {session?.modelNumber && (
                <span className="font-bc font-semibold text-field-muted-bright"> · {session.modelNumber}</span>
              )}
            </p>
          </div>
          {isDemo && (
            <span className="flex items-center gap-1 rounded-full bg-field-amber/10 px-2 py-1 text-[11px] font-semibold text-field-amber shrink-0">
              <Lock className="h-2.5 w-2.5" />
              Demo
            </span>
          )}
          {!isDemo && session?.status === "active" && (
            <span className="flex items-center gap-1 rounded-full bg-field-green/10 px-2 py-1 text-[11px] font-semibold text-field-green shrink-0">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-field-green opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-field-green" />
              </span>
              Live
            </span>
          )}
        </div>

        {/* Mobile Context Bar (collapsible) */}
        <div className="lg:hidden">
          <button
            onClick={() => setContextExpanded(!contextExpanded)}
            className="flex w-full items-center justify-between border-b border-field-border bg-field-surface2 px-4 py-2.5 text-xs text-field-muted"
          >
            <span className="flex items-center gap-2">
              {hasEquipment ? (
                <>
                  <Cpu className="h-3.5 w-3.5 text-field-green" />
                  <span className="font-bc font-semibold text-field-text tracking-wide">
                    {session?.manufacturer} {session?.modelNumber}
                  </span>
                </>
              ) : (
                <>
                  <MessageSquare className="h-3.5 w-3.5 text-field-muted" />
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
            <div className="border-b border-field-border bg-field-surface px-4 py-4">
              <ContextPanelContent
                session={session}
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
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-field-surface border border-field-border mb-4">
                <MessageSquare className="h-8 w-8 text-field-muted" />
              </div>
              <p className="text-sm font-semibold text-field-text">
                What equipment are you working on?
              </p>
              <p className="text-xs text-field-muted mt-1.5 leading-relaxed">
                Enter a model number or serial number, or tap a suggestion below.
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
              <div className="rounded-2xl rounded-bl-md bg-field-surface px-4 py-3 border border-field-border">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-field-muted animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-2 w-2 rounded-full bg-field-muted animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="h-2 w-2 rounded-full bg-field-muted animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions + Input */}
        <div className="sticky bottom-0 border-t border-field-border bg-field-bg safe-bottom">
          {/* Send error banner */}
          {sendError && (
            <div className="flex items-center justify-between gap-3 border-b border-field-red/20 bg-field-red/5 px-4 py-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <AlertCircle className="h-3.5 w-3.5 text-field-red shrink-0" />
                <span className="text-xs text-field-red font-medium truncate">{sendError}</span>
              </div>
              {input && (
                <button
                  onClick={() => { setSendError(null); sendMessage(input); }}
                  className="shrink-0 rounded-xl bg-field-red/15 px-3 py-1.5 text-xs font-semibold text-field-red hover:bg-field-red/25 transition-colors"
                >
                  Retry
                </button>
              )}
            </div>
          )}

          {/* Completed session banner */}
          {!isDemo && session?.status === "completed" && (
            <div className="flex items-center justify-between gap-3 border-b border-field-blue/20 bg-field-blue/5 px-4 py-3">
              <div className="flex items-center gap-2 min-w-0">
                <CheckCircle className="h-3.5 w-3.5 text-field-blue shrink-0" />
                <span className="text-xs text-field-blue font-medium">
                  Session completed — chat is locked
                </span>
              </div>
              {session.reportId && (
                <a
                  href={`/session/${session.id}/report`}
                  className="shrink-0 flex items-center gap-1.5 rounded-xl bg-field-blue/15 px-3 py-1.5 text-xs font-semibold text-field-blue hover:bg-field-blue/25 transition-colors"
                >
                  <FileText className="h-3 w-3" />
                  View Report
                </a>
              )}
            </div>
          )}

          <QuickActions
            suggestions={quickSuggestions}
            onSelect={sendMessage}
            disabled={sending || session?.status !== "active"}
          />

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-3 px-4 pb-4 pt-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                session?.status !== "active"
                  ? "Session completed — chat is locked"
                  : hasEquipment
                  ? "Ask about parts, bulletins, diagnostics..."
                  : "Enter model number or serial number..."
              }
              disabled={sending || session?.status !== "active"}
              className="flex-1 rounded-xl border border-field-border bg-field-surface2 px-4 py-3.5 text-sm text-field-text placeholder:text-field-muted focus:outline-none focus:ring-2 focus:ring-field-accent/40 focus:border-field-accent transition-all disabled:opacity-50 disabled:bg-field-surface"
            />
            <button
              type="submit"
              disabled={!input.trim() || sending || session?.status !== "active"}
              className={clsx(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-all",
                !isDemo && input.trim() && !sending
                  ? "bg-field-accent text-white shadow-lg shadow-field-accent/25 hover:bg-field-accent-hover active:scale-95"
                  : "bg-field-surface2 text-field-muted border border-field-border"
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

      <div className="hidden lg:flex lg:w-80 xl:w-96 flex-col overflow-y-auto bg-field-surface border-l border-field-border p-5">
        <h2 className="font-bc text-sm font-bold uppercase tracking-wider text-field-muted mb-4">
          Session Context
        </h2>
        <ContextPanelContent
          session={session}
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
  messages: Message[];
}

function ContextPanelContent({ session, messages }: ContextPanelContentProps) {
  const [showBulletins, setShowBulletins] = useState(false);
  const [showParts, setShowParts] = useState(false);

  const { equipmentMsg, bulletinMsgs, partsMsgs, events } = useMemo(() => {
    let lastEquipment: Message | undefined;
    const bulletins: Message[] = [];
    const parts: Message[] = [];
    const evts: { type: string; time: string; label: string }[] = [];
    for (const m of messages) {
      if (m.messageType === "equipment_identified") lastEquipment = m;
      else if (m.messageType === "bulletin_alert") bulletins.push(m);
      else if (m.messageType === "parts_info") parts.push(m);
      if (m.role === "system" && m.messageType !== "text") {
        evts.push({ type: m.messageType, time: m.createdAt, label: getEventLabel(m.messageType) });
      }
    }
    return { equipmentMsg: lastEquipment, bulletinMsgs: bulletins, partsMsgs: parts, events: evts };
  }, [messages]);

  if (!session) return null;

  const hasEquipment = !!session.equipmentModelId;

  return (
    <div className="space-y-5">
      {/* Customer & Site */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <User className="h-4 w-4 text-field-muted shrink-0" />
          <span className="text-field-text">
            {session.customerName || <span className="text-field-muted">No customer set</span>}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="h-4 w-4 text-field-muted shrink-0" />
          <span className="text-field-text">
            {session.siteAddress || <span className="text-field-muted">No address set</span>}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-field-muted shrink-0" />
          <span className="text-field-muted text-xs">
            Started {formatRelativeTime(session.createdAt)}
          </span>
        </div>
      </div>

      {/* Equipment */}
      {hasEquipment && equipmentMsg ? (
        <div>
          <h3 className="text-[11px] font-semibold text-field-muted uppercase tracking-wider mb-2">
            Equipment
          </h3>
          <EquipmentIdentifiedCard
            content={equipmentMsg.content}
            metadata={parseMetadata(equipmentMsg.metadata)}
          />
        </div>
      ) : hasEquipment ? (
        <div className="rounded-xl border border-field-green/20 bg-field-green/5 p-3.5 space-y-2">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-field-green" />
            <span className="text-xs font-semibold text-field-green uppercase tracking-wider">
              Identified Equipment
            </span>
          </div>
          <p className="font-bc text-base font-bold text-field-text tracking-wide">{session.modelNumber}</p>
          {session.serialNumber && (
            <p className="text-xs text-field-muted font-mono">S/N: {session.serialNumber}</p>
          )}
        </div>
      ) : null}

      {/* Bulletins */}
      {hasEquipment && bulletinMsgs.length > 0 && (
        <div>
          <button
            onClick={() => setShowBulletins((v) => !v)}
            className="flex w-full items-center justify-between text-[11px] font-semibold text-field-muted uppercase tracking-wider mb-2"
          >
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-field-amber" />
              Bulletins
              <span className="ml-1 rounded-full bg-field-amber/15 px-1.5 py-0.5 text-[10px] font-bold text-field-amber normal-case tracking-normal">
                {bulletinMsgs.length}
              </span>
            </span>
            {showBulletins ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
          {showBulletins && (
            <div className="space-y-2">
              {bulletinMsgs.map((msg) => (
                <BulletinAlertCard
                  key={msg.id}
                  content={msg.content}
                  metadata={parseMetadata(msg.metadata)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Parts */}
      {hasEquipment && partsMsgs.length > 0 && (
        <div>
          <button
            onClick={() => setShowParts((v) => !v)}
            className="flex w-full items-center justify-between text-[11px] font-semibold text-field-muted uppercase tracking-wider mb-2"
          >
            <span className="flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5 text-field-blue" />
              Parts
              <span className="ml-1 rounded-full bg-field-blue/15 px-1.5 py-0.5 text-[10px] font-bold text-field-blue normal-case tracking-normal">
                {partsMsgs.length}
              </span>
            </span>
            {showParts ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
          {showParts && (
            <div className="space-y-2">
              {partsMsgs.map((msg) => (
                <PartsInfoCard
                  key={msg.id}
                  content={msg.content}
                  metadata={parseMetadata(msg.metadata)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* "Identify equipment first" hint */}
      {!hasEquipment && (
        <div className="rounded-xl border border-field-border bg-field-surface2 p-4 text-center">
          <Cpu className="mx-auto h-6 w-6 text-field-muted mb-2" />
          <p className="text-xs text-field-muted leading-relaxed">
            Identify equipment to see bulletins and parts
          </p>
        </div>
      )}

      {/* Session Activity Timeline */}
      {events.length > 0 && (
        <div>
          <h3 className="text-[11px] font-semibold text-field-muted uppercase tracking-wider mb-3">
            Session Activity
          </h3>
          <div className="space-y-0">
            {events.map((evt, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={clsx(
                    "h-2 w-2 rounded-full mt-1.5 shrink-0",
                    evt.type === "equipment_identified" ? "bg-field-green" :
                    evt.type === "bulletin_alert" ? "bg-field-amber" :
                    evt.type === "parts_info" ? "bg-field-blue" :
                    evt.type === "suggestion" ? "bg-field-purple" :
                    evt.type === "report_generated" ? "bg-field-blue" :
                    "bg-field-border"
                  )} />
                  {i < events.length - 1 && (
                    <div className="w-px flex-1 bg-field-border my-1" />
                  )}
                </div>
                <div className="pb-3 min-w-0">
                  <p className="text-xs font-medium text-field-text leading-tight">
                    {evt.label}
                  </p>
                  <p className="text-[10px] text-field-muted mt-0.5">
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
