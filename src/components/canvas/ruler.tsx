import { Fragment } from "react";
import { Group, Line, Rect, Text } from "react-konva";

interface EdgeRulersProps {
  width: number;
  height: number;
  scale: number;
  offsetX: number;
  offsetY: number;
  size?: number;
  gridStep?: number;
}

interface Tick {
  value: number;
  position: number;
  major: boolean;
}

const RULER_BG = "#18181b";
const RULER_BORDER = "#3f3f46";
const MAJOR_TICK = "#a1a1aa";
const MINOR_TICK = "#52525b";
const LABEL = "#a1a1aa";
const ORIGIN = "#60a5fa";

function clamp(min: number, max: number, value: number) {
  return Math.min(Math.max(value, min), max);
}

function getNiceStep(rawStep: number) {
  if (!Number.isFinite(rawStep) || rawStep <= 0) return 1;

  const exponent = Math.floor(Math.log10(rawStep));
  const magnitude = Math.pow(10, exponent);
  const normalized = rawStep / magnitude;

  if (normalized <= 1) return magnitude;
  if (normalized <= 2) return 2 * magnitude;
  if (normalized <= 5) return 5 * magnitude;

  return 10 * magnitude;
}

function trimNumber(value: string) {
  return value.replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}

function formatValue(value: number) {
  const roundedValue = Math.abs(value) < 0.0000001 ? 0 : value;
  const abs = Math.abs(roundedValue);

  if (abs >= 1000) return Math.round(roundedValue).toString();
  if (abs >= 100) return trimNumber(roundedValue.toFixed(1));
  if (abs >= 10) return trimNumber(roundedValue.toFixed(2));

  return trimNumber(roundedValue.toFixed(3));
}

function getTicks(
  startWorld: number,
  endWorld: number,
  scale: number,
  offset: number,
  gridStep?: number,
) {
  const majorStep = gridStep ?? getNiceStep(90 / scale);
  const minorStep = majorStep / 5;
  const start = Math.floor(startWorld / minorStep) * minorStep;
  const end = Math.ceil(endWorld / minorStep) * minorStep;
  const ticks: Tick[] = [];
  const epsilon = minorStep / 1000;

  for (let value = start; value <= end + epsilon; value += minorStep) {
    const normalizedValue = Math.abs(value) < epsilon ? 0 : value;
    const majorRatio = normalizedValue / majorStep;
    const major = Math.abs(majorRatio - Math.round(majorRatio)) < 0.0001;

    ticks.push({
      value: normalizedValue,
      position: normalizedValue * scale + offset,
      major,
    });
  }

  return ticks;
}

export default function EdgeRulers({
  width,
  height,
  scale,
  offsetX,
  offsetY,
  size = 28,
  gridStep,
}: EdgeRulersProps) {
  const safeScale = Math.max(scale, 0.000001);
  const rulerStrokeWidth = clamp(0.5, 2, 1 / Math.sqrt(safeScale));
  const majorTickStrokeWidth = clamp(0.75, 2.5, rulerStrokeWidth * 1.25);
  const originStrokeWidth = clamp(1, 3, rulerStrokeWidth * 1.75);
  const topWidth = Math.max(width - size, 0);
  const leftHeight = Math.max(height - size, 0);

  const startX = (size - offsetX) / safeScale;
  const endX = (width - offsetX) / safeScale;
  const startY = (size - offsetY) / safeScale;
  const endY = (height - offsetY) / safeScale;

  const xTicks = getTicks(startX, endX, safeScale, offsetX, gridStep);
  const yTicks = getTicks(startY, endY, safeScale, offsetY, gridStep);

  const originX = offsetX;
  const originY = offsetY;
  const showOriginX = originX >= size && originX <= width;
  const showOriginY = originY >= size && originY <= height;

  return (
    <Group listening={false}>
      {/* Top ruler background */}
      <Rect x={size} y={0} width={topWidth} height={size} fill={RULER_BG} listening={false} />

      {/* Left ruler background */}
      <Rect x={0} y={size} width={size} height={leftHeight} fill={RULER_BG} listening={false} />

      {/* Corner block */}
      <Rect x={0} y={0} width={size} height={size} fill={RULER_BG} listening={false} />

      {/* Ruler borders */}
      <Line
        points={[size, size, width, size]}
        stroke={RULER_BORDER}
        strokeWidth={rulerStrokeWidth}
        listening={false}
      />
      <Line
        points={[size, size, size, height]}
        stroke={RULER_BORDER}
        strokeWidth={rulerStrokeWidth}
        listening={false}
      />
      <Line
        points={[0, size, size, size]}
        stroke={RULER_BORDER}
        strokeWidth={rulerStrokeWidth}
        listening={false}
      />
      <Line
        points={[size, 0, size, size]}
        stroke={RULER_BORDER}
        strokeWidth={rulerStrokeWidth}
        listening={false}
      />

      {/* Horizontal ruler ticks */}
      <Group clipX={size} clipY={0} clipWidth={topWidth} clipHeight={size} listening={false}>
        {xTicks.map((tick) => {
          const length = tick.major ? 12 : 6;
          const color = tick.value === 0 ? ORIGIN : tick.major ? MAJOR_TICK : MINOR_TICK;
          const tickStrokeWidth =
            tick.value === 0
              ? originStrokeWidth
              : tick.major
                ? majorTickStrokeWidth
                : rulerStrokeWidth;

          return (
            <Fragment key={`x-${tick.value}`}>
              <Line
                points={[tick.position, size, tick.position, size - length]}
                stroke={color}
                strokeWidth={tickStrokeWidth}
                listening={false}
              />

              {tick.major && (
                <Text
                  x={tick.position + 4}
                  y={4}
                  text={formatValue(tick.value)}
                  fill={tick.value === 0 ? ORIGIN : LABEL}
                  fontSize={10}
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
                  listening={false}
                />
              )}
            </Fragment>
          );
        })}

        {showOriginX && (
          <Line
            points={[originX, 0, originX, size]}
            stroke={ORIGIN}
            strokeWidth={originStrokeWidth}
            opacity={0.6}
            listening={false}
          />
        )}
      </Group>

      {/* Vertical ruler ticks */}
      <Group clipX={0} clipY={size} clipWidth={size} clipHeight={leftHeight} listening={false}>
        {yTicks.map((tick) => {
          const length = tick.major ? 12 : 6;
          const color = tick.value === 0 ? ORIGIN : tick.major ? MAJOR_TICK : MINOR_TICK;
          const tickStrokeWidth =
            tick.value === 0
              ? originStrokeWidth
              : tick.major
                ? majorTickStrokeWidth
                : rulerStrokeWidth;

          return (
            <Fragment key={`y-${tick.value}`}>
              <Line
                points={[size, tick.position, size - length, tick.position]}
                stroke={color}
                strokeWidth={tickStrokeWidth}
                listening={false}
              />

              {tick.major && (
                <Text
                  x={4}
                  y={tick.position - 4}
                  text={formatValue(tick.value)}
                  fill={tick.value === 0 ? ORIGIN : LABEL}
                  fontSize={10}
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
                  rotation={-90}
                  listening={false}
                />
              )}
            </Fragment>
          );
        })}

        {showOriginY && (
          <Line
            points={[0, originY, size, originY]}
            stroke={ORIGIN}
            strokeWidth={originStrokeWidth}
            opacity={0.6}
            listening={false}
          />
        )}
      </Group>

      {/* Corner accent */}
      <Line
        points={[8, size - 8, size - 8, 8]}
        stroke={RULER_BORDER}
        strokeWidth={rulerStrokeWidth}
        opacity={0.8}
        listening={false}
      />
    </Group>
  );
}
