import type { PathCommand } from "@/utils/path";

import CommandList from "./CommandList";
import Legend from "./Legend";
import PathInput from "./PathInput";

interface Props {
  commands: PathCommand[];
  pathString: string;
  onPathChange: (d: string) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export default function PathPanel({
  commands,
  pathString,
  onPathChange,
  selectedId,
  onSelect,
}: Props) {
  return (
    <aside className="flex flex-col h-full bg-zinc-900 border-r border-zinc-800 w-72 shrink-0 select-none">
      <PathInput value={pathString} onChange={onPathChange} />

      <div className="px-3 py-2 border-b border-zinc-800 flex items-center justify-between">
        <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
          Commands
        </span>
        {commands.length > 0 && (
          <span className="text-[11px] text-zinc-600 font-mono">{commands.length}</span>
        )}
      </div>

      <CommandList commands={commands} selectedId={selectedId} onSelect={onSelect} />

      {commands.length > 0 && <Legend />}
    </aside>
  );
}
