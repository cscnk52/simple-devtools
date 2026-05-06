const ITEMS = [
  { label: "Move", color: "bg-blue-400" },
  { label: "Line", color: "bg-emerald-400" },
  { label: "Cubic", color: "bg-violet-400" },
  { label: "Quad", color: "bg-amber-400" },
  { label: "Arc", color: "bg-pink-400" },
  { label: "Close", color: "bg-zinc-500" },
] as const;

export default function Legend() {
  return (
    <div className="px-3 py-2 border-t border-zinc-800">
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {ITEMS.map(({ label, color }) => (
          <span key={label} className="flex items-center gap-1 text-[10px] text-zinc-600">
            <span className={`w-1.5 h-1.5 rounded-full ${color}`} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
