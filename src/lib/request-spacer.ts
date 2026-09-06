// Serializes a burst of outbound requests to at most one per `minGapMs`.
// Returns the ms the caller must wait before firing; call sites do the sleeping.
export function makeRequestSpacer(minGapMs: number, clock: () => number = Date.now) {
  let earliest = 0;
  return (): number => {
    const now = clock();
    const at = Math.max(now, earliest);
    earliest = at + minGapMs;
    return at - now;
  };
}
