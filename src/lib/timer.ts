/**
 * Decide what to record when a running timer is found to have elapsed past its
 * total — on app reopen (rehydrate) or after the tab was backgrounded.
 *
 * Inputs (all epoch ms / ms):
 *   • lastResumedAt  — when the current running segment began counting.
 *   • baseElapsedMs  — focused time accumulated across earlier pause/resume
 *                      segments (so we don't infer it from total - remaining).
 *   • totalMs        — the session's full length.
 *   • now            — current time.
 *
 * Rule:
 *   • genuine = baseElapsed + (now - lastResumedAt). If it's < total, the timer
 *     simply hasn't finished — keep running (record: false, stale: false).
 *   • Once finished, look at how long past the completion point we kept
 *     "running": overshoot = segment - needed. If overshoot exceeds one full
 *     `total` (the GRACE margin), the app was almost certainly left/backgrounded
 *     far longer than the timer ran, so the focus is phantom → STALE, discard.
 *   • Otherwise it plausibly ran in the background → record the genuine focused
 *     time, capped at total.
 */
export interface TimerResolution {
  /** Record a focus session of `recordedMs`. */
  record: boolean;
  /** Focused ms to record (capped at total); 0 when not recording. */
  recordedMs: number;
  /** Completed-but-discarded because the gap was implausibly large. */
  stale: boolean;
}

export function resolveTimerOnResume(p: {
  lastResumedAt: number;
  baseElapsedMs: number;
  totalMs: number;
  now: number;
}): TimerResolution {
  const segment = Math.max(0, p.now - p.lastResumedAt);
  const genuine = p.baseElapsedMs + segment;

  if (genuine < p.totalMs) {
    return { record: false, recordedMs: 0, stale: false }; // not finished yet
  }

  const needed = Math.max(0, p.totalMs - p.baseElapsedMs);
  const overshoot = segment - needed; // time spent "running" after it should have ended
  const GRACE = p.totalMs; // tolerate up to one full duration of background drift

  if (overshoot > GRACE) {
    return { record: false, recordedMs: 0, stale: true }; // implausible gap → discard
  }
  return { record: true, recordedMs: Math.min(genuine, p.totalMs), stale: false };
}
