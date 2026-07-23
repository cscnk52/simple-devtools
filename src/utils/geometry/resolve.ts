import { match } from "ts-pattern";

import type { Segment } from "@/utils/parser";

import { type Point, reflect } from "./point";

/** Which control point of a segment a coordinate pair belongs to. */
export type ControlSlot = "c1" | "c2";

export interface ResolvedControl {
  slot: ControlSlot;
  point: Point;
  /**
   * True for the control point S and T derive by reflection. Implied points
   * have no fields in the segment, so they render but cannot be dragged.
   */
  implied: boolean;
}

export interface ResolvedSegment {
  /** index into the source `Segment[]` */
  index: number;
  segment: Segment;
  /** current point before this segment runs */
  start: Point;
  /** current point after this segment runs */
  end: Point;
  /** the point a `Z` in this subpath returns to */
  subpathStart: Point;
  /** absolute control points, in slot order */
  controls: ResolvedControl[];
}

const ORIGIN: Point = { x: 0, y: 0 };

/**
 * Walk a path and resolve every segment into absolute user-space coordinates,
 * expanding relative modes and the reflected control points of S and T.
 *
 * This is the single place relative/absolute is interpreted; everything
 * downstream (rendering, hit testing, editing) works in absolute space.
 * Pure — the input is never mutated.
 */
export function resolve(segments: readonly Segment[]): ResolvedSegment[] {
  const resolved: ResolvedSegment[] = [];

  let current: Point = ORIGIN;
  let subpathStart: Point = ORIGIN;
  /** second control point of the previous segment, when it was C or S */
  let lastCubicControl: Point | undefined;
  /** control point of the previous segment, when it was Q or T */
  let lastQuadControl: Point | undefined;

  segments.forEach((segment, index) => {
    const relative = "mode" in segment && segment.mode === "relative";
    const absolute = (x: number, y: number): Point =>
      relative ? { x: current.x + x, y: current.y + y } : { x, y };

    const step = match(segment)
      .returnType<{ end: Point; controls: ResolvedControl[]; opensSubpath?: boolean }>()
      .with({ type: "moveTo" }, (s) => ({
        end: absolute(s.x, s.y),
        controls: [],
        opensSubpath: true,
      }))
      .with({ type: "lineTo" }, (s) => ({ end: absolute(s.x, s.y), controls: [] }))
      .with({ type: "horizontalLineTo" }, (s) => ({
        end: { x: relative ? current.x + s.x : s.x, y: current.y },
        controls: [],
      }))
      .with({ type: "verticalLineTo" }, (s) => ({
        end: { x: current.x, y: relative ? current.y + s.y : s.y },
        controls: [],
      }))
      .with({ type: "closePath" }, () => ({ end: subpathStart, controls: [] }))
      .with({ type: "curveTo" }, (s) => ({
        end: absolute(s.x, s.y),
        controls: [
          { slot: "c1" as const, point: absolute(s.x1, s.y1), implied: false },
          { slot: "c2" as const, point: absolute(s.x2, s.y2), implied: false },
        ],
      }))
      .with({ type: "smoothCurveTo" }, (s) => ({
        end: absolute(s.x, s.y),
        controls: [
          {
            slot: "c1" as const,
            // reflection only applies after another cubic; otherwise the
            // control point coincides with the current point
            point: lastCubicControl ? reflect(lastCubicControl, current) : current,
            implied: true,
          },
          { slot: "c2" as const, point: absolute(s.x2, s.y2), implied: false },
        ],
      }))
      .with({ type: "quadraticCurveTo" }, (s) => ({
        end: absolute(s.x, s.y),
        controls: [{ slot: "c1" as const, point: absolute(s.x1, s.y1), implied: false }],
      }))
      .with({ type: "smoothQuadraticCurveTo" }, (s) => ({
        end: absolute(s.x, s.y),
        controls: [
          {
            slot: "c1" as const,
            point: lastQuadControl ? reflect(lastQuadControl, current) : current,
            implied: true,
          },
        ],
      }))
      .with({ type: "ellipticalArcTo" }, (s) => ({ end: absolute(s.x, s.y), controls: [] }))
      .exhaustive();

    resolved.push({
      index,
      segment,
      start: current,
      end: step.end,
      subpathStart: step.opensSubpath ? step.end : subpathStart,
      controls: step.controls,
    });

    if (step.opensSubpath) subpathStart = step.end;
    current = step.end;

    lastCubicControl =
      segment.type === "curveTo" || segment.type === "smoothCurveTo"
        ? step.controls[1].point
        : undefined;
    lastQuadControl =
      segment.type === "quadraticCurveTo" || segment.type === "smoothQuadraticCurveTo"
        ? step.controls[0].point
        : undefined;
  });

  return resolved;
}

/** Absolute point the path sits at after running every segment. */
export function endPoint(segments: readonly Segment[]): Point {
  const resolved = resolve(segments);
  return resolved.length === 0 ? ORIGIN : resolved[resolved.length - 1].end;
}
