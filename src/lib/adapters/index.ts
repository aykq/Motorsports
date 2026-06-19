import type { SeriesAdapter } from "@/types/series";
import { f1Adapter } from "./f1";
import { wecAdapter } from "./wec";
import { motogpAdapter } from "./motogp";
import { moto2Adapter } from "./moto2";
import { moto3Adapter } from "./moto3";
import { gt3Adapter } from "./gt3";
import { carreraCupAdapter } from "./carrera-cup";
import { gt4Adapter } from "./gt4";

export const adapters: Record<string, SeriesAdapter> = {
  f1: f1Adapter,
  wec: wecAdapter,
  motogp: motogpAdapter,
  moto2: moto2Adapter,
  moto3: moto3Adapter,
  gt3: gt3Adapter,
  "carrera-cup": carreraCupAdapter,
  gt4: gt4Adapter,
};

export function getAdapter(slug: string): SeriesAdapter | undefined {
  return adapters[slug];
}
