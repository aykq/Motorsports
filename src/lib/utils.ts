import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Picks white or near-black text for legibility on a solid background color
 * (team/series brand colors span very light to very dark, so a hardcoded
 * `text-white` fails WCAG contrast on pale colors like Mercedes teal or
 * Williams blue). Computes the actual WCAG contrast ratio against both
 * candidates and returns whichever wins — a fixed luminance threshold isn't
 * reliable because contrast ratio is nonlinear in luminance.
 */
export function readableTextColor(hexColor: string): "#ffffff" | "#141414" {
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const bgLum = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  const contrastWithWhite = (1 + 0.05) / (bgLum + 0.05);
  // near-black (#141414) luminance is ~0.0056, close enough to 0 for this comparison
  const contrastWithBlack = (bgLum + 0.05) / (0.0056 + 0.05);
  return contrastWithWhite >= contrastWithBlack ? "#ffffff" : "#141414";
}

const TITLE_CASE_SKIP = new Set(["of", "de", "la", "le", "du", "des", "the", "and", "at", "in", "on"]);
const TITLE_CASE_ACRONYMS = new Set(["gt", "gt3", "gt4", "wec", "us", "uk", "usa"]);
export function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(" ")
    .map((w, i) => {
      if (TITLE_CASE_ACRONYMS.has(w)) return w.toUpperCase();
      return (i === 0 || !TITLE_CASE_SKIP.has(w)) ? w.charAt(0).toUpperCase() + w.slice(1) : w;
    })
    .join(" ");
}
