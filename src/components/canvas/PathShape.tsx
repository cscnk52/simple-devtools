import type Konva from "konva";
import { Fragment } from "react";
import { Line } from "react-konva";

import { SEGMENT_COLOR, SELECTION } from "@/components/colors";
import { type ResolvedSegment, flattenSegment } from "@/utils/geometry";

interface Props {
  resolved: readonly ResolvedSegment[];
  selectedIndex: number | null;
  strokeWidth: number;
  /** flattening tolerance in user units, already divided by the stage scale */
  tolerance: number;
  onSelect: (index: number) => void;
}

/**
 * Draws each segment as its own polyline.
 *
 * Geometry comes from our own adaptive flattener rather than from a path string
 * handed to Konva, so the sampling density is ours to control: `tolerance` is
 * derived from the current zoom, which keeps curves smooth when magnified
 * without wasting vertices when zoomed out. Per-segment shapes also give
 * individual hit testing and highlighting for free.
 */
export default function PathShape({
  resolved,
  selectedIndex,
  strokeWidth,
  tolerance,
  onSelect,
}: Props) {
  const hover = (cursor: string) => (e: Konva.KonvaEventObject<PointerEvent>) => {
    const container = e.target.getStage()?.container();
    if (container) container.style.cursor = cursor;
  };

  return (
    <>
      {resolved.map((segment) => {
        const points = flattenSegment(segment, { tolerance });
        if (points === null) return null;

        const selected = segment.index === selectedIndex;

        return (
          <Fragment key={segment.index}>
            {/* invisible, generously thick copy so thin segments stay clickable */}
            <Line
              points={points}
              stroke="transparent"
              strokeWidth={strokeWidth * 6}
              hitStrokeWidth={strokeWidth * 8}
              onPointerDown={() => onSelect(segment.index)}
              onPointerEnter={hover("pointer")}
              onPointerLeave={hover("default")}
            />
            <Line
              points={points}
              stroke={selected ? SELECTION : SEGMENT_COLOR[segment.segment.type]}
              strokeWidth={selected ? strokeWidth * 1.75 : strokeWidth}
              lineCap="round"
              lineJoin="round"
              listening={false}
            />
          </Fragment>
        );
      })}
    </>
  );
}
