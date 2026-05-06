import React from "react";
import { Group, Line } from "react-konva";

export function getGridStep(scale: number): number {
  const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
  const targetPx = 50;
  const rawStep = targetPx / safeScale;

  if (rawStep <= 0) return 1;

  const exponent = Math.floor(Math.log10(rawStep));
  const magnitude = Math.pow(10, exponent);
  const normalized = rawStep / magnitude;

  let niceStep: number;
  if (normalized <= 1) niceStep = 1;
  else if (normalized <= 2) niceStep = 2;
  else if (normalized <= 5) niceStep = 5;
  else niceStep = 10;

  return niceStep * magnitude;
}

interface GridLayerProps {
  width: number;
  height: number;
  scale: number;
  offsetX?: number;
  offsetY?: number;
}

export default function GridLayer({
  width,
  height,
  scale,
  offsetX = 0,
  offsetY = 0,
}: GridLayerProps) {
  const lines: React.ReactNode[] = [];

  // Adjust world-space spacing so screen-space spacing stays reasonable.
  const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
  const step = getGridStep(scale);

  const left = -offsetX / safeScale;
  const top = -offsetY / safeScale;
  const right = left + width / safeScale;
  const bottom = top + height / safeScale;

  const startX = Math.floor(left / step) * step;
  const endX = Math.ceil(right / step) * step;
  const startY = Math.floor(top / step) * step;
  const endY = Math.ceil(bottom / step) * step;

  const strokeWidth = 1 / safeScale;
  const majorStrokeWidth = 2 / safeScale;
  const originStrokeWidth = 3 / safeScale;

  const isOriginLine = (value: number) => Math.abs(value) < step / 1000;

  const isMajorLine = (value: number) => {
    const ratio = value / step;
    return Math.abs(ratio - Math.round(ratio)) < 0.0001 && Math.round(ratio) % 5 === 0;
  };

  for (let x = startX; x <= endX; x += step) {
    const origin = isOriginLine(x);
    const major = isMajorLine(x);

    lines.push(
      <Line
        key={`v-${x}`}
        points={[x, top, x, bottom]}
        stroke={origin ? "#a1a1aa" : major ? "#71717a" : "#3f3f46"}
        strokeWidth={origin ? originStrokeWidth : major ? majorStrokeWidth : strokeWidth}
        listening={false}
      />,
    );
  }

  for (let y = startY; y <= endY; y += step) {
    const origin = isOriginLine(y);
    const major = isMajorLine(y);

    lines.push(
      <Line
        key={`h-${y}`}
        points={[left, y, right, y]}
        stroke={origin ? "#a1a1aa" : major ? "#71717a" : "#3f3f46"}
        strokeWidth={origin ? originStrokeWidth : major ? majorStrokeWidth : strokeWidth}
        listening={false}
      />,
    );
  }

  return <Group>{lines}</Group>;
}
