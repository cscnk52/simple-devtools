import { Button, Text, Tooltip } from "@cloudflare/kumo";
import { CornersOutIcon } from "@phosphor-icons/react";
import { useAtom, useAtomValue } from "jotai";
import type Konva from "konva";
import { useCallback, useEffect, useRef, useState } from "react";
import { Group, Layer, Stage } from "react-konva";

import ArcGuides from "@/components/canvas/ArcGuides";
import Grid, { getGridStep } from "@/components/canvas/grid";
import Handles from "@/components/canvas/Handles";
import PathShape from "@/components/canvas/PathShape";
import EdgeRulers from "@/components/canvas/ruler";
import { resolvedAtom, selectedIndexAtom } from "@/state/editor";
import { bounds, boundsCenter, boundsSize } from "@/utils/geometry";

const SCALE_BY = 1.1;
/** fraction of the viewport a fitted path fills */
const FIT_MARGIN = 0.8;
/** the rulers cover this much of the top and left edges */
const RULER_SIZE = 28;
/** how far a flattened curve may sit from the true curve, in screen pixels */
const FLATNESS_PX = 0.25;

interface Transform {
  scale: number;
  x: number;
  y: number;
}

export default function Canvas() {
  const resolved = useAtomValue(resolvedAtom);
  const [selectedIndex, setSelectedIndex] = useAtom(selectedIndexAtom);

  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const panOriginRef = useRef<{ x: number; y: number } | null>(null);

  const [size, setSize] = useState({ width: 0, height: 0 });
  const [transform, setTransform] = useState<Transform>({ scale: 8, x: 120, y: 120 });

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const update = () => {
      const rect = element.getBoundingClientRect();
      setSize({ width: rect.width, height: rect.height });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  /** Centre the path in the viewport at a scale that leaves a small margin. */
  const fitToView = useCallback(() => {
    const box = bounds(resolved);
    if (!box || size.width === 0 || size.height === 0) return;

    const { width, height } = boundsSize(box);
    const usableWidth = size.width - RULER_SIZE;
    const usableHeight = size.height - RULER_SIZE;

    // a path with no extent in one axis (a straight line) must not divide by zero
    const scale = Math.min(
      width > 0 ? (usableWidth * FIT_MARGIN) / width : 1,
      height > 0 ? (usableHeight * FIT_MARGIN) / height : 1,
    );

    const center = boundsCenter(box);
    setTransform({
      scale,
      x: RULER_SIZE + usableWidth / 2 - center.x * scale,
      y: RULER_SIZE + usableHeight / 2 - center.y * scale,
    });
  }, [resolved, size.width, size.height]);

  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const pointer = stageRef.current?.getPointerPosition();
    if (!pointer) return;

    setTransform((previous) => {
      const next = e.evt.deltaY < 0 ? previous.scale * SCALE_BY : previous.scale / SCALE_BY;
      // stop only at the float limits, never at an arbitrary zoom bound
      if (!Number.isFinite(next) || next <= 0) return previous;
      // keep the point under the cursor pinned while zooming
      const worldX = (pointer.x - previous.x) / previous.scale;
      const worldY = (pointer.y - previous.y) / previous.scale;
      return { scale: next, x: pointer.x - worldX * next, y: pointer.y - worldY * next };
    });
  };

  const handlePointerDown = (e: Konva.KonvaEventObject<PointerEvent>) => {
    // only empty space pans; anything else is a shape being clicked or dragged
    if (e.target !== e.target.getStage()) return;

    const pointer = stageRef.current?.getPointerPosition();
    if (!pointer) return;

    panOriginRef.current = pointer;
    setSelectedIndex(null);
    stageRef.current?.container().style.setProperty("cursor", "grabbing");
  };

  const handlePointerMove = () => {
    const origin = panOriginRef.current;
    const pointer = stageRef.current?.getPointerPosition();
    if (!origin || !pointer) return;

    panOriginRef.current = pointer;
    setTransform((previous) => ({
      ...previous,
      x: previous.x + pointer.x - origin.x,
      y: previous.y + pointer.y - origin.y,
    }));
  };

  const endPan = () => {
    if (!panOriginRef.current) return;
    panOriginRef.current = null;
    stageRef.current?.container().style.setProperty("cursor", "default");
  };

  const { scale } = transform;
  const empty = resolved.length === 0;
  // hold the flattening error at a fraction of a screen pixel, so curves gain
  // vertices as the view zooms in rather than showing the polygon they are
  const tolerance = FLATNESS_PX / scale;

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden bg-kumo-canvas">
      <Stage
        ref={stageRef}
        width={size.width}
        height={size.height}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endPan}
        onPointerCancel={endPan}
        onPointerLeave={endPan}
      >
        <Layer>
          <Group x={transform.x} y={transform.y} scaleX={scale} scaleY={scale}>
            <Grid
              width={size.width}
              height={size.height}
              scale={scale}
              offsetX={transform.x}
              offsetY={transform.y}
            />

            <ArcGuides
              resolved={resolved}
              selectedIndex={selectedIndex}
              scale={scale}
              tolerance={tolerance}
            />

            <PathShape
              resolved={resolved}
              selectedIndex={selectedIndex}
              strokeWidth={2 / scale}
              tolerance={tolerance}
              onSelect={setSelectedIndex}
            />

            <Handles
              resolved={resolved}
              selectedIndex={selectedIndex}
              scale={scale}
              offset={{ x: transform.x, y: transform.y }}
              onSelect={setSelectedIndex}
            />
          </Group>
        </Layer>

        <Layer listening={false}>
          <EdgeRulers
            width={size.width}
            height={size.height}
            scale={scale}
            offsetX={transform.x}
            offsetY={transform.y}
            size={RULER_SIZE}
            gridStep={getGridStep(scale)}
          />
        </Layer>
      </Stage>

      <div className="absolute right-3 bottom-3 flex items-center gap-1.5 rounded-lg bg-kumo-base/80 p-1 pl-2.5 ring ring-kumo-line backdrop-blur">
        <span className="font-mono text-xs text-kumo-subtle tabular-nums">
          {Math.round(scale * 100)}%
        </span>
        <Tooltip
          content="Zoom to fit the path"
          render={
            <Button
              size="sm"
              shape="square"
              variant="ghost"
              aria-label="Zoom to fit the path"
              icon={CornersOutIcon}
              disabled={empty}
              onClick={fitToView}
            />
          }
        />
      </div>

      {empty && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Text variant="secondary" size="sm">
            Paste or build a path in the left panel
          </Text>
        </div>
      )}
    </div>
  );
}
