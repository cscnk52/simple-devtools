import { Badge, Text, Tooltip } from "@cloudflare/kumo";
import { useAtomValue, useSetAtom } from "jotai";

import { SEGMENT_BADGE } from "@/components/colors";
import { appendCommandAtom, insertCommandAtom } from "@/state/actions";
import { selectedIndexAtom } from "@/state/editor";
import { SEGMENT_TYPE_OF } from "@/utils/edit";
import type { BaseCommand } from "@/utils/parser";

const COMMANDS: ReadonlyArray<{ command: BaseCommand; name: string }> = [
  { command: "M", name: "Move to" },
  { command: "L", name: "Line to" },
  { command: "H", name: "Horizontal line" },
  { command: "V", name: "Vertical line" },
  { command: "C", name: "Cubic curve" },
  { command: "S", name: "Smooth cubic" },
  { command: "Q", name: "Quadratic curve" },
  { command: "T", name: "Smooth quadratic" },
  { command: "A", name: "Elliptical arc" },
  { command: "Z", name: "Close path" },
];

export default function AddCommand() {
  const selectedIndex = useAtomValue(selectedIndexAtom);
  const append = useSetAtom(appendCommandAtom);
  const insert = useSetAtom(insertCommandAtom);

  return (
    <div className="flex flex-col gap-1.5 border-t border-kumo-hairline px-3 pt-2.5 pb-3">
      <Text variant="secondary" size="xs">
        {selectedIndex === null ? "Append command" : `Insert after ${selectedIndex + 1}`}
      </Text>

      <div className="flex flex-wrap gap-1">
        {COMMANDS.map(({ command, name }) => (
          <Tooltip
            key={command}
            content={name}
            render={
              <button
                type="button"
                aria-label={`Add ${name}`}
                onClick={() =>
                  selectedIndex === null ? append(command) : insert(selectedIndex, command)
                }
                className="cursor-pointer rounded-full transition-opacity hover:opacity-75"
              />
            }
          >
            <Badge
              variant={SEGMENT_BADGE[SEGMENT_TYPE_OF[command]]}
              className="w-6 justify-center px-0 font-mono"
            >
              {command}
            </Badge>
          </Tooltip>
        ))}
      </div>
    </div>
  );
}
