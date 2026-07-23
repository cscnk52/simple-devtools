import type { Point } from "./point";
import type { ControlSlot, ResolvedSegment } from "./resolve";

export interface AnchorHandle {
  id: string;
  kind: "anchor";
  segmentIndex: number;
  point: Point;
  /**
   * Axis the handle is free to move along. `H` and `V` only carry one
   * coordinate, so the other axis is inherited and cannot be dragged.
   */
  axis: "both" | "x" | "y";
}

export interface ControlHandle {
  id: string;
  kind: "control";
  segmentIndex: number;
  slot: ControlSlot;
  point: Point;
  /** implied handles (S/T reflections) render but are not draggable */
  implied: boolean;
}

export type Handle = AnchorHandle | ControlHandle;

/** Dashed guide from a control point to the anchor it governs. */
export interface Tether {
  id: string;
  segmentIndex: number;
  from: Point;
  to: Point;
}

function axisOf(segment: ResolvedSegment["segment"]): "both" | "x" | "y" {
  if (segment.type === "horizontalLineTo") return "x";
  if (segment.type === "verticalLineTo") return "y";
  return "both";
}

/**
 * Anchor handles, one per segment that has an editable endpoint.
 *
 * `closePath` is skipped: its endpoint is the subpath start, which belongs to
 * the opening `moveTo` and is edited there.
 */
export function anchorHandles(resolved: readonly ResolvedSegment[]): AnchorHandle[] {
  return resolved
    .filter((r) => r.segment.type !== "closePath")
    .map((r) => ({
      id: `anchor:${r.index}`,
      kind: "anchor" as const,
      segmentIndex: r.index,
      point: r.end,
      axis: axisOf(r.segment),
    }));
}

/** Control handles for every curve segment, including the implied S/T ones. */
export function controlHandles(resolved: readonly ResolvedSegment[]): ControlHandle[] {
  return resolved.flatMap((r) =>
    r.controls.map((control) => ({
      id: `control:${r.index}:${control.slot}`,
      kind: "control" as const,
      segmentIndex: r.index,
      slot: control.slot,
      point: control.point,
      implied: control.implied,
    })),
  );
}

/**
 * Guides linking control points to their anchors.
 *
 * Cubics tether c1 to the segment start and c2 to the segment end; quadratics
 * have a single control point that tethers to both.
 */
export function tethers(resolved: readonly ResolvedSegment[]): Tether[] {
  return resolved.flatMap((r) => {
    const id = (suffix: string) => `tether:${r.index}:${suffix}`;

    if (r.segment.type === "curveTo" || r.segment.type === "smoothCurveTo") {
      return [
        { id: id("c1"), segmentIndex: r.index, from: r.start, to: r.controls[0].point },
        { id: id("c2"), segmentIndex: r.index, from: r.end, to: r.controls[1].point },
      ];
    }

    if (r.segment.type === "quadraticCurveTo" || r.segment.type === "smoothQuadraticCurveTo") {
      const control = r.controls[0].point;
      return [
        { id: id("in"), segmentIndex: r.index, from: r.start, to: control },
        { id: id("out"), segmentIndex: r.index, from: r.end, to: control },
      ];
    }

    return [];
  });
}
