"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Wrench,
  X,
  Loader2,
  MessageSquare,
  User,
  MapPin,
  Cpu,
  Clock,
  ChevronRight,
  Lock,
  Thermometer,
  Lightbulb,
  Trash2,
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
  manufacturer?: string | null;
  messageCount: number;
}

const TECH_NAME_KEY = "hvac_tech_name";

export default function HomePage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [technicianName, setTechnicianName] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [siteAddress, setSiteAddress] = useState("");

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  useEffect(() => {
    const saved = localStorage.getItem(TECH_NAME_KEY);
    if (saved) setTechnicianName(saved);
    if (new URLSearchParams(window.location.search).get("new") === "1") setShowForm(true);
  }, []);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/session");
      if (res.ok) setSessions(await res.json());
    } catch (err) {
      console.error("Failed to fetch sessions:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleCreate = async (e: React.FormEvent) => {
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
        localStorage.setItem(TECH_NAME_KEY, technicianName.trim());
        router.push(`/session/${session.id}`);
      }
    } catch (err) {
      console.error("Failed to create session:", err);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/session/${id}`, { method: "DELETE" });
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error("Failed to delete session:", err);
    }
  };

  const { demoSessions, activeSessions, completedSessions } = useMemo(() => {
    const demos: Session[] = [];
    const active: Session[] = [];
    const completed: Session[] = [];
    for (const s of sessions) {
      if (s.isDemo) demos.push(s);
      else if (s.status === "active") active.push(s);
      else completed.push(s);
    }
    return { demoSessions: demos, activeSessions: active, completedSessions: completed };
  }, [sessions]);

  const hasPersonalSessions = activeSessions.length > 0 || completedSessions.length > 0;

  return (
    <div className="px-4 py-5 space-y-5 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2.5 pt-1">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-field-accent/10 border border-field-accent/20">
          <Thermometer className="w-5 h-5 text-field-accent" />
        </div>
        <div>
          <h1 className="font-bc text-xl font-bold uppercase tracking-wide text-field-text leading-none">
            HVAC Field Intel
          </h1>
          <p className="text-[11px] text-field-muted mt-0.5">{today}</p>
        </div>
      </div>

      {/* Start Session CTA / form toggle */}
      <button
        onClick={() => setShowForm(!showForm)}
        className="group w-full block active:scale-[0.985] transition-transform"
      >
        <div className="relative overflow-hidden rounded-2xl shadow-lg shadow-field-accent/15">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500 via-field-accent to-orange-700" />
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)",
              backgroundSize: "8px 8px",
            }}
          />
          <div className="absolute inset-x-0 top-0 h-px bg-white/25" />
          <div className="relative flex items-center gap-4 px-5 py-5">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-black/20 border border-white/10">
              {showForm ? (
                <X className="h-7 w-7 text-white" />
              ) : (
                <Wrench className="h-7 w-7 text-white" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bc text-[22px] font-bold uppercase tracking-wider text-white leading-tight">
                {showForm ? "Cancel" : "Start Service Call"}
              </p>
              <p className="text-[13px] text-orange-100/75 mt-0.5 truncate">
                {showForm
                  ? "Close and discard"
                  : "Identify equipment · Check bulletins · Document"}
              </p>
            </div>
          </div>
        </div>
      </button>

      {/* Inline new session form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="-mt-2 rounded-2xl border border-field-accent/25 bg-field-surface p-5 space-y-4 shadow-lg shadow-black/20"
        >
          <div>
            <label
              htmlFor="techName"
              className="block text-xs font-semibold text-field-muted-bright mb-2 uppercase tracking-wide"
            >
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
            <label
              htmlFor="custName"
              className="block text-xs font-semibold text-field-muted-bright mb-2 uppercase tracking-wide"
            >
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
            <label
              htmlFor="siteAddr"
              className="block text-xs font-semibold text-field-muted-bright mb-2 uppercase tracking-wide"
            >
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

      {/* Demo hint */}
      {!loading && !hasPersonalSessions && !showForm && (
        <div className="rounded-xl border border-field-amber/20 bg-field-amber/5 p-4">
          <div className="flex items-start gap-3">
            <Lightbulb className="w-4 h-4 text-field-amber flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-field-amber">Try it out</p>
              <p className="text-xs text-field-muted mt-1 leading-relaxed">
                Start a session and type:{" "}
                <span className="font-mono text-field-muted-bright">Carrier 24ANB636A003</span>,{" "}
                <span className="font-mono text-field-muted-bright">Trane 4TTR6036J1000A</span>,{" "}
                <span className="font-mono text-field-muted-bright">Heatcraft BEH030A6K</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-field-muted" />
        </div>
      )}

      {/* Active sessions */}
      {!loading && activeSessions.length > 0 && (
        <section>
          <SectionLabel label="Active" />
          <div className="space-y-2.5">
            {activeSessions.map((s) => (
              <SessionCard
                key={s.id}
                session={s}
                onClick={() => router.push(`/session/${s.id}`)}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </section>
      )}

      {/* Completed sessions */}
      {!loading && completedSessions.length > 0 && (
        <section>
          <SectionLabel label="Previous" />
          <div className="space-y-2.5">
            {completedSessions.map((s) => (
              <SessionCard
                key={s.id}
                session={s}
                onClick={() => router.push(`/session/${s.id}`)}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </section>
      )}

      {/* Demo sessions */}
      {!loading && demoSessions.length > 0 && (
        <section>
          <SectionLabel label="Demo" sublabel="Sample sessions — explore the app" />
          <div className="space-y-2.5">
            {demoSessions.map((s) => (
              <SessionCard
                key={s.id}
                session={s}
                onClick={() => router.push(`/session/${s.id}`)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function SectionLabel({ label, sublabel }: { label: string; sublabel?: string }) {
  return (
    <div className="mb-3 px-0.5">
      <h2 className="text-[11px] font-semibold text-field-muted uppercase tracking-wider">
        {label}
      </h2>
      {sublabel && <p className="text-[11px] text-field-muted mt-0.5">{sublabel}</p>}
    </div>
  );
}

interface SessionCardProps {
  session: Session;
  onClick: () => void;
  onDelete?: (id: string) => void;
}

function SessionCard({ session, onClick, onDelete }: SessionCardProps) {
  const isActive = session.status === "active";
  const isCompleted = session.status === "completed";

  return (
    <div
      className={clsx(
        "flex overflow-hidden rounded-xl border bg-field-surface",
        isActive ? "border-field-green/20" : "border-field-border"
      )}
    >
      {/* Status stripe */}
      <div
        className={clsx(
          "w-1.5 shrink-0 rounded-l-xl",
          isActive ? "bg-field-green/70" : isCompleted ? "bg-field-blue/50" : "bg-field-border"
        )}
      />

      <button
        onClick={onClick}
        className="flex flex-1 items-start gap-3 px-4 py-4 min-w-0 text-left active:opacity-75 transition-opacity"
      >
        <div className="min-w-0 flex-1 space-y-1.5">
          {/* Badges + tech name */}
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
              <span
                className={clsx(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
                  isCompleted ? "bg-field-blue/10 text-field-blue" : "bg-field-border text-field-muted"
                )}
              >
                {isCompleted ? "Completed" : "Archived"}
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

          {/* Customer & site */}
          {(session.customerName || session.siteAddress) && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-field-muted">
              {session.customerName && (
                <span className="text-field-muted-bright">{session.customerName}</span>
              )}
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
              <span className="font-bc font-semibold text-field-text tracking-wide">
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
      </button>

      {/* Delete button (non-demo only) */}
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(session.id);
          }}
          className="flex items-center justify-center w-12 shrink-0 text-field-muted hover:text-field-red hover:bg-field-red/5 transition-colors border-l border-field-border"
          aria-label="Delete session"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
