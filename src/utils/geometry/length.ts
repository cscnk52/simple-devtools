import { flattenSegment } from "./flatten";
import { distance } from "./point";
import type { ResolvedSegment } from "./resolve";

const DEFAULT_TOLERANCE = 0.01;

function polylineLength(flat: readonly number[]): number {
  let total = 0;
  for (let i = 0; i + 3 < flat.length; i += 2) {
    total += distance({ x: flat[i], y: flat[i + 1] }, { x: flat[i + 2], y: flat[i + 3] });
  }
  return total;
}

/**
 * Length of a single resolved segment.
 *
 * Lines are exact; curves and arcs are the length of their flattened polyline,
 * accurate to within roughly `tolerance` (in user units). A `moveTo` draws
 * nothing and yields 0, as does a `closePath` that is already closed.
 */
export function segmentLength(
  resolved: ResolvedSegment,
  tolerance: number = DEFAULT_TOLERANCE,
): number {
  const flat = flattenSegment(resolved, { tolerance });
  return flat === null ? 0 : polylineLength(flat);
}

/** Total length of a resolved path, summed over its segments. */
export function pathLength(
  resolved: readonly ResolvedSegment[],
  tolerance: number = DEFAULT_TOLERANCE,
): number {
  return resolved.reduce((total, segment) => total + segmentLength(segment, tolerance), 0);
}
