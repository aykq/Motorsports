import type { SeriesAdapter } from "@/types/series";
import { f1Adapter } from "./f1";

export const adapters: Record<string, SeriesAdapter> = {
  f1: f1Adapter,
};

export function getAdapter(slug: string): SeriesAdapter | undefined {
  return adapters[slug];
}
