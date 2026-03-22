import { type ClassValue, clsx } from "clsx";

/**
 * Merge class names with clsx. Supports conditional classes,
 * arrays, and objects. Compatible with Tailwind CSS.
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

/**
 * Format a value in cents to a USD currency string.
 * @example formatCurrency(2495) → "$24.95"
 * @example formatCurrency(0) → "$0.00"
 */
export function formatCurrency(cents: number): string {
  const dollars = cents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(dollars);
}

/**
 * Format an ISO date string to a human-readable format.
 * @example formatDate("2024-03-15") → "Mar 15, 2024"
 * @example formatDate("2024-03-15T10:30:00Z") → "Mar 15, 2024"
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

/**
 * Return Tailwind color classes based on bulletin severity level.
 */
export function severityColor(severity: string): string {
  switch (severity) {
    case "safety_critical":
      return "bg-red-100 text-red-700 border-red-200";
    case "recall":
      return "bg-red-100 text-red-700 border-red-200";
    case "warranty":
      return "bg-amber-100 text-amber-700 border-amber-200";
    case "informational":
      return "bg-blue-100 text-blue-700 border-blue-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

/**
 * Convert a snake_case category key to a human-readable label.
 * @example categoryLabel("fan_motor") → "Fan Motor"
 * @example categoryLabel("compressor") → "Compressor"
 */
export function categoryLabel(category: string): string {
  return category
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
