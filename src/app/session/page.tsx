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

  const activeSessions = sessions.filter((s) => s.status === "active");
  const completedSessions = sessions.filter((s) => s.status !== "active");

  const statusConfig = {
    active: { label: "Active", className: "bg-green-100 text-green-700", pulse: true },
    completed: { label: "Completed", className: "bg-blue-100 text-blue-700", pulse: false },
    archived: { label: "Archived", className: "bg-slate-100 text-slate-500", pulse: false },
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Service Sessions</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {activeSessions.length} active session{activeSessions.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className={clsx(
            "flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all shadow-sm",
            showForm
              ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
              : "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 shadow-blue-200"
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
          className="mb-6 rounded-2xl border border-blue-200 bg-blue-50/50 p-5 space-y-4 shadow-sm"
        >
          <h2 className="text-sm font-semibold text-blue-900">Start New Session</h2>

          <div>
            <label htmlFor="techName" className="block text-xs font-medium text-slate-600 mb-1.5">
              Technician Name <span className="text-red-500">*</span>
            </label>
            <input
              id="techName"
              type="text"
              value={technicianName}
              onChange={(e) => setTechnicianName(e.target.value)}
              placeholder="Your name"
              className="input-field"
              required
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="custName" className="block text-xs font-medium text-slate-600 mb-1.5">
              Customer Name
            </label>
            <input
              id="custName"
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Optional"
              className="input-field"
            />
          </div>

          <div>
            <label htmlFor="siteAddr" className="block text-xs font-medium text-slate-600 mb-1.5">
              Site Address
            </label>
            <input
              id="siteAddr"
              type="text"
              value={siteAddress}
              onChange={(e) => setSiteAddress(e.target.value)}
              placeholder="Optional"
              className="input-field"
            />
          </div>

          <button
            type="submit"
            disabled={!technicianName.trim() || creating}
            className="btn-primary w-full py-3 text-base"
          >
            {creating ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
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
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      )}

      {/* Empty state */}
      {!loading && sessions.length === 0 && !showForm && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 mb-4">
            <MessageSquare className="h-8 w-8 text-slate-400" />
          </div>
          <p className="text-lg font-semibold text-slate-700">No sessions yet</p>
          <p className="text-sm text-slate-500 mt-1 max-w-xs">
            Start a new session to begin identifying equipment, checking bulletins, and generating reports.
          </p>
        </div>
      )}

      {/* Active Sessions */}
      {!loading && activeSessions.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-1">
            Active Sessions
          </h2>
          <div className="space-y-3">
            {activeSessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                config={statusConfig[session.status]}
                onClick={() => router.push(`/session/${session.id}`)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Completed / Archived Sessions */}
      {!loading && completedSessions.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-1">
            Previous Sessions
          </h2>
          <div className="space-y-3">
            {completedSessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                config={statusConfig[session.status]}
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
  config: { label: string; className: string; pulse: boolean };
  onClick: () => void;
}

function SessionCard({ session, config, onClick }: SessionCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm text-left transition-all hover:shadow-md hover:border-slate-300 active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          {/* Status + Technician */}
          <div className="flex items-center gap-2">
            <span className={clsx("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold", config.className)}>
              {config.pulse && (
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
                </span>
              )}
              {config.label}
            </span>
            <span className="flex items-center gap-1 text-sm font-medium text-slate-800 truncate">
              <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              {session.technicianName}
            </span>
          </div>

          {/* Customer & Site */}
          {(session.customerName || session.siteAddress) && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
              {session.customerName && <span>{session.customerName}</span>}
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
              <Cpu className="h-3 w-3 text-green-500" />
              <span className="font-medium text-slate-700">
                {session.manufacturer && `${session.manufacturer} `}
                {session.modelNumber}
              </span>
            </div>
          )}

          {/* Meta */}
          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              {session.messageCount} message{session.messageCount !== 1 ? "s" : ""}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatRelativeTime(session.createdAt)}
            </span>
          </div>
        </div>

        <ChevronRight className="h-5 w-5 text-slate-300 shrink-0 mt-1" />
      </div>
    </button>
  );
}
