import type { Segment } from "./parser";
import { serializeArgs, serializeSegment } from "./serialize";

function modeOf(segment: Segment): "relative" | "absolute" {
  return "mode" in segment ? segment.mode : "absolute";
}

/**
 * Serialize as compactly as the SVG spec allows, merging consecutive segments
 * of the same type into one implicit command:
 *
 * `L10 20 L30 40` → `L10 20 30 40`
 *
 * Two commands never merge: `closePath` has no arguments to repeat, and a
 * repeated `moveTo` is not `moveTo` — the spec turns its extra coordinate
 * pairs into `lineTo`, so merging would silently change the path. A run also
 * stops when the mode flips between relative and absolute.
 */
export function minify(segments: readonly Segment[], precision?: number): string {
  const parts: string[] = [];
  let prev: Segment | undefined;

  for (const segment of segments) {
    const repeat =
      prev !== undefined &&
      segment.type !== "closePath" &&
      segment.type !== "moveTo" &&
      segment.type === prev.type &&
      modeOf(segment) === modeOf(prev);

    parts.push(repeat ? serializeArgs(segment, precision) : serializeSegment(segment, precision));
    prev = segment;
  }

  return parts.join(" ");
}
