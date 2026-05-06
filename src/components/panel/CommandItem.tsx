import type { PathCommand } from "@/utils/path";

import { LETTER_COLORS, fmtNum } from "./shared";

interface Props {
  cmd: PathCommand;
  idx: number;
  selected: boolean;
  onSelect: (id: string | null) => void;
}

export default function CommandItem({ cmd, idx, selected, onSelect }: Props) {
  const cls = LETTER_COLORS[cmd.type] ?? LETTER_COLORS.Z;

  return (
    <button
      type="button"
      onClick={() => onSelect(selected ? null : cmd.id)}
      className={[
        "w-full text-left px-3 py-2 rounded-md transition-colors duration-100 border font-mono text-xs",
        selected
          ? "bg-zinc-700/60 border-zinc-600"
          : "bg-zinc-800/40 border-transparent hover:bg-zinc-800 hover:border-zinc-700",
      ].join(" ")}
    >
      <div className="flex items-center gap-2">
        <span className="text-zinc-600 w-5 shrink-0 text-right text-[10px]">{idx + 1}</span>
        <span
          className={[
            "inline-flex items-center justify-center w-6 h-5 rounded border text-[11px] font-bold shrink-0",
            cls,
          ].join(" ")}
        >
          {cmd.type}
        </span>
        {cmd.params.length > 0 && (
          <span className="text-zinc-400 truncate leading-relaxed">
            {cmd.params.map(fmtNum).join("  ")}
          </span>
        )}
      </div>
    </button>
  );
}
