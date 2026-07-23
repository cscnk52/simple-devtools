import { arcCenter } from "./arc";
import type { Point } from "./point";
import type { ResolvedSegment } from "./resolve";

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function boundsSize(bounds: Bounds): { width: number; height: number } {
  return { width: bounds.maxX - bounds.minX, height: bounds.maxY - bounds.minY };
}

export function boundsCenter(bounds: Bounds): Point {
  return { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 };
}

/**
 * Axis-aligned bounds covering a resolved path.
 *
 * Conservative by design: curves are bounded by their control hull and arcs by
 * their full ellipse, so the box can be larger than the ink but never smaller.
 * That is the right trade for zoom-to-fit. Returns `null` for an empty path.
 */
export function bounds(resolved: readonly ResolvedSegment[]): Bounds | null {
  if (resolved.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const include = (p: Point) => {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  };

  for (const r of resolved) {
    // a moveTo draws nothing, so where it started is not part of the path —
    // counting it would drag the origin into the box of every path
    if (r.segment.type !== "moveTo") include(r.start);
    include(r.end);
    for (const control of r.controls) include(control.point);

    if (r.segment.type !== "ellipticalArcTo") continue;

    const arc = arcCenter(
      r.start,
      r.end,
      r.segment.rx,
      r.segment.ry,
      r.segment.xAxisRotation,
      r.segment.largeArcFlag,
      r.segment.sweepFlag,
    );
    if (!arc) continue;

    // half-extents of the whole rotated ellipse
    const cos = Math.cos(arc.rotation);
    const sin = Math.sin(arc.rotation);
    const halfWidth = Math.hypot(arc.rx * cos, arc.ry * sin);
    const halfHeight = Math.hypot(arc.rx * sin, arc.ry * cos);
    include({ x: arc.center.x - halfWidth, y: arc.center.y - halfHeight });
    include({ x: arc.center.x + halfWidth, y: arc.center.y + halfHeight });
  }

  return Number.isFinite(minX) ? { minX, minY, maxX, maxY } : null;
}
