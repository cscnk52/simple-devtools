import DEFAULT_SAMPLE from "@/utils/path";

interface Props {
  value: string;
  onChange: (d: string) => void;
}

export default function PathInput({ value, onChange }: Props) {
  return (
    <div className="p-3 border-b border-zinc-800">
      <label className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1.5">
        SVG Path
      </label>
      <textarea
        className="w-full h-24 rounded-md bg-zinc-950 border border-zinc-700 text-zinc-200 text-xs font-mono placeholder-zinc-600 px-2.5 py-2 resize-none outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20 transition-colors"
        placeholder={'Paste SVG path d="…"'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
      />
      <button
        type="button"
        onClick={() => onChange(DEFAULT_SAMPLE)}
        className="mt-1.5 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        Load sample path ↗
      </button>
    </div>
  );
}
