import type Konva from "konva";
import { useEffect, useRef, useState } from "react";
import { Stage, Layer, Group } from "react-konva";

import ControlPoints from "@/components/canvas/ControlPoints";
import Grid, { getGridStep } from "@/components/canvas/grid";
import PathRenderer from "@/components/canvas/PathRenderer";
import EdgeRulers from "@/components/canvas/ruler";
import type { PathCommand } from "@/utils/path";

const SCALE_BY = 1.1;

function getViewportSize() {
  return { width: window.innerWidth, height: window.innerHeight };
}

interface Props {
  commands: PathCommand[];
  pathString: string;
}

export default function Canvas({ commands, pathString }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const isPanningRef = useRef(false);
  const lastPtrRef = useRef<{ x: number; y: number } | null>(null);

  const [size, setSize] = useState(getViewportSize);
  const [tx, setTx] = useState({ scale: 1, x: 0, y: 0 });

  /* ---- resize ---- */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      const h = () => setSize(getViewportSize());
      window.addEventListener("resize", h);
      return () => window.removeEventListener("resize", h);
    }
    const upd = () => {
      const r = el.getBoundingClientRect();
      setSize({ width: r.width, height: r.height });
    };
    upd();
    const ro = new ResizeObserver(upd);
    ro.observe(el);
    window.addEventListener("resize", upd);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", upd);
    };
  }, []);

  /* ---- zoom ---- */
  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const st = stageRef.current;
    if (!st) return;
    const ptr = st.getPointerPosition();
    if (!ptr) return;
    const { scale: os, x, y } = tx;
    const mp = { x: (ptr.x - x) / os, y: (ptr.y - y) / os };
    const ns = e.evt.deltaY < 0 ? os * SCALE_BY : os / SCALE_BY;
    setTx({ scale: ns, x: ptr.x - mp.x * ns, y: ptr.y - mp.y * ns });
  };

  /* ---- pan ---- */
  const handlePtrDown = (e: Konva.KonvaEventObject<PointerEvent>) => {
    const st = stageRef.current;
    if (!st) return;
    const ptr = st.getPointerPosition();
    if (!ptr) return;
    isPanningRef.current = true;
    lastPtrRef.current = ptr;
    st.container().style.cursor = "grabbing";
    e.evt.preventDefault();
  };
  const handlePtrMove = () => {
    if (!isPanningRef.current) return;
    const st = stageRef.current;
    if (!st) return;
    const ptr = st.getPointerPosition();
    const lp = lastPtrRef.current;
    if (!ptr || !lp) return;
    lastPtrRef.current = ptr;
    setTx((p) => ({ ...p, x: p.x + ptr.x - lp.x, y: p.y + ptr.y - lp.y }));
  };
  const handlePtrUp = () => {
    isPanningRef.current = false;
    lastPtrRef.current = null;
    const el = stageRef.current?.container();
    if (el) el.style.cursor = "default";
  };

  const s = Number.isFinite(tx.scale) && tx.scale > 0 ? tx.scale : 1;
  const gs = getGridStep(s);
  const sw = 2 / s;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden"
      style={{ background: "#09090b" }}
    >
      <Stage
        ref={stageRef}
        width={size.width}
        height={size.height}
        onWheel={handleWheel}
        onPointerDown={handlePtrDown}
        onPointerMove={handlePtrMove}
        onPointerUp={handlePtrUp}
        onPointerCancel={handlePtrUp}
        onPointerLeave={handlePtrUp}
      >
        <Layer>
          <Group x={tx.x} y={tx.y} scaleX={s} scaleY={s}>
            <Grid width={size.width} height={size.height} scale={s} offsetX={tx.x} offsetY={tx.y} />

            <PathRenderer pathString={pathString} strokeWidth={sw} />

            <ControlPoints pathString={pathString} radius={0.6 / s} strokeWidth={0.5 / s} />
          </Group>
        </Layer>

        <Layer listening={false}>
          <EdgeRulers
            width={size.width}
            height={size.height}
            scale={s}
            offsetX={tx.x}
            offsetY={tx.y}
            gridStep={gs}
          />
        </Layer>
      </Stage>

      {!pathString && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="text-zinc-700 text-center">
            <svg
              className="w-16 h-16 mx-auto mb-3 opacity-30"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1 1 .3 2.7-1.1 2.7H3.9c-1.4 0-2.1-1.7-1.1-2.7L4 15.3"
              />
            </svg>
            <p className="text-sm font-medium">Canvas ready</p>
            <p className="text-xs mt-1 text-zinc-600">Paste a path in the left panel</p>
          </div>
        </div>
      )}

      {pathString && (
        <div className="absolute bottom-3 right-3 pointer-events-none">
          <span className="text-[11px] font-mono text-zinc-500 bg-zinc-900/80 px-2 py-1 rounded-md border border-zinc-800">
            {commands.length} commands
          </span>
        </div>
      )}
    </div>
  );
}
