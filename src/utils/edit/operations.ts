import { match } from "ts-pattern";

import { type ControlSlot, type Point, isFinitePoint, resolve } from "@/utils/geometry";
import type { Segment } from "@/utils/parser";

import { FLAG_KEYS, PARAM_KEYS, type ParamKey } from "./params";

const ORIGIN: Point = { x: 0, y: 0 };

function assertIndex(
  segments: readonly Segment[],
  index: number,
  upperBound = segments.length - 1,
) {
  if (!Number.isInteger(index) || index < 0 || index > upperBound) {
    throw new RangeError(`segment index ${index} is out of range [0, ${upperBound}]`);
  }
}

function assertPoint(p: Point, label: string) {
  if (!isFinitePoint(p)) {
    throw new RangeError(`${label} must be a finite point, got (${p.x}, ${p.y})`);
  }
}

/**
 * Re-anchor a segment whose start point moved by `delta` (old start minus new
 * start) so its absolute geometry is unchanged.
 *
 * Only relative segments need this — absolute coordinates are independent of
 * where the previous segment ended. Returns the segment untouched otherwise.
 */
export function shiftRelativeStart(segment: Segment, delta: Point): Segment {
  if (segment.type === "closePath" || segment.mode !== "relative") return segment;
  if (delta.x === 0 && delta.y === 0) return segment;

  return match(segment)
    .returnType<Segment>()
    .with({ type: "horizontalLineTo" }, (s) => ({ ...s, x: s.x + delta.x }))
    .with({ type: "verticalLineTo" }, (s) => ({ ...s, y: s.y + delta.y }))
    .with({ type: "curveTo" }, (s) => ({
      ...s,
      x1: s.x1 + delta.x,
      y1: s.y1 + delta.y,
      x2: s.x2 + delta.x,
      y2: s.y2 + delta.y,
      x: s.x + delta.x,
      y: s.y + delta.y,
    }))
    .with({ type: "smoothCurveTo" }, (s) => ({
      ...s,
      x2: s.x2 + delta.x,
      y2: s.y2 + delta.y,
      x: s.x + delta.x,
      y: s.y + delta.y,
    }))
    .with({ type: "quadraticCurveTo" }, (s) => ({
      ...s,
      x1: s.x1 + delta.x,
      y1: s.y1 + delta.y,
      x: s.x + delta.x,
      y: s.y + delta.y,
    }))
    .with(
      { type: "moveTo" },
      { type: "lineTo" },
      { type: "smoothQuadraticCurveTo" },
      { type: "ellipticalArcTo" },
      (s) => ({ ...s, x: s.x + delta.x, y: s.y + delta.y }),
    )
    .exhaustive();
}

function withEndpoint(segment: Segment, start: Point, to: Point): Segment {
  const relative = "mode" in segment && segment.mode === "relative";
  const x = relative ? to.x - start.x : to.x;
  const y = relative ? to.y - start.y : to.y;

  return match(segment)
    .returnType<Segment>()
    .with({ type: "closePath" }, () => {
      throw new TypeError("closePath has no editable endpoint; edit the subpath's moveTo instead");
    })
    .with({ type: "horizontalLineTo" }, (s) => ({ ...s, x }))
    .with({ type: "verticalLineTo" }, (s) => ({ ...s, y }))
    .otherwise((s) => ({ ...s, x, y }));
}

/**
 * Drag a segment's endpoint to an absolute position.
 *
 * The following segment is re-anchored when it is relative, so only the edited
 * segment changes shape and the rest of the path stays put. `H` and `V` keep
 * their inherited axis: the ignored coordinate of `to` has no effect.
 *
 * @throws RangeError on an out-of-range index or non-finite point
 * @throws TypeError when the segment is a `closePath`
 */
export function moveAnchor(segments: readonly Segment[], index: number, to: Point): Segment[] {
  assertIndex(segments, index);
  assertPoint(to, "moveAnchor target");

  const resolved = resolve(segments);
  const target = resolved[index];

  const draft = segments.slice();
  draft[index] = withEndpoint(target.segment, target.start, to);

  const follower = draft[index + 1];
  if (follower) {
    const newEnd = resolve(draft)[index].end;
    const delta = { x: target.end.x - newEnd.x, y: target.end.y - newEnd.y };
    draft[index + 1] = shiftRelativeStart(follower, delta);
  }

  return draft;
}

/**
 * Drag one of a curve's control points to an absolute position.
 *
 * Control points do not move the current point, so nothing downstream is
 * touched.
 *
 * @throws RangeError on an out-of-range index or non-finite point
 * @throws TypeError when the slot is implied (`S`/`T` reflections) or the
 *   segment has no such control point
 */
export function moveControl(
  segments: readonly Segment[],
  index: number,
  slot: ControlSlot,
  to: Point,
): Segment[] {
  assertIndex(segments, index);
  assertPoint(to, "moveControl target");

  const resolved = resolve(segments);
  const { segment, start } = resolved[index];
  const relative = "mode" in segment && segment.mode === "relative";
  const x = relative ? to.x - start.x : to.x;
  const y = relative ? to.y - start.y : to.y;

  const updated = match([segment, slot] as const)
    .returnType<Segment>()
    .with([{ type: "curveTo" }, "c1"], ([s]) => ({ ...s, x1: x, y1: y }))
    .with([{ type: "curveTo" }, "c2"], ([s]) => ({ ...s, x2: x, y2: y }))
    .with([{ type: "smoothCurveTo" }, "c2"], ([s]) => ({ ...s, x2: x, y2: y }))
    .with([{ type: "quadraticCurveTo" }, "c1"], ([s]) => ({ ...s, x1: x, y1: y }))
    .with([{ type: "smoothCurveTo" }, "c1"], () => {
      throw new TypeError("the first control point of S is implied by the previous curve");
    })
    .with([{ type: "smoothQuadraticCurveTo" }, "c1"], () => {
      throw new TypeError("the control point of T is implied by the previous curve");
    })
    .otherwise(([s]) => {
      throw new TypeError(`${s.type} has no "${slot}" control point`);
    });

  const draft = segments.slice();
  draft[index] = updated;
  return draft;
}

/**
 * Set one raw argument of a segment.
 *
 * Unlike {@link moveAnchor} this is literal: it writes exactly the field named
 * and never compensates neighbours, because the caller is typing a number into
 * the command they can see.
 *
 * @throws RangeError on a bad index, a non-finite value, or a flag outside {0,1}
 * @throws TypeError when the segment type has no such parameter
 */
export function updateParam(
  segments: readonly Segment[],
  index: number,
  key: ParamKey,
  value: number,
): Segment[] {
  assertIndex(segments, index);

  const segment = segments[index];
  if (!PARAM_KEYS[segment.type].includes(key)) {
    throw new TypeError(`${segment.type} has no parameter "${key}"`);
  }
  if (!Number.isFinite(value)) {
    throw new RangeError(`parameter "${key}" must be finite, got ${value}`);
  }
  if (FLAG_KEYS.has(key) && value !== 0 && value !== 1) {
    throw new RangeError(`arc flag "${key}" must be 0 or 1, got ${value}`);
  }

  const draft = segments.slice();
  draft[index] = { ...segment, [key]: value } as Segment;
  return draft;
}

/**
 * Insert a segment at `index`, shifting the rest right.
 *
 * The segment that was at `index` is re-anchored when relative, so inserting
 * does not drag the remainder of the path along with it.
 *
 * @throws RangeError when `index` is outside `[0, segments.length]`
 */
export function insertSegment(
  segments: readonly Segment[],
  index: number,
  segment: Segment,
): Segment[] {
  assertIndex(segments, index, segments.length);

  const draft = segments.slice();
  draft.splice(index, 0, segment);

  const follower = draft[index + 1];
  if (follower) {
    const resolved = resolve(segments);
    const oldStart = index === 0 ? ORIGIN : resolved[index - 1].end;
    const newStart = resolve(draft)[index].end;
    draft[index + 1] = shiftRelativeStart(follower, {
      x: oldStart.x - newStart.x,
      y: oldStart.y - newStart.y,
    });
  }

  return draft;
}

/**
 * Remove the segment at `index`.
 *
 * The next segment is re-anchored when relative, so deleting a command leaves
 * the rest of the path where it was.
 *
 * @throws RangeError on an out-of-range index
 */
export function removeSegment(segments: readonly Segment[], index: number): Segment[] {
  assertIndex(segments, index);

  const resolved = resolve(segments);
  const draft = segments.slice();
  draft.splice(index, 1);

  const follower = draft[index];
  if (follower) {
    const removed = resolved[index];
    draft[index] = shiftRelativeStart(follower, {
      x: removed.end.x - removed.start.x,
      y: removed.end.y - removed.start.y,
    });
  }

  return draft;
}

/**
 * Move the segment at `from` so it sits at `to`.
 *
 * A literal reorder with no re-anchoring: relative segments are defined by the
 * command before them, so reordering legitimately changes the shape.
 *
 * @throws RangeError on an out-of-range index
 */
export function moveSegment(segments: readonly Segment[], from: number, to: number): Segment[] {
  assertIndex(segments, from);
  assertIndex(segments, to);
  if (from === to) return segments.slice();

  const draft = segments.slice();
  const [moved] = draft.splice(from, 1);
  draft.splice(to, 0, moved);
  return draft;
}
