import { Circle, Line } from "react-konva";

import { SEGMENT_COLOR } from "@/components/colors";
import { type ResolvedSegment, arcCenter, flattenEllipse } from "@/utils/geometry";

interface Props {
  resolved: readonly ResolvedSegment[];
  selectedIndex: number | null;
  scale: number;
  /** flattening tolerance in user units, already divided by the stage scale */
  tolerance: number;
}

/**
 * The ellipse an arc is cut from, drawn for the selected arc only.
 *
 * Arc parameters are the hardest part of a path to read, and seeing the whole
 * ellipse makes the flags obvious — but drawing every arc's ellipse at once
 * buries the path itself. Sampled with the same flattener as the path, so the
 * guide and the arc it explains are always drawn at matching accuracy.
 */
export default function ArcGuides({ resolved, selectedIndex, scale, tolerance }: Props) {
  if (selectedIndex === null) return null;

  const target = resolved[selectedIndex];
  if (!target || target.segment.type !== "ellipticalArcTo") return null;

  const arc = arcCenter(
    target.start,
    target.end,
    target.segment.rx,
    target.segment.ry,
    target.segment.xAxisRotation,
    target.segment.largeArcFlag,
    target.segment.sweepFlag,
  );
  if (!arc) return null;

  const color = SEGMENT_COLOR.ellipticalArcTo;
  const strokeWidth = 1 / scale;

  return (
    <>
      <Line
        points={flattenEllipse(arc.center, arc.rx, arc.ry, arc.rotation, tolerance)}
        closed
        stroke={color}
        strokeWidth={strokeWidth}
        dash={[5 / scale, 4 / scale]}
        opacity={0.4}
        listening={false}
      />
      <Circle
        x={arc.center.x}
        y={arc.center.y}
        radius={2.5 / scale}
        fill={color}
        opacity={0.7}
        listening={false}
      />
    </>
  );
}
