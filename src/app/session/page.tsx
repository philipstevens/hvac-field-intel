"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  MessageSquare,
  User,
  MapPin,
  Cpu,
  Clock,
  ChevronRight,
  X,
  Loader2,
  Lock,
} from "lucide-react";
import clsx from "clsx";
import { formatRelativeTime } from "@/components/chat-message";

interface Session {
  id: string;
  technicianName: string;
  status: "active" | "completed" | "archived";
  equipmentModelId: string | null;
  serialNumber: string | null;
  siteAddress: string | null;
  customerName: string | null;
  createdAt: string;
  completedAt: string | null;
  isDemo?: boolean | null;
  modelNumber?: string | null;
  modelDescription?: string | null;
  manufacturer?: string | null;
  productLine?: string | null;
  messageCount: number;
}

export default function SessionListPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);

  const [technicianName, setTechnicianName] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [siteAddress, setSiteAddress] = useState("");

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/session");
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
      }
    } catch (err) {
      console.error("Failed to fetch sessions:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!technicianName.trim()) return;

    setCreating(true);
    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          technicianName: technicianName.trim(),
          customerName: customerName.trim() || undefined,
          siteAddress: siteAddress.trim() || undefined,
        }),
      });

      if (res.ok) {
        const { session } = await res.json();
        router.push(`/session/${session.id}`);
      }
    } catch (err) {
      console.error("Failed to create session:", err);
    } finally {
      setCreating(false);
    }
  };

  const demoSessions = sessions.filter((s) => s.isDemo);
  const mySessions = sessions.filter((s) => !s.isDemo);
  const myActiveSessions = mySessions.filter((s) => s.status === "active");
  const myCompletedSessions = mySessions.filter((s) => s.status !== "active");

  return (
    <div className="mx-auto max-w-2xl px-4 py-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-bc text-2xl font-bold uppercase tracking-wide text-field-text">
            Service Sessions
          </h1>
          <p className="text-sm text-field-muted mt-0.5">
            {myActiveSessions.length > 0
              ? `${myActiveSessions.length} active`
              : "No active sessions"}
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className={clsx(
            "flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all min-h-[48px] shadow-sm",
            showForm
              ? "bg-field-surface border border-field-border text-field-muted"
              : "bg-field-accent text-white shadow-field-accent/20 active:scale-[0.97]"
          )}
        >
          {showForm ? (
            <>
              <X className="h-4 w-4" /> Cancel
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" /> New Session
            </>
          )}
        </button>
      </div>

      {/* New Session Form */}
      {showForm && (
        <form
          onSubmit={handleCreateSession}
          className="mb-5 rounded-2xl border border-field-accent/25 bg-field-surface p-5 space-y-4 shadow-lg shadow-black/20"
        >
          <h2 className="font-bc text-base font-bold uppercase tracking-wide text-field-accent">
            Start New Session
          </h2>

          <div>
            <label htmlFor="techName" className="block text-xs font-semibold text-field-muted-bright mb-2 uppercase tracking-wide">
              Technician Name <span className="text-field-red normal-case">*</span>
            </label>
            <input
              id="techName"
              type="text"
              value={technicianName}
              onChange={(e) => setTechnicianName(e.target.value)}
              placeholder="Your name"
              className="input-field text-base"
              required
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="custName" className="block text-xs font-semibold text-field-muted-bright mb-2 uppercase tracking-wide">
              Customer Name
            </label>
            <input
              id="custName"
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Optional"
              className="input-field text-base"
            />
          </div>

          <div>
            <label htmlFor="siteAddr" className="block text-xs font-semibold text-field-muted-bright mb-2 uppercase tracking-wide">
              Site Address
            </label>
            <input
              id="siteAddr"
              type="text"
              value={siteAddress}
              onChange={(e) => setSiteAddress(e.target.value)}
              placeholder="Optional"
              className="input-field text-base"
            />
          </div>

          <button
            type="submit"
            disabled={!technicianName.trim() || creating}
            className="btn-primary w-full py-4 text-base font-bold tracking-wide"
          >
            {creating ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Starting...
              </span>
            ) : (
              "Start Session"
            )}
          </button>
        </form>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-field-muted" />
        </div>
      )}

      {/* Empty state */}
      {!loading && mySessions.length === 0 && !showForm && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-field-surface border border-field-border mb-4">
            <MessageSquare className="h-8 w-8 text-field-muted" />
          </div>
          <p className="text-base font-semibold text-field-text">No sessions yet</p>
          <p className="text-sm text-field-muted mt-1.5 max-w-xs leading-relaxed">
            Start a new session or browse the demo sessions below.
          </p>
        </div>
      )}

      {/* My Active Sessions */}
      {!loading && myActiveSessions.length > 0 && (
        <div className="mb-5">
          <h2 className="text-[11px] font-semibold text-field-muted uppercase tracking-wider mb-3 px-0.5">
            Active Sessions
          </h2>
          <div className="space-y-2.5">
            {myActiveSessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                onClick={() => router.push(`/session/${session.id}`)}
              />
            ))}
          </div>
        </div>
      )}

      {/* My Completed Sessions */}
      {!loading && myCompletedSessions.length > 0 && (
        <div className="mb-5">
          <h2 className="text-[11px] font-semibold text-field-muted uppercase tracking-wider mb-3 px-0.5">
            Previous Sessions
          </h2>
          <div className="space-y-2.5">
            {myCompletedSessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                onClick={() => router.push(`/session/${session.id}`)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Demo Sessions */}
      {!loading && demoSessions.length > 0 && (
        <div>
          <h2 className="text-[11px] font-semibold text-field-muted uppercase tracking-wider mb-1 px-0.5">
            Demo Sessions
          </h2>
          <p className="text-[11px] text-field-muted mb-3 px-0.5">
            Read-only examples showing the full session flow
          </p>
          <div className="space-y-2.5">
            {demoSessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                onClick={() => router.push(`/session/${session.id}`)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface SessionCardProps {
  session: Session;
  onClick: () => void;
}

function SessionCard({ session, onClick }: SessionCardProps) {
  const isActive = session.status === "active";
  const isCompleted = session.status === "completed";

  const stripeColor = isActive
    ? "bg-field-green/70"
    : isCompleted
    ? "bg-field-blue/50"
    : "bg-field-border";

  const borderColor = isActive
    ? "border-field-green/20"
    : "border-field-border";

  return (
    <button
      onClick={onClick}
      className={clsx(
        "w-full flex overflow-hidden rounded-xl border bg-field-surface text-left active:opacity-75 transition-opacity",
        borderColor
      )}
    >
      {/* Status stripe */}
      <div className={clsx("w-1.5 shrink-0 rounded-l-xl", stripeColor)} />

      <div className="flex flex-1 items-start justify-between gap-3 px-4 py-4 min-w-0">
        <div className="min-w-0 flex-1 space-y-1.5">
          {/* Status + badges + tech name */}
          <div className="flex items-center gap-2 flex-wrap">
            {isActive && (
              <span className="inline-flex items-center gap-1 rounded-full bg-field-green/10 px-2 py-0.5 text-[11px] font-semibold text-field-green">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-field-green opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-field-green" />
                </span>
                Active
              </span>
            )}
            {!isActive && (
              <span className={clsx(
                "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
                isCompleted
                  ? "bg-field-blue/10 text-field-blue"
                  : "bg-field-border text-field-muted"
              )}>
                {session.status === "completed" ? "Completed" : "Archived"}
              </span>
            )}
            {session.isDemo && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-field-amber/10 px-1.5 py-0.5 text-[10px] font-semibold text-field-amber">
                <Lock className="h-2.5 w-2.5" />
                Demo
              </span>
            )}
            <span className="flex items-center gap-1 text-sm font-medium text-field-text truncate">
              <User className="h-3.5 w-3.5 text-field-muted shrink-0" />
              {session.technicianName}
            </span>
          </div>

          {/* Customer & Site */}
          {(session.customerName || session.siteAddress) && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-field-muted">
              {session.customerName && <span className="text-field-muted-bright">{session.customerName}</span>}
              {session.siteAddress && (
                <span className="flex items-center gap-0.5">
                  <MapPin className="h-3 w-3" />
                  {session.siteAddress}
                </span>
              )}
            </div>
          )}

          {/* Equipment */}
          {session.modelNumber && (
            <div className="flex items-center gap-1.5 text-xs">
              <Cpu className="h-3 w-3 text-field-green" />
              <span className="font-semibold text-field-text font-bc tracking-wide">
                {session.manufacturer && `${session.manufacturer} `}
                {session.modelNumber}
              </span>
            </div>
          )}

          {/* Meta */}
          <div className="flex items-center gap-3 text-[11px] text-field-muted">
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              {session.messageCount} msg{session.messageCount !== 1 ? "s" : ""}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatRelativeTime(session.createdAt)}
            </span>
          </div>
        </div>

        <ChevronRight className="h-5 w-5 text-field-border shrink-0 mt-1" />
      </div>
    </button>
  );
}
