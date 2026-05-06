export const LETTER_COLORS: Record<string, string> = {
  M: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  m: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  L: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  l: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  H: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  h: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  V: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  v: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  C: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  c: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  S: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  s: "bg-violet-500/15 text-violet-400 border-violet-500/30",
  Q: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  q: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  T: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  t: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  A: "bg-pink-500/15 text-pink-400 border-pink-500/30",
  a: "bg-pink-500/15 text-pink-400 border-pink-500/30",
  Z: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
  z: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
};

export function fmtNum(n: number): string {
  return parseFloat(n.toFixed(4)).toString();
}
