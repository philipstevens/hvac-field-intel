"use client";

import {
  Cpu,
  AlertTriangle,
  Info,
  ShieldAlert,
  Wrench,
  ArrowRight,
  Lightbulb,
  ClipboardList,
  CheckCircle2,
  Circle,
  Check,
  Package,
  MapPin,
  Clock,
} from "lucide-react";
import { useState } from "react";
import clsx from "clsx";

export interface Message {
  id: string;
  role: "user" | "system";
  messageType: string;
  content: string;
  metadata: string | null;
  createdAt: string;
}

interface ChatMessageProps {
  message: Message;
  isNew?: boolean;
  sessionId?: string;
}

export function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 10) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function parseMetadata(metadata: string | null): Record<string, any> {
  if (!metadata) return {};
  try {
    return JSON.parse(metadata);
  } catch {
    return {};
  }
}

function EquipmentIdentifiedCard({ content, metadata }: { content: string; metadata: Record<string, any> }) {
  // Support both flat metadata and nested { equipment: {...} } from the engine
  const equip = metadata.equipment || metadata;

  return (
    <div className="rounded-xl border border-green-200 bg-green-50/80 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100">
          <Cpu className="h-4 w-4 text-green-600" />
        </div>
        <span className="text-sm font-semibold text-green-800">Equipment Identified</span>
        <CheckCircle2 className="ml-auto h-5 w-5 text-green-500" />
      </div>

      {equip.manufacturer && (
        <p className="text-xs font-medium text-green-600 uppercase tracking-wide">
          {equip.manufacturer}
        </p>
      )}

      {equip.modelNumber && (
        <p className="text-base font-bold text-slate-900">{equip.modelNumber}</p>
      )}

      {equip.description && (
        <p className="text-sm text-slate-600">{equip.description}</p>
      )}

      <div className="grid grid-cols-2 gap-2">
        {equip.btuRating && (
          <div className="rounded-lg bg-white/70 px-3 py-2 border border-green-100">
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">BTU</p>
            <p className="text-sm font-semibold text-slate-800">{Number(equip.btuRating).toLocaleString()}</p>
          </div>
        )}
        {equip.seerRating && (
          <div className="rounded-lg bg-white/70 px-3 py-2 border border-green-100">
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">SEER</p>
            <p className="text-sm font-semibold text-slate-800">{equip.seerRating}</p>
          </div>
        )}
        {equip.voltage && (
          <div className="rounded-lg bg-white/70 px-3 py-2 border border-green-100">
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Voltage</p>
            <p className="text-sm font-semibold text-slate-800">{equip.voltage}</p>
          </div>
        )}
        {equip.refrigerantType && (
          <div className="rounded-lg bg-white/70 px-3 py-2 border border-green-100">
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Refrigerant</p>
            <p className="text-sm font-semibold text-slate-800">{equip.refrigerantType}</p>
          </div>
        )}
      </div>

      {(equip.productionDateRange || (equip.productionStart && equip.productionEnd)) && (
        <p className="text-xs text-slate-500">
          Production: {equip.productionDateRange || `${equip.productionStart} — ${equip.productionEnd || 'present'}`}
        </p>
      )}

      {!equip.manufacturer && !equip.modelNumber && (
        <p className="text-sm text-slate-700">{content}</p>
      )}
    </div>
  );
}

function SingleBulletinCard({ bulletin, content }: { bulletin: Record<string, any>; content: string }) {
  const [expanded, setExpanded] = useState(false);
  const severity = bulletin.severity || "informational";

  const severityConfig = {
    safety_critical: { bg: "bg-red-50", border: "border-red-200", badge: "bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-semibold", icon: ShieldAlert, iconColor: "text-red-500", label: "Safety Critical" },
    warranty: { bg: "bg-amber-50", border: "border-amber-200", badge: "bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-xs font-semibold", icon: AlertTriangle, iconColor: "text-amber-500", label: "Warranty" },
    informational: { bg: "bg-blue-50", border: "border-blue-200", badge: "bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-semibold", icon: Info, iconColor: "text-blue-500", label: "Informational" },
  } as const;

  const config = severityConfig[severity as keyof typeof severityConfig] || severityConfig.informational;
  const Icon = config.icon;

  return (
    <div className={clsx("rounded-xl border p-4 space-y-3", config.bg, config.border)}>
      <div className="flex items-start gap-2">
        <div className={clsx("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", config.bg)}>
          <Icon className={clsx("h-4 w-4", config.iconColor)} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={config.badge}>{config.label}</span>
            {bulletin.bulletinNumber && (
              <span className="text-xs text-slate-500 font-mono">#{bulletin.bulletinNumber}</span>
            )}
          </div>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {bulletin.title || content}
          </p>
        </div>
      </div>

      {bulletin.contentSummary && (
        <p className="text-sm text-slate-600 leading-relaxed">{bulletin.contentSummary}</p>
      )}

      {bulletin.action && !bulletin.contentSummary && (
        <p className="text-sm text-slate-600 leading-relaxed">{bulletin.action}</p>
      )}

      {(bulletin.details || bulletin.fullContent || bulletin.contentSummary) && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
        >
          {expanded ? "Hide Details" : "View Details"}
        </button>
      )}

      {expanded && (
        <div className="rounded-lg bg-white/60 p-3 text-sm text-slate-700 border border-slate-100 leading-relaxed">
          {bulletin.details || bulletin.fullContent || bulletin.contentSummary}
          {bulletin.affectedSerialRange && (
            <p className="mt-2 text-xs text-slate-500">Affected serials: {bulletin.affectedSerialRange}</p>
          )}
        </div>
      )}
    </div>
  );
}

function BulletinAlertCard({ content, metadata }: { content: string; metadata: Record<string, any> }) {
  // Handle both single bulletin metadata and { bulletins: [...] } array from engine
  if (metadata.bulletins && Array.isArray(metadata.bulletins) && metadata.bulletins.length > 0) {
    return (
      <div className="space-y-2">
        {metadata.bulletins.map((b: any, i: number) => (
          <SingleBulletinCard key={i} bulletin={b} content={content} />
        ))}
      </div>
    );
  }

  // Single bulletin (flat metadata from seed data)
  return <SingleBulletinCard bulletin={metadata} content={content} />;
}

function SinglePartCard({ part }: { part: any }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-slate-900 font-mono">{part.partNumber}</p>
        <span className={clsx(
          "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase",
          part.status === "active" ? "bg-green-100 text-green-700" :
          part.status === "superseded" ? "bg-amber-100 text-amber-700" :
          "bg-slate-100 text-slate-600"
        )}>
          {part.status || "active"}
        </span>
      </div>
      {part.description && <p className="text-xs text-slate-600">{part.description}</p>}
      {part.positionCode && <p className="text-[10px] text-slate-400">Position: {part.positionCode}</p>}
      {part.supersededBy && (
        <div className="flex items-center gap-1 text-xs">
          <span className="text-amber-600">Superseded by:</span>
          <span className="font-mono font-semibold text-green-700">{part.supersededBy.partNumber}</span>
        </div>
      )}
      {part.suppliers && Array.isArray(part.suppliers) && part.suppliers.length > 0 && (
        <div className="space-y-1 pt-1 border-t border-slate-100">
          {part.suppliers.slice(0, 2).map((s: any, i: number) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="text-slate-600">{s.supplierName} ({s.city})</span>
              <span className={clsx(
                "font-semibold",
                (s.stockQuantity ?? 0) > 0 ? "text-green-600" : "text-red-500"
              )}>
                {(s.stockQuantity ?? 0) > 0 ? `${s.stockQuantity} @ $${(s.priceCents / 100).toFixed(2)}` : "Out"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PartsInfoCard({ content, metadata }: { content: string; metadata: Record<string, any> }) {
  // Support multiple formats:
  // 1. Seed data: { currentPart: {...}, supersessionChain: [...] }
  // 2. Engine data: { parts: [...] } or { inventory: [...] }
  // 3. Flat: { partNumber, description, ... }

  // If engine returned multiple parts, render all of them
  if (metadata.parts && Array.isArray(metadata.parts) && metadata.parts.length > 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
            <Wrench className="h-4 w-4 text-slate-600" />
          </div>
          <span className="text-sm font-semibold text-slate-800">Parts Information</span>
          <span className="ml-auto text-xs text-slate-500">{metadata.parts.length} part(s)</span>
        </div>
        {metadata.parts.map((p: any, idx: number) => (
          <SinglePartCard key={idx} part={p} />
        ))}
      </div>
    );
  }

  if (metadata.inventory && Array.isArray(metadata.inventory) && metadata.inventory.length > 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
            <Wrench className="h-4 w-4 text-slate-600" />
          </div>
          <span className="text-sm font-semibold text-slate-800">Supplier Availability</span>
        </div>
        {metadata.inventory.map((inv: any, idx: number) => (
          <div key={idx} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 border border-slate-100">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-800 font-mono">{inv.partNumber}</p>
              <p className="text-xs text-slate-500">{inv.supplierName} — {inv.city}, {inv.state}</p>
            </div>
            <div className="text-right shrink-0 ml-3">
              {inv.priceCents && <p className="text-sm font-semibold text-slate-900">${(inv.priceCents / 100).toFixed(2)}</p>}
              <span className={clsx(
                "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase",
                (inv.stockQuantity ?? 0) > 5 ? "bg-green-100 text-green-700" :
                (inv.stockQuantity ?? 0) > 0 ? "bg-amber-100 text-amber-700" :
                "bg-red-100 text-red-700"
              )}>
                {(inv.stockQuantity ?? 0) > 0 ? `${inv.stockQuantity} in stock` : "Out of Stock"}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const part = metadata.currentPart || metadata;
  const chain: any[] = metadata.supersessionChain || part.supersessionChain || [];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
          <Wrench className="h-4 w-4 text-slate-600" />
        </div>
        <span className="text-sm font-semibold text-slate-800">Parts Information</span>
      </div>

      {part.partNumber && (
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Part Number</p>
          <p className="text-sm font-bold text-slate-900 font-mono">{part.partNumber}</p>
          {part.description && <p className="text-sm text-slate-600 mt-0.5">{part.description}</p>}
        </div>
      )}

      {part.status && (
        <span className={clsx(
          "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium",
          part.status === "active" ? "bg-green-100 text-green-700" :
          part.status === "superseded" ? "bg-amber-100 text-amber-700" :
          "bg-slate-100 text-slate-600"
        )}>
          {part.status === "active" ? "Active" : part.status === "superseded" ? "Superseded" : part.status}
        </span>
      )}

      {chain.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Supersession Chain</p>
          <div className="flex items-center gap-1 flex-wrap">
            {chain.map((item: any, i: number) => {
              const pn = typeof item === 'string' ? item : item.partNumber;
              const isLast = i === chain.length - 1;
              const isSupereded = typeof item === 'object' ? item.status === 'superseded' : !isLast;
              return (
                <span key={i} className="flex items-center gap-1">
                  <span className={clsx(
                    "rounded-md px-2 py-0.5 text-xs font-mono",
                    isLast && !isSupereded
                      ? "bg-green-100 text-green-700 font-semibold"
                      : "bg-slate-100 text-slate-500 line-through"
                  )}>
                    {pn}
                  </span>
                  {!isLast && (
                    <ArrowRight className="h-3 w-3 text-slate-400" />
                  )}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {part.suppliers && Array.isArray(part.suppliers) && part.suppliers.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">Supplier Availability</p>
          {part.suppliers.slice(0, 3).map((supplier: any, i: number) => (
            <div key={i} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 border border-slate-100">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{supplier.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {supplier.distance && (
                    <span className="flex items-center gap-0.5 text-xs text-slate-500">
                      <MapPin className="h-3 w-3" />{supplier.distance}
                    </span>
                  )}
                  {supplier.leadTime && (
                    <span className="flex items-center gap-0.5 text-xs text-slate-500">
                      <Clock className="h-3 w-3" />{supplier.leadTime}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0 ml-3">
                {supplier.price && (
                  <p className="text-sm font-semibold text-slate-900">${supplier.price}</p>
                )}
                <span className={clsx(
                  "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase",
                  supplier.stockCount > 5 ? "bg-green-100 text-green-700" :
                  supplier.stockCount > 0 ? "bg-amber-100 text-amber-700" :
                  "bg-red-100 text-red-700"
                )}>
                  {supplier.stockCount > 5 ? "In Stock" :
                   supplier.stockCount > 0 ? "Low Stock" : "Out of Stock"}
                  {supplier.stockCount > 0 && ` (${supplier.stockCount})`}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {!part.partNumber && <p className="text-sm text-slate-700">{content}</p>}
    </div>
  );
}

function SuggestionCard({ content, metadata }: { content: string; metadata: Record<string, any> }) {
  const [checkedSteps, setCheckedSteps] = useState<Set<number>>(new Set());

  // Support both flat steps array and suggestedChecks object array
  let steps: string[] = metadata.steps || [];
  if (steps.length === 0 && metadata.suggestedChecks && Array.isArray(metadata.suggestedChecks)) {
    steps = metadata.suggestedChecks.map((check: any) =>
      `Check ${check.component}${check.reason ? ` — ${check.reason}` : ''}${check.partNumber ? ` (Part: ${check.partNumber})` : ''}`
    );
  }
  const tips: string[] = metadata.tips || [];

  const toggleStep = (index: number) => {
    setCheckedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100">
          <Lightbulb className="h-4 w-4 text-amber-600" />
        </div>
        <span className="text-sm font-semibold text-amber-900">Suggested Diagnostics</span>
      </div>

      {content && steps.length === 0 && (
        <p className="text-sm text-slate-700 leading-relaxed">{content}</p>
      )}

      {steps.length > 0 && (
        <div className="space-y-2">
          {steps.map((step, i) => (
            <button
              key={i}
              onClick={() => toggleStep(i)}
              className="flex w-full items-start gap-3 rounded-lg bg-white/70 px-3 py-2.5 text-left border border-amber-100 transition-colors hover:bg-white active:bg-amber-50"
            >
              <span className="mt-0.5 shrink-0">
                {checkedSteps.has(i) ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <Circle className="h-5 w-5 text-slate-300" />
                )}
              </span>
              <span className={clsx(
                "text-sm leading-relaxed",
                checkedSteps.has(i) ? "text-slate-400 line-through" : "text-slate-700"
              )}>
                <span className="font-semibold text-slate-500 mr-1">{i + 1}.</span>
                {step}
              </span>
            </button>
          ))}
        </div>
      )}

      {tips.length > 0 && (
        <div className="rounded-lg bg-white/50 p-3 border border-amber-100">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-1.5">Tips</p>
          <ul className="space-y-1">
            {tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-slate-600">
                <Check className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ReportGeneratedCard({ content, metadata, sessionId }: { content: string; metadata: Record<string, any>; sessionId?: string }) {
  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
          <ClipboardList className="h-4 w-4 text-blue-600" />
        </div>
        <span className="text-sm font-semibold text-blue-900">Service Report Draft</span>
      </div>

      <p className="text-sm text-slate-700 leading-relaxed">{content}</p>

      {metadata.summary && (
        <div className="rounded-lg bg-white/60 p-3 border border-blue-100 space-y-1.5">
          {Object.entries(metadata.summary).map(([key, value]) => (
            <div key={key} className="flex justify-between text-sm">
              <span className="text-slate-500 capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</span>
              <span className="font-medium text-slate-800">{String(value)}</span>
            </div>
          ))}
        </div>
      )}

      {metadata.missingFields && metadata.missingFields.length > 0 && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
          <p className="text-xs text-amber-700 font-medium">
            {metadata.missingFields.length} field{metadata.missingFields.length !== 1 ? "s" : ""} still need your input — highlighted in the form
          </p>
        </div>
      )}

      <a
        href={`/session/${metadata.sessionId ?? sessionId}/report`}
        className="btn-primary flex w-full items-center justify-center gap-2 text-sm py-3"
      >
        <ClipboardList className="h-4 w-4" />
        Review & Submit
      </a>
    </div>
  );
}

function MeasurementCard({ content }: { content: string; metadata: Record<string, any> }) {
  return (
    <div className="rounded-xl border border-purple-200 bg-purple-50/60 p-4 space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100">
          <Package className="h-4 w-4 text-purple-600" />
        </div>
        <span className="text-sm font-semibold text-purple-900">Measurement</span>
      </div>
      <p className="text-sm text-slate-700 leading-relaxed">{content}</p>
    </div>
  );
}

export function ChatMessage({ message, isNew = false, sessionId }: ChatMessageProps) {
  const metadata = parseMetadata(message.metadata);
  const isUser = message.role === "user";

  return (
    <div
      className={clsx(
        "flex w-full px-4 py-1",
        isUser ? "justify-end" : "justify-start",
        isNew && "animate-in"
      )}
      style={isNew ? {
        animation: "messageIn 0.3s ease-out forwards",
      } : undefined}
    >
      <div className={clsx("max-w-[85%] lg:max-w-[70%]", isUser ? "items-end" : "items-start")}>
        {isUser ? (
          <div className="rounded-2xl rounded-br-md bg-blue-600 px-4 py-3 text-sm text-white leading-relaxed shadow-sm">
            {message.content}
          </div>
        ) : (
          <div className="space-y-0.5">
            {message.messageType === "text" && (
              <div className="rounded-2xl rounded-bl-md bg-white px-4 py-3 text-sm text-slate-800 leading-relaxed shadow-sm border border-slate-100">
                {message.content.split('\n').map((line, i) => (
                  <p key={i} className={i > 0 ? 'mt-1' : ''}>{line}</p>
                ))}
              </div>
            )}
            {message.messageType === "equipment_identified" && (
              <EquipmentIdentifiedCard content={message.content} metadata={metadata} />
            )}
            {message.messageType === "bulletin_alert" && (
              <BulletinAlertCard content={message.content} metadata={metadata} />
            )}
            {message.messageType === "parts_info" && (
              <PartsInfoCard content={message.content} metadata={metadata} />
            )}
            {message.messageType === "suggestion" && (
              <SuggestionCard content={message.content} metadata={metadata} />
            )}
            {message.messageType === "report_generated" && (
              <ReportGeneratedCard content={message.content} metadata={metadata} sessionId={sessionId} />
            )}
            {message.messageType === "measurement" && (
              <MeasurementCard content={message.content} metadata={metadata} />
            )}
          </div>
        )}
        <p className={clsx(
          "mt-1 text-[10px] text-slate-400 px-1",
          isUser ? "text-right" : "text-left"
        )}>
          {formatRelativeTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
}
