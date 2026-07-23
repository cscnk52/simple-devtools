import { Badge, Button, Tooltip } from "@cloudflare/kumo";
import { ArrowUUpLeftIcon, ArrowUUpRightIcon, BroomIcon } from "@phosphor-icons/react";
import { useAtomValue, useSetAtom } from "jotai";
import { useEffect } from "react";

import { clearPathAtom } from "@/state/actions";
import { canRedoAtom, canUndoAtom, redoAtom, segmentsAtom, undoAtom } from "@/state/editor";

export default function Toolbar() {
  const segments = useAtomValue(segmentsAtom);
  const canUndo = useAtomValue(canUndoAtom);
  const canRedo = useAtomValue(canRedoAtom);
  const undo = useSetAtom(undoAtom);
  const redo = useSetAtom(redoAtom);
  const clear = useSetAtom(clearPathAtom);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "z") return;

      // let the textarea and the number fields keep their own native undo
      const target = event.target as HTMLElement | null;
      if (target?.tagName === "TEXTAREA" || target?.tagName === "INPUT") return;

      event.preventDefault();
      if (event.shiftKey) redo();
      else undo();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undo, redo]);

  return (
    <div className="flex items-center gap-2 border-b border-kumo-hairline px-3 py-2">
      {/* matches the Field label the textarea above renders */}
      <span className="text-xs font-medium text-kumo-default">Commands</span>
      {segments.length > 0 && (
        <Badge variant="secondary" className="tabular-nums">
          {segments.length}
        </Badge>
      )}

      <div className="ml-auto flex items-center gap-0.5">
        <Tooltip
          content="Undo — Ctrl+Z"
          render={
            <Button
              size="sm"
              shape="square"
              variant="ghost"
              aria-label="Undo"
              icon={ArrowUUpLeftIcon}
              disabled={!canUndo}
              onClick={() => undo()}
            />
          }
        />
        <Tooltip
          content="Redo — Ctrl+Shift+Z"
          render={
            <Button
              size="sm"
              shape="square"
              variant="ghost"
              aria-label="Redo"
              icon={ArrowUUpRightIcon}
              disabled={!canRedo}
              onClick={() => redo()}
            />
          }
        />
        <Tooltip
          content="Clear the path"
          render={
            <Button
              size="sm"
              shape="square"
              variant="ghost"
              aria-label="Clear the path"
              icon={BroomIcon}
              disabled={segments.length === 0}
              onClick={() => clear()}
            />
          }
        />
      </div>
    </div>
  );
}
