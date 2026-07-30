import Link from "next/link";
import { cn } from "@/lib/utils";
import { TrackOutline } from "@/components/race/TrackOutline";

interface SeriesGlowSurfaceProps {
  color: string;
  as?: "div" | "a";
  href?: string;
  circuitId?: string;
  className?: string;
  children: React.ReactNode;
}

export function SeriesGlowSurface({ color, as = "div", href, circuitId, className, children }: SeriesGlowSurfaceProps) {
  const style = { background: `linear-gradient(110deg, color-mix(in oklch, ${color} 20%, var(--card)), var(--card) 55%)` };
  const streak = (
    <span
      aria-hidden
      className="absolute -right-10 -top-8 -bottom-8 w-40 skew-x-[-18deg] opacity-15 pointer-events-none"
      style={{ background: `linear-gradient(180deg, ${color}, transparent)` }}
    />
  );
  const outline = circuitId ? (
    <TrackOutline
      circuitId={circuitId}
      color={color}
      className="absolute right-0 bottom-0 w-2/5 h-2/3 translate-x-1/6 translate-y-1/6"
    />
  ) : null;
  const wrapperClass = cn("relative overflow-hidden rounded-2xl border border-border", className);

  if (as === "a") {
    if (!href) throw new Error('SeriesGlowSurface: as="a" requires href');
    return (
      <Link href={href} className={wrapperClass} style={style}>
        {streak}
        {outline}
        <div className="relative">{children}</div>
      </Link>
    );
  }

  return (
    <div className={wrapperClass} style={style}>
      {streak}
      {outline}
      <div className="relative">{children}</div>
    </div>
  );
}
