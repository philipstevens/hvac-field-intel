"use client";

import { useRef } from "react";
import {
  Search,
  Wrench,
  AlertTriangle,
  ArrowRightLeft,
  Lightbulb,
  FileText,
  Package,
  HelpCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import clsx from "clsx";

interface QuickActionsProps {
  suggestions: string[];
  onSelect: (text: string) => void;
  disabled?: boolean;
}

function getChipIcon(text: string): LucideIcon {
  const lower = text.toLowerCase();
  if (lower.includes("part")) return Wrench;
  if (lower.includes("bulletin")) return AlertTriangle;
  if (lower.includes("supersess")) return ArrowRightLeft;
  if (lower.includes("diagnostic") || lower.includes("help")) return Lightbulb;
  if (lower.includes("report")) return FileText;
  if (lower.includes("supplier") || lower.includes("stock")) return Package;
  if (lower.includes("what") || lower.includes("any") || lower.includes("check")) return HelpCircle;
  return Search;
}

export function QuickActions({ suggestions, onSelect, disabled = false }: QuickActionsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (suggestions.length === 0) return null;

  return (
    <div className="relative">
      {/* Left fade */}
      <div className="pointer-events-none absolute left-0 top-0 bottom-0 z-10 w-6 bg-gradient-to-r from-slate-50 to-transparent" />
      {/* Right fade */}
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 z-10 w-6 bg-gradient-to-l from-slate-50 to-transparent" />

      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto px-4 py-2 scrollbar-hide snap-x snap-mandatory"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {suggestions.map((text, i) => {
          const Icon = getChipIcon(text);
          return (
            <button
              key={i}
              onClick={() => onSelect(text)}
              disabled={disabled}
              className={clsx(
                "flex shrink-0 snap-start items-center gap-1.5 rounded-full border border-slate-200",
                "bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm",
                "transition-all active:scale-95",
                "hover:border-blue-300 hover:text-blue-700 hover:shadow-md",
                "disabled:opacity-40 disabled:cursor-not-allowed"
              )}
            >
              <Icon className="h-3.5 w-3.5 text-slate-400" />
              <span className="whitespace-nowrap">{text}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
