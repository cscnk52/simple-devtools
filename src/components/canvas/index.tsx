import type Konva from "konva";
import { useEffect, useRef, useState } from "react";
import { Stage, Layer, Rect, Circle, Group } from "react-konva";

import Grid from "@/components/canvas/grid";
import EdgeRulers from "@/components/canvas/ruler";

const SCALE_BY = 1.1;

function getViewportSize() {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

export default function Canvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const isPanningRef = useRef(false);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);

  const [size, setSize] = useState(getViewportSize);
  const [transform, setTransform] = useState({
    scale: 1,
    x: 0,
    y: 0,
  });

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      const handleResize = () => setSize(getViewportSize());

      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }

    const updateSize = () => {
      const rect = container.getBoundingClientRect();

      setSize({
        width: rect.width,
        height: rect.height,
      });
    };

    updateSize();

    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(container);

    window.addEventListener("resize", updateSize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateSize);
    };
  }, []);

  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();

    const stage = stageRef.current;
    if (!stage) return;

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const { scale: oldScale, x, y } = transform;

    const mousePointTo = {
      x: (pointer.x - x) / oldScale,
      y: (pointer.y - y) / oldScale,
    };

    const newScale = e.evt.deltaY < 0 ? oldScale * SCALE_BY : oldScale / SCALE_BY;

    setTransform({
      scale: newScale,
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    });
  };

  const handlePointerDown = (e: Konva.KonvaEventObject<PointerEvent>) => {
    const stage = stageRef.current;
    if (!stage) return;

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    isPanningRef.current = true;
    lastPointerRef.current = pointer;

    stage.container().style.cursor = "grabbing";
    e.evt.preventDefault();
  };

  const handlePointerMove = () => {
    if (!isPanningRef.current) return;

    const stage = stageRef.current;
    if (!stage) return;

    const pointer = stage.getPointerPosition();
    const lastPointer = lastPointerRef.current;

    if (!pointer || !lastPointer) return;

    const dx = pointer.x - lastPointer.x;
    const dy = pointer.y - lastPointer.y;

    lastPointerRef.current = pointer;

    setTransform((prev) => ({
      ...prev,
      x: prev.x + dx,
      y: prev.y + dy,
    }));
  };

  const handlePointerUp = () => {
    isPanningRef.current = false;
    lastPointerRef.current = null;

    const stage = stageRef.current;
    if (stage) {
      stage.container().style.cursor = "default";
    }
  };

  const worldStrokeWidth =
    2 / (Number.isFinite(transform.scale) && transform.scale > 0 ? transform.scale : 1);

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background: "#09090b",
      }}
    >
      <Stage
        ref={stageRef}
        width={size.width}
        height={size.height}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <Layer>
          <Group x={transform.x} y={transform.y} scaleX={transform.scale} scaleY={transform.scale}>
            <Grid
              width={size.width}
              height={size.height}
              scale={transform.scale}
              offsetX={transform.x}
              offsetY={transform.y}
            />

            <Rect
              x={50}
              y={50}
              width={200}
              height={100}
              fill="tomato"
              stroke="#fecaca"
              strokeWidth={worldStrokeWidth}
            />
            <Circle
              x={400}
              y={200}
              radius={80}
              fill="skyblue"
              stroke="#bae6fd"
              strokeWidth={worldStrokeWidth}
            />
          </Group>
        </Layer>

        <Layer listening={false}>
          <EdgeRulers
            width={size.width}
            height={size.height}
            scale={transform.scale}
            offsetX={transform.x}
            offsetY={transform.y}
          />
        </Layer>
      </Stage>
    </div>
  );
}
