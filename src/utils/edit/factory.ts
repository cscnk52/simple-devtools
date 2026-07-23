import { match } from "ts-pattern";

import { type Point, endPoint, isFinitePoint } from "@/utils/geometry";
import type { BaseCommand, Mode, Segment } from "@/utils/parser";

import { insertSegment } from "./operations";

export interface CreateOptions {
  /** current point the new segment starts from; defaults to the origin */
  start?: Point;
  /** defaults to absolute */
  mode?: Mode;
  /** how far the generated segment reaches, in user units; defaults to 10 */
  step?: number;
}

const ORIGIN: Point = { x: 0, y: 0 };

/**
 * Build a segment with sensible placeholder geometry, laid out to the right of
 * `start` so a freshly added command is visible instead of degenerate.
 *
 * @throws RangeError on a non-finite start point or a non-positive step
 */
export function createSegment(command: BaseCommand, options: CreateOptions = {}): Segment {
  const { start = ORIGIN, mode = "absolute", step = 10 } = options;

  if (!isFinitePoint(start)) {
    throw new RangeError(`start must be a finite point, got (${start.x}, ${start.y})`);
  }
  if (!Number.isFinite(step) || step <= 0) {
    throw new RangeError(`step must be a positive finite number, got ${step}`);
  }

  const relative = mode === "relative";
  const dx = (offset: number) => (relative ? offset : start.x + offset);
  const dy = (offset: number) => (relative ? offset : start.y + offset);

  return match(command)
    .returnType<Segment>()
    .with("M", () => ({ type: "moveTo", mode, x: dx(step), y: dy(step) }))
    .with("L", () => ({ type: "lineTo", mode, x: dx(step), y: dy(0) }))
    .with("H", () => ({ type: "horizontalLineTo", mode, x: dx(step) }))
    .with("V", () => ({ type: "verticalLineTo", mode, y: dy(step) }))
    .with("Z", () => ({ type: "closePath" }))
    .with("C", () => ({
      type: "curveTo",
      mode,
      x1: dx(step / 3),
      y1: dy(-step / 2),
      x2: dx((step * 2) / 3),
      y2: dy(step / 2),
      x: dx(step),
      y: dy(0),
    }))
    .with("S", () => ({
      type: "smoothCurveTo",
      mode,
      x2: dx((step * 2) / 3),
      y2: dy(step / 2),
      x: dx(step),
      y: dy(0),
    }))
    .with("Q", () => ({
      type: "quadraticCurveTo",
      mode,
      x1: dx(step / 2),
      y1: dy(-step / 2),
      x: dx(step),
      y: dy(0),
    }))
    .with("T", () => ({ type: "smoothQuadraticCurveTo", mode, x: dx(step), y: dy(0) }))
    .with("A", () => ({
      type: "ellipticalArcTo",
      mode,
      rx: step / 2,
      ry: step / 2,
      xAxisRotation: 0,
      largeArcFlag: 0,
      sweepFlag: 1,
      x: dx(step),
      y: dy(0),
    }))
    .exhaustive();
}

/**
 * Append a command to the end of the path, starting from wherever the path
 * currently ends.
 */
export function appendCommand(
  segments: readonly Segment[],
  command: BaseCommand,
  options: Omit<CreateOptions, "start"> = {},
): Segment[] {
  const segment = createSegment(command, { ...options, start: endPoint(segments) });
  return insertSegment(segments, segments.length, segment);
}
