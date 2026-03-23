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

export function EquipmentIdentifiedCard({ content, metadata }: { content: string; metadata: Record<string, any> }) {
  const equip = metadata.equipment || metadata;

  return (
    <div className="rounded-xl border border-field-green/25 bg-field-green/8 p-4 space-y-3" style={{ background: 'rgba(34,197,94,0.07)' }}>
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-field-green/15">
          <Cpu className="h-4 w-4 text-field-green" />
        </div>
        <span className="text-sm font-semibold text-field-green">Equipment Identified</span>
        <CheckCircle2 className="ml-auto h-5 w-5 text-field-green/70" />
      </div>

      {equip.manufacturer && (
        <p className="text-xs font-semibold text-field-green/70 uppercase tracking-wider">
          {equip.manufacturer}
        </p>
      )}

      {equip.modelNumber && (
        <p className="font-bc text-lg font-bold text-field-text tracking-wide">{equip.modelNumber}</p>
      )}

      {equip.description && (
        <p className="text-sm text-field-muted-bright">{equip.description}</p>
      )}

      <div className="grid grid-cols-2 gap-2">
        {equip.btuRating && (
          <div className="rounded-lg bg-field-surface2 px-3 py-2 border border-field-border">
            <p className="text-[10px] uppercase tracking-wider text-field-muted font-semibold">BTU</p>
            <p className="text-sm font-semibold text-field-text">{Number(equip.btuRating).toLocaleString()}</p>
          </div>
        )}
        {equip.seerRating && (
          <div className="rounded-lg bg-field-surface2 px-3 py-2 border border-field-border">
            <p className="text-[10px] uppercase tracking-wider text-field-muted font-semibold">SEER</p>
            <p className="text-sm font-semibold text-field-text">{equip.seerRating}</p>
          </div>
        )}
        {equip.voltage && (
          <div className="rounded-lg bg-field-surface2 px-3 py-2 border border-field-border">
            <p className="text-[10px] uppercase tracking-wider text-field-muted font-semibold">Voltage</p>
            <p className="text-sm font-semibold text-field-text">{equip.voltage}</p>
          </div>
        )}
        {equip.refrigerantType && (
          <div className="rounded-lg bg-field-surface2 px-3 py-2 border border-field-border">
            <p className="text-[10px] uppercase tracking-wider text-field-muted font-semibold">Refrigerant</p>
            <p className="text-sm font-semibold text-field-text">{equip.refrigerantType}</p>
          </div>
        )}
      </div>

      {(equip.productionDateRange || (equip.productionStart && equip.productionEnd)) && (
        <p className="text-xs text-field-muted">
          Production: {equip.productionDateRange || `${equip.productionStart} — ${equip.productionEnd || 'present'}`}
        </p>
      )}

      {!equip.manufacturer && !equip.modelNumber && (
        <p className="text-sm text-field-text">{content}</p>
      )}
    </div>
  );
}

function SingleBulletinCard({ bulletin, content }: { bulletin: Record<string, any>; content: string }) {
  const [expanded, setExpanded] = useState(false);
  const severity = bulletin.severity || "informational";

  const severityConfig = {
    safety_critical: {
      bg: "rgba(239,68,68,0.07)",
      border: "border-field-red/25",
      badgeClass: "bg-red-500/15 text-red-400 px-2 py-0.5 rounded-full text-xs font-semibold",
      icon: ShieldAlert,
      iconColor: "text-field-red",
      iconBg: "bg-red-500/15",
      label: "Safety Critical",
      titleColor: "text-field-text",
    },
    warranty: {
      bg: "rgba(245,158,11,0.07)",
      border: "border-field-amber/25",
      badgeClass: "bg-amber-500/15 text-field-amber px-2 py-0.5 rounded-full text-xs font-semibold",
      icon: AlertTriangle,
      iconColor: "text-field-amber",
      iconBg: "bg-amber-500/15",
      label: "Warranty",
      titleColor: "text-field-text",
    },
    informational: {
      bg: "rgba(59,130,246,0.07)",
      border: "border-field-blue/25",
      badgeClass: "bg-blue-500/15 text-field-blue px-2 py-0.5 rounded-full text-xs font-semibold",
      icon: Info,
      iconColor: "text-field-blue",
      iconBg: "bg-blue-500/15",
      label: "Informational",
      titleColor: "text-field-text",
    },
  } as const;

  const config = severityConfig[severity as keyof typeof severityConfig] || severityConfig.informational;
  const Icon = config.icon;

  return (
    <div className={clsx("rounded-xl border p-4 space-y-3", config.border)} style={{ background: config.bg }}>
      <div className="flex items-start gap-2">
        <div className={clsx("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", config.iconBg)}>
          <Icon className={clsx("h-4 w-4", config.iconColor)} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={config.badgeClass}>{config.label}</span>
            {bulletin.bulletinNumber && (
              <span className="text-xs text-field-muted font-mono">#{bulletin.bulletinNumber}</span>
            )}
          </div>
          <p className={clsx("mt-1 text-sm font-semibold", config.titleColor)}>
            {bulletin.title || content}
          </p>
        </div>
      </div>

      {bulletin.contentSummary && (
        <p className="text-sm text-field-muted-bright leading-relaxed">{bulletin.contentSummary}</p>
      )}

      {bulletin.action && !bulletin.contentSummary && (
        <p className="text-sm text-field-muted-bright leading-relaxed">{bulletin.action}</p>
      )}

      {(bulletin.details || bulletin.fullContent || bulletin.contentSummary) && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs font-semibold text-field-accent hover:text-field-accent-hover transition-colors"
        >
          {expanded ? "Hide Details" : "View Details"}
        </button>
      )}

      {expanded && (
        <div className="rounded-lg bg-field-surface2 p-3 text-sm text-field-muted-bright border border-field-border leading-relaxed">
          {bulletin.details || bulletin.fullContent || bulletin.contentSummary}
          {bulletin.affectedSerialRange && (
            <p className="mt-2 text-xs text-field-muted">Affected serials: {bulletin.affectedSerialRange}</p>
          )}
        </div>
      )}
    </div>
  );
}

export function BulletinAlertCard({ content, metadata }: { content: string; metadata: Record<string, any> }) {
  if (metadata.bulletins && Array.isArray(metadata.bulletins) && metadata.bulletins.length > 0) {
    return (
      <div className="space-y-2">
        {metadata.bulletins.map((b: any, i: number) => (
          <SingleBulletinCard key={i} bulletin={b} content={content} />
        ))}
      </div>
    );
  }
  return <SingleBulletinCard bulletin={metadata} content={content} />;
}

function SinglePartCard({ part }: { part: any }) {
  return (
    <div className="rounded-xl border border-field-border bg-field-surface2 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-field-text font-mono">{part.partNumber}</p>
        <span className={clsx(
          "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase",
          part.status === "active" ? "bg-field-green/15 text-field-green" :
          part.status === "superseded" ? "bg-field-amber/15 text-field-amber" :
          "bg-field-border text-field-muted"
        )}>
          {part.status || "active"}
        </span>
      </div>
      {part.description && <p className="text-xs text-field-muted-bright">{part.description}</p>}
      {part.positionCode && <p className="text-[10px] text-field-muted">Position: {part.positionCode}</p>}
      {part.supersededBy && (
        <div className="flex items-center gap-1 text-xs">
          <span className="text-field-amber">Superseded by:</span>
          <span className="font-mono font-semibold text-field-green">{part.supersededBy.partNumber}</span>
        </div>
      )}
      {part.suppliers && Array.isArray(part.suppliers) && part.suppliers.length > 0 && (
        <div className="space-y-1 pt-1 border-t border-field-border">
          {part.suppliers.slice(0, 2).map((s: any, i: number) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="text-field-muted">{s.supplierName} ({s.city})</span>
              <span className={clsx(
                "font-semibold",
                (s.stockQuantity ?? 0) > 0 ? "text-field-green" : "text-field-red"
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

export function PartsInfoCard({ content, metadata }: { content: string; metadata: Record<string, any> }) {
  if (metadata.parts && Array.isArray(metadata.parts) && metadata.parts.length > 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-field-surface2 border border-field-border">
            <Wrench className="h-4 w-4 text-field-muted-bright" />
          </div>
          <span className="text-sm font-semibold text-field-text">Parts Information</span>
          <span className="ml-auto text-xs text-field-muted">{metadata.parts.length} part(s)</span>
        </div>
        {metadata.parts.map((p: any, idx: number) => (
          <SinglePartCard key={idx} part={p} />
        ))}
      </div>
    );
  }

  if (metadata.inventory && Array.isArray(metadata.inventory) && metadata.inventory.length > 0) {
    return (
      <div className="rounded-xl border border-field-border bg-field-surface p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-field-surface2 border border-field-border">
            <Wrench className="h-4 w-4 text-field-muted-bright" />
          </div>
          <span className="text-sm font-semibold text-field-text">Supplier Availability</span>
        </div>
        {metadata.inventory.map((inv: any, idx: number) => (
          <div key={idx} className="flex items-center justify-between rounded-lg bg-field-surface2 px-3 py-2 border border-field-border">
            <div className="min-w-0">
              <p className="text-sm font-medium text-field-text font-mono">{inv.partNumber}</p>
              <p className="text-xs text-field-muted">{inv.supplierName} — {inv.city}, {inv.state}</p>
            </div>
            <div className="text-right shrink-0 ml-3">
              {inv.priceCents && <p className="text-sm font-semibold text-field-text">${(inv.priceCents / 100).toFixed(2)}</p>}
              <span className={clsx(
                "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase",
                (inv.stockQuantity ?? 0) > 5 ? "bg-field-green/15 text-field-green" :
                (inv.stockQuantity ?? 0) > 0 ? "bg-field-amber/15 text-field-amber" :
                "bg-field-red/15 text-field-red"
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
    <div className="rounded-xl border border-field-border bg-field-surface p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-field-surface2 border border-field-border">
          <Wrench className="h-4 w-4 text-field-muted-bright" />
        </div>
        <span className="text-sm font-semibold text-field-text">Parts Information</span>
      </div>

      {part.partNumber && (
        <div>
          <p className="text-[10px] text-field-muted uppercase tracking-wider font-semibold mb-1">Part Number</p>
          <p className="text-sm font-bold text-field-text font-mono">{part.partNumber}</p>
          {part.description && <p className="text-sm text-field-muted-bright mt-0.5">{part.description}</p>}
        </div>
      )}

      {part.status && (
        <span className={clsx(
          "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold",
          part.status === "active" ? "bg-field-green/15 text-field-green" :
          part.status === "superseded" ? "bg-field-amber/15 text-field-amber" :
          "bg-field-border text-field-muted"
        )}>
          {part.status === "active" ? "Active" : part.status === "superseded" ? "Superseded" : part.status}
        </span>
      )}

      {chain.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] text-field-muted uppercase tracking-wider font-semibold">Supersession Chain</p>
          <div className="flex items-center gap-1 flex-wrap">
            {chain.map((item: any, i: number) => {
              const pn = typeof item === 'string' ? item : item.partNumber;
              const isLast = i === chain.length - 1;
              const isSuperseded = typeof item === 'object' ? item.status === 'superseded' : !isLast;
              return (
                <span key={i} className="flex items-center gap-1">
                  <span className={clsx(
                    "rounded-md px-2 py-0.5 text-xs font-mono",
                    isLast && !isSuperseded
                      ? "bg-field-green/15 text-field-green font-semibold"
                      : "bg-field-border text-field-muted line-through"
                  )}>
                    {pn}
                  </span>
                  {!isLast && (
                    <ArrowRight className="h-3 w-3 text-field-muted" />
                  )}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {part.suppliers && Array.isArray(part.suppliers) && part.suppliers.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] text-field-muted uppercase tracking-wider font-semibold">Supplier Availability</p>
          {part.suppliers.slice(0, 3).map((supplier: any, i: number) => (
            <div key={i} className="flex items-center justify-between rounded-lg bg-field-surface2 px-3 py-2 border border-field-border">
              <div className="min-w-0">
                <p className="text-sm font-medium text-field-text truncate">{supplier.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {supplier.distance && (
                    <span className="flex items-center gap-0.5 text-xs text-field-muted">
                      <MapPin className="h-3 w-3" />{supplier.distance}
                    </span>
                  )}
                  {supplier.leadTime && (
                    <span className="flex items-center gap-0.5 text-xs text-field-muted">
                      <Clock className="h-3 w-3" />{supplier.leadTime}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0 ml-3">
                {supplier.price && (
                  <p className="text-sm font-semibold text-field-text">${supplier.price}</p>
                )}
                <span className={clsx(
                  "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase",
                  supplier.stockCount > 5 ? "bg-field-green/15 text-field-green" :
                  supplier.stockCount > 0 ? "bg-field-amber/15 text-field-amber" :
                  "bg-field-red/15 text-field-red"
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

      {!part.partNumber && <p className="text-sm text-field-muted-bright">{content}</p>}
    </div>
  );
}

function SuggestionCard({ content, metadata }: { content: string; metadata: Record<string, any> }) {
  const [checkedSteps, setCheckedSteps] = useState<Set<number>>(new Set());

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
    <div className="rounded-xl border border-field-amber/25 p-4 space-y-3" style={{ background: 'rgba(245,158,11,0.07)' }}>
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15">
          <Lightbulb className="h-4 w-4 text-field-amber" />
        </div>
        <span className="text-sm font-semibold text-field-text">Suggested Diagnostics</span>
      </div>

      {content && steps.length === 0 && (
        <p className="text-sm text-field-muted-bright leading-relaxed">{content}</p>
      )}

      {steps.length > 0 && (
        <div className="space-y-2">
          {steps.map((step, i) => (
            <button
              key={i}
              onClick={() => toggleStep(i)}
              className="flex w-full items-start gap-3 rounded-lg bg-field-surface2 px-3 py-3 text-left border border-field-border transition-colors hover:bg-field-surface3 active:opacity-80 min-h-[52px]"
            >
              <span className="mt-0.5 shrink-0">
                {checkedSteps.has(i) ? (
                  <CheckCircle2 className="h-5 w-5 text-field-green" />
                ) : (
                  <Circle className="h-5 w-5 text-field-border" />
                )}
              </span>
              <span className={clsx(
                "text-sm leading-relaxed",
                checkedSteps.has(i) ? "text-field-muted line-through" : "text-field-text"
              )}>
                <span className="font-semibold text-field-muted mr-1">{i + 1}.</span>
                {step}
              </span>
            </button>
          ))}
        </div>
      )}

      {tips.length > 0 && (
        <div className="rounded-lg bg-field-surface2 p-3 border border-field-amber/15">
          <p className="text-xs font-semibold text-field-amber uppercase tracking-wider mb-1.5">Tips</p>
          <ul className="space-y-1">
            {tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-field-muted-bright">
                <Check className="mt-0.5 h-3 w-3 shrink-0 text-field-amber" />
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
    <div className="rounded-xl border border-field-blue/25 p-4 space-y-3" style={{ background: 'rgba(59,130,246,0.07)' }}>
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/15">
          <ClipboardList className="h-4 w-4 text-field-blue" />
        </div>
        <span className="text-sm font-semibold text-field-text">Service Report Draft</span>
      </div>

      <p className="text-sm text-field-muted-bright leading-relaxed">{content}</p>

      {metadata.summary && (
        <div className="rounded-lg bg-field-surface2 p-3 border border-field-border space-y-1.5">
          {Object.entries(metadata.summary).map(([key, value]) => (
            <div key={key} className="flex justify-between text-sm">
              <span className="text-field-muted capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</span>
              <span className="font-medium text-field-text">{String(value)}</span>
            </div>
          ))}
        </div>
      )}

      {metadata.missingFields && metadata.missingFields.length > 0 && (
        <div className="rounded-lg bg-field-amber/10 border border-field-amber/20 px-3 py-2">
          <p className="text-xs text-field-amber font-medium">
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
    <div className="rounded-xl border border-field-purple/25 p-4 space-y-2" style={{ background: 'rgba(168,85,247,0.07)' }}>
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/15">
          <Package className="h-4 w-4 text-field-purple" />
        </div>
        <span className="text-sm font-semibold text-field-text">Measurement</span>
      </div>
      <p className="text-sm text-field-muted-bright leading-relaxed">{content}</p>
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
          <div className="rounded-2xl rounded-br-md bg-field-accent px-4 py-3 text-sm text-white leading-relaxed shadow-sm shadow-field-accent/20">
            {message.content}
          </div>
        ) : (
          <div className="space-y-0.5">
            {message.messageType === "text" && (
              <div className="rounded-2xl rounded-bl-md bg-field-surface px-4 py-3 text-sm text-field-text leading-relaxed border border-field-border">
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
          "mt-1 text-[10px] text-field-muted px-1",
          isUser ? "text-right" : "text-left"
        )}>
          {formatRelativeTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
}
