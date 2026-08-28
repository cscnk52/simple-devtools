import { match } from "ts-pattern";

import { arcCenter, arcPointAtAngle } from "./arc";
import type { ResolvedSegment } from "./resolve";

export interface FlattenOptions {
  /**
   * Largest allowed distance between the polyline and the true curve, in user
   * units. Pass `pixels / stageScale` to hold the error constant on screen no
   * matter how far the view is zoomed in.
   */
  tolerance?: number;
  /**
   * Subdivision cap per curve. Only reached by degenerate input — a curve with
   * enormous control points, or an absurdly small tolerance — where it trades
   * a little accuracy for a bounded amount of work.
   */
  maxDepth?: number;
  /**
   * Sampling cap for arcs and ellipses, mirroring `maxDepth` for curves. Keeps
   * deep zooms from emitting millions of arc segments.
   */
  maxSteps?: number;
}

const DEFAULT_TOLERANCE = 0.1;
const DEFAULT_MAX_DEPTH = 12;
const DEFAULT_MAX_STEPS = 2048;

/**
 * Flatness test for a cubic: the curve is within `tolerance` of its chord when
 * both control points are. Conservative — it can subdivide once more than
 * strictly necessary, never once less.
 */
function cubicIsFlat(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  toleranceSq: number,
): boolean {
  const ux = 3 * x1 - 2 * x0 - x3;
  const uy = 3 * y1 - 2 * y0 - y3;
  const vx = 3 * x2 - 2 * x3 - x0;
  const vy = 3 * y2 - 2 * y3 - y0;

  return Math.max(ux * ux, vx * vx) + Math.max(uy * uy, vy * vy) <= 16 * toleranceSq;
}

/**
 * Append a cubic to `out` as line segments, splitting in half until each piece
 * is flat. The starting point is assumed to already be in `out`.
 */
function flattenCubic(
  out: number[],
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  toleranceSq: number,
  depth: number,
): void {
  if (depth <= 0 || cubicIsFlat(x0, y0, x1, y1, x2, y2, x3, y3, toleranceSq)) {
    out.push(x3, y3);
    return;
  }

  // de Casteljau split at t = 0.5
  const x01 = (x0 + x1) / 2;
  const y01 = (y0 + y1) / 2;
  const x12 = (x1 + x2) / 2;
  const y12 = (y1 + y2) / 2;
  const x23 = (x2 + x3) / 2;
  const y23 = (y2 + y3) / 2;
  const x012 = (x01 + x12) / 2;
  const y012 = (y01 + y12) / 2;
  const x123 = (x12 + x23) / 2;
  const y123 = (y12 + y23) / 2;
  const mx = (x012 + x123) / 2;
  const my = (y012 + y123) / 2;

  flattenCubic(out, x0, y0, x01, y01, x012, y012, mx, my, toleranceSq, depth - 1);
  flattenCubic(out, mx, my, x123, y123, x23, y23, x3, y3, toleranceSq, depth - 1);
}

/**
 * A quadratic deviates from its chord by at most |2·p1 − p0 − p2| / 4, so this
 * bound is exact rather than conservative.
 */
function quadraticIsFlat(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  toleranceSq: number,
): boolean {
  const ux = 2 * x1 - x0 - x2;
  const uy = 2 * y1 - y0 - y2;

  return ux * ux + uy * uy <= 16 * toleranceSq;
}

function flattenQuadratic(
  out: number[],
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  toleranceSq: number,
  depth: number,
): void {
  if (depth <= 0 || quadraticIsFlat(x0, y0, x1, y1, x2, y2, toleranceSq)) {
    out.push(x2, y2);
    return;
  }

  const x01 = (x0 + x1) / 2;
  const y01 = (y0 + y1) / 2;
  const x12 = (x1 + x2) / 2;
  const y12 = (y1 + y2) / 2;
  const mx = (x01 + x12) / 2;
  const my = (y01 + y12) / 2;

  flattenQuadratic(out, x0, y0, x01, y01, mx, my, toleranceSq, depth - 1);
  flattenQuadratic(out, mx, my, x12, y12, x2, y2, toleranceSq, depth - 1);
}

/**
 * How wide an angular step keeps a chord within `tolerance` of the curve.
 *
 * A chord spanning angle t on a circle of radius r sits `r(1 − cos(t/2))` from
 * it at the midpoint; solving for t gives the step. For an ellipse the larger
 * radius is used, which is exact for circles and a close approximation
 * otherwise.
 */
export function arcAngleStep(radius: number, tolerance: number): number {
  if (!(radius > 0) || !(tolerance > 0)) return Math.PI / 2;
  if (tolerance >= radius) return Math.PI;

  return 2 * Math.acos(1 - tolerance / radius);
}

/**
 * Sample a segment into a flat `[x0, y0, x1, y1, …]` polyline in absolute user
 * coordinates, starting at the segment's start point.
 *
 * Curves are subdivided adaptively against `tolerance`, so the caller controls
 * the accuracy/vertex-count trade directly instead of accepting a fixed sample
 * count. Returns `null` for segments that draw nothing.
 *
 * @throws RangeError on a non-positive tolerance or maxDepth
 */
export function flattenSegment(
  resolved: ResolvedSegment,
  options: FlattenOptions = {},
): number[] | null {
  const {
    tolerance = DEFAULT_TOLERANCE,
    maxDepth = DEFAULT_MAX_DEPTH,
    maxSteps = DEFAULT_MAX_STEPS,
  } = options;

  if (!Number.isFinite(tolerance) || tolerance <= 0) {
    throw new RangeError(`tolerance must be a positive finite number, got ${tolerance}`);
  }
  if (!Number.isInteger(maxDepth) || maxDepth < 0) {
    throw new RangeError(`maxDepth must be a non-negative integer, got ${maxDepth}`);
  }
  if (!Number.isInteger(maxSteps) || maxSteps < 0) {
    throw new RangeError(`maxSteps must be a non-negative integer, got ${maxSteps}`);
  }

  const { segment, start, end, subpathStart, controls } = resolved;
  const toleranceSq = tolerance * tolerance;

  return match(segment)
    .returnType<number[] | null>()
    .with({ type: "moveTo" }, () => null)
    .with({ type: "closePath" }, () =>
      start.x === subpathStart.x && start.y === subpathStart.y
        ? null
        : [start.x, start.y, subpathStart.x, subpathStart.y],
    )
    .with({ type: "lineTo" }, { type: "horizontalLineTo" }, { type: "verticalLineTo" }, () =>
      start.x === end.x && start.y === end.y ? null : [start.x, start.y, end.x, end.y],
    )
    .with({ type: "curveTo" }, { type: "smoothCurveTo" }, () => {
      const [c1, c2] = controls;
      const out = [start.x, start.y];
      flattenCubic(
        out,
        start.x,
        start.y,
        c1.point.x,
        c1.point.y,
        c2.point.x,
        c2.point.y,
        end.x,
        end.y,
        toleranceSq,
        maxDepth,
      );
      return out;
    })
    .with({ type: "quadraticCurveTo" }, { type: "smoothQuadraticCurveTo" }, () => {
      const [c1] = controls;
      const out = [start.x, start.y];
      flattenQuadratic(
        out,
        start.x,
        start.y,
        c1.point.x,
        c1.point.y,
        end.x,
        end.y,
        toleranceSq,
        maxDepth,
      );
      return out;
    })
    .with({ type: "ellipticalArcTo" }, (s) => {
      if (start.x === end.x && start.y === end.y) return null;

      const arc = arcCenter(start, end, s.rx, s.ry, s.xAxisRotation, s.largeArcFlag, s.sweepFlag);
      // a degenerate arc is drawn as the straight line the spec calls for
      if (!arc) return [start.x, start.y, end.x, end.y];

      const step = arcAngleStep(Math.max(arc.rx, arc.ry), tolerance);
      const steps = Math.min(maxSteps, Math.max(1, Math.ceil(Math.abs(arc.deltaAngle) / step)));

      const out = [start.x, start.y];
      for (let i = 1; i <= steps; i++) {
        const point = arcPointAtAngle(arc, arc.startAngle + (arc.deltaAngle * i) / steps);
        out.push(point.x, point.y);
      }
      return out;
    })
    .exhaustive();
}

/**
 * Sample a full ellipse into a closed polyline, for drawing the guide ellipse
 * an arc is cut from.
 */
export function flattenEllipse(
  center: { x: number; y: number },
  rx: number,
  ry: number,
  rotation: number,
  tolerance: number = DEFAULT_TOLERANCE,
  maxSteps: number = DEFAULT_MAX_STEPS,
): number[] {
  const steps = Math.min(
    maxSteps,
    Math.max(8, Math.ceil((Math.PI * 2) / arcAngleStep(Math.max(rx, ry), tolerance))),
  );

  const arc = {
    center,
    rx,
    ry,
    rotation,
    startAngle: 0,
    deltaAngle: Math.PI * 2,
  };

  const out: number[] = [];
  for (let i = 0; i < steps; i++) {
    const point = arcPointAtAngle(arc, (Math.PI * 2 * i) / steps);
    out.push(point.x, point.y);
  }
  return out;
}
