import type { PathCommand } from "@/utils/path";

import CommandItem from "./CommandItem";

interface Props {
  commands: PathCommand[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export default function CommandList({ commands, selectedId, onSelect }: Props) {
  return (
    <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
      {commands.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-32 text-zinc-700 text-xs text-center px-4">
          <svg
            className="w-8 h-8 mb-2 opacity-40"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0H3"
            />
          </svg>
          Paste a path to inspect commands
        </div>
      ) : (
        commands.map((cmd, idx) => (
          <CommandItem
            key={cmd.id}
            cmd={cmd}
            idx={idx}
            selected={cmd.id === selectedId}
            onSelect={onSelect}
          />
        ))
      )}
    </div>
  );
}
