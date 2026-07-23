import { useSetAtom } from "jotai";
import type Konva from "konva";
import { useRef } from "react";
import { Circle, Line, Rect } from "react-konva";

import { ANCHOR_FILL, CONTROL_FILL, GUIDE, SEGMENT_COLOR, SELECTION } from "@/components/colors";
import { dragAnchorAtom, dragControlAtom } from "@/state/actions";
import {
  type Point,
  type ResolvedSegment,
  anchorHandles,
  controlHandles,
  tethers,
} from "@/utils/geometry";

interface Props {
  resolved: readonly ResolvedSegment[];
  selectedIndex: number | null;
  /** stage scale, used to keep handles a constant size on screen */
  scale: number;
  /** stage translation, needed to constrain a drag to one axis */
  offset: Point;
  onSelect: (index: number) => void;
}

export default function Handles({ resolved, selectedIndex, scale, offset, onSelect }: Props) {
  const dragAnchor = useSetAtom(dragAnchorAtom);
  const dragControl = useSetAtom(dragControlAtom);

  /**
   * False until a drag actually moves. The first move opens a new undo step and
   * the rest amend it, so one gesture is one undo.
   */
  const moved = useRef(false);

  const anchorRadius = 5 / scale;
  const controlRadius = 3.5 / scale;
  const guideWidth = 1 / scale;

  const beginDrag = () => {
    moved.current = false;
  };

  const cursor = (value: string) => (e: Konva.KonvaEventObject<PointerEvent>) => {
    const container = e.target.getStage()?.container();
    if (container) container.style.cursor = value;
  };

  return (
    <>
      {tethers(resolved).map((tether) => (
        <Line
          key={tether.id}
          points={[tether.from.x, tether.from.y, tether.to.x, tether.to.y]}
          stroke={GUIDE}
          strokeWidth={guideWidth}
          dash={[4 / scale, 3 / scale]}
          listening={false}
        />
      ))}

      {controlHandles(resolved).map((handle) => {
        const size = controlRadius * 2;
        const color = SEGMENT_COLOR[resolved[handle.segmentIndex].segment.type];

        return (
          <Rect
            key={handle.id}
            x={handle.point.x - controlRadius}
            y={handle.point.y - controlRadius}
            width={size}
            height={size}
            fill={handle.implied ? "transparent" : CONTROL_FILL}
            stroke={handle.segmentIndex === selectedIndex ? SELECTION : color}
            strokeWidth={guideWidth * 1.5}
            // implied handles have no fields to write to; they are shown for
            // orientation only and dragging one is a no-op
            opacity={handle.implied ? 0.45 : 1}
            listening={!handle.implied}
            draggable={!handle.implied}
            onPointerDown={() => onSelect(handle.segmentIndex)}
            onPointerEnter={cursor("grab")}
            onPointerLeave={cursor("default")}
            onDragStart={beginDrag}
            onDragMove={(e) => {
              dragControl(
                handle.segmentIndex,
                handle.slot,
                { x: e.target.x() + controlRadius, y: e.target.y() + controlRadius },
                { newStep: !moved.current },
              );
              moved.current = true;
            }}
          />
        );
      })}

      {anchorHandles(resolved).map((handle) => (
        <Circle
          key={handle.id}
          x={handle.point.x}
          y={handle.point.y}
          radius={anchorRadius}
          fill={handle.segmentIndex === selectedIndex ? SELECTION : ANCHOR_FILL}
          stroke={SEGMENT_COLOR[resolved[handle.segmentIndex].segment.type]}
          strokeWidth={guideWidth * 2}
          draggable
          onPointerDown={() => onSelect(handle.segmentIndex)}
          onPointerEnter={cursor("grab")}
          onPointerLeave={cursor("default")}
          onDragStart={beginDrag}
          // H and V carry a single coordinate; pinning the other axis keeps the
          // handle under the cursor instead of snapping back after each frame
          dragBoundFunc={
            handle.axis === "both"
              ? undefined
              : (pos) => ({
                  x: handle.axis === "y" ? handle.point.x * scale + offset.x : pos.x,
                  y: handle.axis === "x" ? handle.point.y * scale + offset.y : pos.y,
                })
          }
          onDragMove={(e) => {
            dragAnchor(
              handle.segmentIndex,
              { x: e.target.x(), y: e.target.y() },
              { newStep: !moved.current },
            );
            moved.current = true;
          }}
        />
      ))}
    </>
  );
}
