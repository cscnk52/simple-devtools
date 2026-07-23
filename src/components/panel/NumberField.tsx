import { InputGroup } from "@cloudflare/kumo";
import { useEffect, useRef, useState } from "react";

import { formatNumber } from "@/utils/parser";

interface Props {
  label: string;
  value: number;
  /** called on every keystroke that parses to a finite number */
  onCommit: (value: number, options: { newStep: boolean }) => void;
}

/**
 * A text field for one path argument.
 *
 * Kept uncontrolled while focused so half-typed values — "-", "1.", "1e" —
 * survive long enough to finish. The draft only re-syncs from the outside when
 * the field is not being edited, which is what lets the same field update live
 * while a handle is dragged on the canvas.
 */
export default function NumberField({ label, value, onCommit }: Props) {
  const [draft, setDraft] = useState(() => formatNumber(value));
  const focused = useRef(false);
  const firstEdit = useRef(true);

  useEffect(() => {
    if (!focused.current) setDraft(formatNumber(value));
  }, [value]);

  return (
    <InputGroup size="xs">
      <InputGroup.Label className="w-6 justify-end font-mono text-kumo-subtle">
        {label}
      </InputGroup.Label>
      <InputGroup.Input
        inputMode="decimal"
        spellCheck={false}
        aria-label={label}
        value={draft}
        className="font-mono tabular-nums"
        onFocus={() => {
          focused.current = true;
          firstEdit.current = true;
        }}
        onBlur={() => {
          focused.current = false;
          // discard a draft that never became a number
          setDraft(formatNumber(value));
        }}
        onChange={(e) => {
          setDraft(e.target.value);

          const parsed = Number(e.target.value);
          if (e.target.value.trim() === "" || !Number.isFinite(parsed)) return;

          onCommit(parsed, { newStep: firstEdit.current });
          firstEdit.current = false;
        }}
      />
    </InputGroup>
  );
}
