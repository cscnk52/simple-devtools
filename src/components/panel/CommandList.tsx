import { Text } from "@cloudflare/kumo";
import { PathIcon } from "@phosphor-icons/react";
import { useAtom, useAtomValue } from "jotai";
import { useEffect, useRef } from "react";

import { segmentsAtom, selectedIndexAtom } from "@/state/editor";

import CommandRow from "./CommandRow";

export default function CommandList() {
  const segments = useAtomValue(segmentsAtom);
  const [selectedIndex, setSelectedIndex] = useAtom(selectedIndexAtom);

  const listRef = useRef<HTMLDivElement>(null);

  // selecting a segment on the canvas should reveal it in the list
  useEffect(() => {
    if (selectedIndex === null) return;
    listRef.current
      ?.querySelector(`[data-index="${selectedIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  if (segments.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-8 text-center">
        <PathIcon size={24} className="text-kumo-inactive" />
        <Text variant="secondary" size="sm">
          Paste a path above, or add a command below.
        </Text>
      </div>
    );
  }

  return (
    <div ref={listRef} className="flex-1 space-y-px overflow-y-auto p-1.5">
      {segments.map((segment, index) => (
        <div key={index} data-index={index}>
          <CommandRow
            segment={segment}
            index={index}
            total={segments.length}
            selected={index === selectedIndex}
            onSelect={setSelectedIndex}
          />
        </div>
      ))}
    </div>
  );
}
