import { TRACK_OUTLINES } from "@/lib/track-outlines.generated";
import { cn } from "@/lib/utils";

interface TrackOutlineProps {
  circuitId: string;
  color: string;
  className?: string;
}

export function TrackOutline({ circuitId, color, className }: TrackOutlineProps) {
  const outline = TRACK_OUTLINES[circuitId];
  if (!outline) return null;

  return (
    <svg
      viewBox={outline.viewBox}
      className={cn("pointer-events-none", className)}
      aria-hidden
    >
      <path d={outline.path} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" opacity={0.35} />
    </svg>
  );
}
