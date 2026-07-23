import { Badge, Button, Switch, Tooltip, cn } from "@cloudflare/kumo";
import { CaretDownIcon, CaretUpIcon, TrashIcon } from "@phosphor-icons/react";
import { useSetAtom } from "jotai";

import { SEGMENT_BADGE } from "@/components/colors";
import { deleteSegmentAtom, reorderSegmentAtom, setParamAtom } from "@/state/actions";
import { FLAG_KEYS, commandLetter, params } from "@/utils/edit";
import { type Segment, formatNumber } from "@/utils/parser";

import NumberField from "./NumberField";

interface Props {
  segment: Segment;
  index: number;
  total: number;
  selected: boolean;
  onSelect: (index: number | null) => void;
}

const FLAG_LABEL: Record<string, string> = {
  largeArcFlag: "large arc",
  sweepFlag: "sweep",
};

/**
 * One command in the list. Collapsed it is a summary; selected it expands into
 * the editable arguments, so the list stays scannable for long paths.
 */
export default function CommandRow({ segment, index, total, selected, onSelect }: Props) {
  const setParam = useSetAtom(setParamAtom);
  const deleteSegment = useSetAtom(deleteSegmentAtom);
  const reorder = useSetAtom(reorderSegmentAtom);

  const entries = params(segment);
  const numeric = entries.filter(([key]) => !FLAG_KEYS.has(key));
  const flags = entries.filter(([key]) => FLAG_KEYS.has(key));

  return (
    <div
      className={cn(
        "group rounded-lg ring transition-colors",
        selected ? "bg-kumo-elevated ring-kumo-line" : "ring-transparent hover:bg-kumo-tint/40",
      )}
    >
      <div className="flex items-center gap-2 py-1 pr-1 pl-2">
        <button
          type="button"
          onClick={() => onSelect(selected ? null : index)}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left"
        >
          <span className="w-5 shrink-0 text-right font-mono text-xs text-kumo-subtle tabular-nums">
            {index + 1}
          </span>
          <Badge
            variant={SEGMENT_BADGE[segment.type]}
            className="w-6 justify-center px-0 font-mono"
          >
            {commandLetter(segment)}
          </Badge>
          {!selected && entries.length > 0 && (
            <span className="truncate font-mono text-xs text-kumo-subtle tabular-nums">
              {entries.map(([, value]) => formatNumber(value)).join(" ")}
            </span>
          )}
        </button>

        <div
          className={cn(
            "flex shrink-0 items-center gap-0.5 transition-opacity",
            selected ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-within:opacity-100",
          )}
        >
          <Tooltip
            content="Move earlier"
            render={
              <Button
                size="sm"
                shape="square"
                variant="ghost"
                aria-label="Move earlier"
                icon={CaretUpIcon}
                disabled={index === 0}
                onClick={() => reorder(index, index - 1)}
              />
            }
          />
          <Tooltip
            content="Move later"
            render={
              <Button
                size="sm"
                shape="square"
                variant="ghost"
                aria-label="Move later"
                icon={CaretDownIcon}
                disabled={index === total - 1}
                onClick={() => reorder(index, index + 1)}
              />
            }
          />
          <Tooltip
            content="Delete command"
            render={
              <Button
                size="sm"
                shape="square"
                variant="ghost"
                aria-label="Delete command"
                icon={TrashIcon}
                onClick={() => deleteSegment(index)}
              />
            }
          />
        </div>
      </div>

      {selected && entries.length > 0 && (
        <div className="flex flex-col gap-2 px-2 pb-2 pl-9">
          <div className="grid grid-cols-2 gap-1.5">
            {numeric.map(([key, value]) => (
              <NumberField
                key={key}
                label={key === "xAxisRotation" ? "rot" : key}
                value={value}
                onCommit={(next, options) => setParam(index, key, next, options)}
              />
            ))}
          </div>

          {/* the arc flags are booleans; mixing them into the number grid above
              leaves it ragged, so they get their own row */}
          {flags.length > 0 && (
            <div className="flex items-center gap-4">
              {flags.map(([key, value]) => (
                <Switch
                  key={key}
                  size="sm"
                  label={FLAG_LABEL[key]}
                  checked={value === 1}
                  onCheckedChange={(checked) => setParam(index, key, checked ? 1 : 0)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
