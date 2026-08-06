/** Minimal "15m" / "7d" / "3600s" -> milliseconds parser (avoids the `ms` dependency). */
export default function ms(input: string): number {
  const match = /^(\d+)(ms|s|m|h|d)$/.exec(input.trim());
  if (!match) throw new Error(`Invalid duration string: ${input}`);
  const value = Number(match[1]);
  const unit = match[2];
  const multipliers: Record<string, number> = { ms: 1, s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return value * multipliers[unit];
}
