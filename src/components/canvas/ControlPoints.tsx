import { useMemo } from "react";
import { Circle, Line } from "react-konva";

import { getControlOverlay } from "@/utils/path";

interface Props {
  pathString: string;
  radius: number;
  strokeWidth: number;
}

export default function ControlPoints({ pathString, radius, strokeWidth }: Props) {
  const overlay = useMemo(() => getControlOverlay(pathString), [pathString]);

  if (!pathString) return null;

  return (
    <>
      {overlay.lines.map((l, i) => (
        <Line
          key={`cp-ln-${i}`}
          points={[l.x1, l.y1, l.x2, l.y2]}
          stroke="#52525b"
          strokeWidth={strokeWidth}
          dash={[4, 3]}
          listening={false}
        />
      ))}
      {overlay.points.map((p, i) => (
        <Circle
          key={`cp-pt-${i}`}
          x={p.x}
          y={p.y}
          radius={radius}
          fill="#3f3f46"
          stroke="#52525b"
          strokeWidth={strokeWidth}
          listening={false}
        />
      ))}
    </>
  );
}
