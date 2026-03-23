"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MessageSquare } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  highlight?: boolean;
}

const navItems: NavItem[] = [
  { label: "Home", href: "/", icon: Home },
  { label: "Sessions", href: "/session", icon: MessageSquare, highlight: true },
];

export function BottomNav() {
  const pathname = usePathname();

  function isActive(href: string): boolean {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-field-border bg-field-surface/95 backdrop-blur-sm shadow-[0_-1px_0_rgba(31,48,80,0.8)] safe-bottom"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-2">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center justify-center gap-1 py-1 text-xs font-semibold transition-colors ${
                active
                  ? "text-field-accent"
                  : item.highlight
                    ? "text-field-muted-bright hover:text-field-text"
                    : "text-field-muted hover:text-field-text"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <div className={`relative flex items-center justify-center rounded-xl p-1.5 transition-colors ${active ? "bg-field-accent/10" : ""}`}>
                <Icon
                  className={`h-5 w-5 ${active ? "stroke-[2.5px]" : "stroke-[1.75px]"}`}
                />
                {active && item.highlight && (
                  <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-field-accent" />
                )}
              </div>
              <span className="tracking-wide">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
