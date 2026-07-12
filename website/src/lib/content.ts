/** Gentle, flower-themed motivation for the Today header. Calm, never pushy. */
export const QUOTES: string[] = [
  "Bloom at your own pace.",
  "Small seeds become beautiful gardens.",
  "Grow through what you go through.",
  "Like a flower, rise softly toward the light.",
  "Tend to today, gently.",
  "Even slow blooms are still blooming.",
  "Plant a little progress today.",
  "She quietly grew, petal by petal.",
  "A calm mind lets good things flourish.",
  "Water your dreams, watch them blossom.",
  "Every petal of effort counts.",
  "Soft days grow strong roots.",
];

/** Deterministic line-of-the-day so it stays stable through the day. */
export function quoteOfDay(dateKey: string): string {
  let hash = 0;
  for (let i = 0; i < dateKey.length; i++) {
    hash = (hash * 31 + dateKey.charCodeAt(i)) >>> 0;
  }
  return QUOTES[hash % QUOTES.length];
}

export function greeting(hour: number): string {
  if (hour < 5) return "Rest well";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Sweet evening";
}
