import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const TITLE_CASE_SKIP = new Set(["of", "de", "la", "le", "du", "des", "the", "and", "at", "in", "on"]);
export function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(" ")
    .map((w, i) => (i === 0 || !TITLE_CASE_SKIP.has(w)) ? w.charAt(0).toUpperCase() + w.slice(1) : w)
    .join(" ");
}
