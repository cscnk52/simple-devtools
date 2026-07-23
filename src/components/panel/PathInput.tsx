import { Button, Textarea, Tooltip } from "@cloudflare/kumo";
import { CopyIcon, FlaskIcon } from "@phosphor-icons/react";
import { useAtomValue, useSetAtom } from "jotai";
import { useRef } from "react";

import { parseErrorAtom, pathTextAtom, setPathTextAtom } from "@/state/editor";
import { SAMPLE_PATH } from "@/utils/samples";

export default function PathInput() {
  const pathText = useAtomValue(pathTextAtom);
  const parseError = useAtomValue(parseErrorAtom);
  const setPathText = useSetAtom(setPathTextAtom);

  /**
   * A burst of typing is one undo step. The first keystroke after focusing
   * opens it; the rest amend it.
   */
  const firstEdit = useRef(true);

  return (
    <div className="flex flex-col gap-2 border-b border-kumo-hairline p-3">
      <Textarea
        label="Path data"
        size="sm"
        rows={4}
        value={pathText}
        placeholder={'d="M12 2 C6.5 2 2 6.5 2 12…"'}
        spellCheck={false}
        variant={parseError ? "error" : "default"}
        error={parseError ?? undefined}
        className="resize-none font-mono leading-relaxed"
        onFocus={() => {
          firstEdit.current = true;
        }}
        onChange={(e) => {
          setPathText(e.target.value, { newStep: firstEdit.current });
          firstEdit.current = false;
        }}
      />

      <div className="flex items-center gap-1">
        <Tooltip
          content="Load a sample path"
          render={
            <Button
              size="xs"
              variant="ghost"
              icon={FlaskIcon}
              onClick={() => setPathText(SAMPLE_PATH)}
            />
          }
        >
          Sample
        </Tooltip>

        <Tooltip
          content="Copy the path to the clipboard"
          render={
            <Button
              size="xs"
              variant="ghost"
              icon={CopyIcon}
              disabled={pathText === ""}
              onClick={() => void navigator.clipboard?.writeText(pathText)}
            />
          }
        >
          Copy
        </Tooltip>

        <span className="ml-auto font-mono text-xs text-kumo-subtle tabular-nums">
          {pathText.length} chars
        </span>
      </div>
    </div>
  );
}
