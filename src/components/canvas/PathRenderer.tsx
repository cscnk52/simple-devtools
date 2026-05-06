import { useMemo } from "react";
import { Line, Circle, Group } from "react-konva";

import { parseToSegments } from "@/utils/pathRender";

interface Props {
  pathString: string;
  strokeWidth: number;
}

const COLOR = "#e4e4e7";
const ARC_COLOR = "#3f3f46";

export default function PathRenderer({ pathString, strokeWidth }: Props) {
  const segs = useMemo(() => parseToSegments(pathString), [pathString]);

  if (!pathString) return null;

  return (
    <Group listening={false}>
      {segs.map((seg, i) => {
        if (seg.type === "A") {
          return (
            <Group key={`seg-${i}`} listening={false}>
              {/* Arc center cross */}
              <Line
                points={[seg.cx - seg.rx, seg.cy, seg.cx + seg.rx, seg.cy]}
                stroke={ARC_COLOR}
                strokeWidth={strokeWidth * 0.6}
                opacity={0.4}
                listening={false}
              />
              <Line
                points={[seg.cx, seg.cy - seg.ry, seg.cx, seg.cy + seg.ry]}
                stroke={ARC_COLOR}
                strokeWidth={strokeWidth * 0.6}
                opacity={0.4}
                listening={false}
              />
              {/* Arc center dot */}
              <Circle
                x={seg.cx}
                y={seg.cy}
                radius={strokeWidth * 2}
                fill={ARC_COLOR}
                opacity={0.5}
                listening={false}
              />
              {/* Arc path */}
              <Line
                points={seg.points}
                stroke={COLOR}
                strokeWidth={strokeWidth}
                tension={0}
                lineCap="round"
                lineJoin="round"
                listening={false}
              />
            </Group>
          );
        }
        return (
          <Line
            key={`seg-${i}`}
            points={seg.points}
            stroke={COLOR}
            strokeWidth={strokeWidth}
            tension={0}
            lineCap="round"
            lineJoin="round"
            listening={false}
          />
        );
      })}
    </Group>
  );
}
