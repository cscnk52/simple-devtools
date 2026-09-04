import { match } from "ts-pattern";

import type { Segment } from "./parser";

const DEFAULT_PRECISION = 6;

/**
 * Render a number for use inside a path string.
 *
 * Rounds to `precision` decimals so float noise accumulated while dragging
 * never leaks into the output. Throws on non-finite input rather than
 * emitting "NaN", which would make the path unparseable.
 */
export function formatNumber(value: number, precision: number = DEFAULT_PRECISION): string {
  if (!Number.isFinite(value)) {
    throw new RangeError(`cannot serialize non-finite number: ${value}`);
  }
  if (!Number.isInteger(precision) || precision < 0 || precision > 20) {
    throw new RangeError(`precision must be an integer in [0, 20], got ${precision}`);
  }

  const rounded = Number(value.toFixed(precision));
  // toFixed can produce "-0.000000"; the sign carries no meaning in a path
  return Object.is(rounded, -0) ? "0" : String(rounded);
}

const COMMAND: Record<Segment["type"], string> = {
  moveTo: "M",
  lineTo: "L",
  horizontalLineTo: "H",
  verticalLineTo: "V",
  closePath: "Z",
  curveTo: "C",
  smoothCurveTo: "S",
  quadraticCurveTo: "Q",
  smoothQuadraticCurveTo: "T",
  ellipticalArcTo: "A",
};

/** The command letter for a segment, honouring its mode. */
function letter(segment: Segment): string {
  const base = COMMAND[segment.type];
  return "mode" in segment && segment.mode === "relative" ? base.toLowerCase() : base;
}

/**
 * Serialize only a segment's numeric arguments, space separated, without the
 * command letter. `closePath` has no arguments and yields an empty string.
 */
export function serializeArgs(segment: Segment, precision?: number): string {
  const n = (value: number) => formatNumber(value, precision);

  return match(segment)
    .returnType<string>()
    .with({ type: "closePath" }, () => "")
    .with({ type: "moveTo" }, (s) => `${n(s.x)} ${n(s.y)}`)
    .with({ type: "lineTo" }, (s) => `${n(s.x)} ${n(s.y)}`)
    .with({ type: "horizontalLineTo" }, (s) => `${n(s.x)}`)
    .with({ type: "verticalLineTo" }, (s) => `${n(s.y)}`)
    .with(
      { type: "curveTo" },
      (s) => `${n(s.x1)} ${n(s.y1)} ${n(s.x2)} ${n(s.y2)} ${n(s.x)} ${n(s.y)}`,
    )
    .with({ type: "smoothCurveTo" }, (s) => `${n(s.x2)} ${n(s.y2)} ${n(s.x)} ${n(s.y)}`)
    .with({ type: "quadraticCurveTo" }, (s) => `${n(s.x1)} ${n(s.y1)} ${n(s.x)} ${n(s.y)}`)
    .with({ type: "smoothQuadraticCurveTo" }, (s) => `${n(s.x)} ${n(s.y)}`)
    .with(
      { type: "ellipticalArcTo" },
      (s) =>
        `${n(s.rx)} ${n(s.ry)} ${n(s.xAxisRotation)} ${s.largeArcFlag} ${s.sweepFlag} ${n(s.x)} ${n(s.y)}`,
    )
    .exhaustive();
}

/** Serialize one segment. Arguments are space separated, which is always safe to re-lex. */
export function serializeSegment(segment: Segment, precision?: number): string {
  if (segment.type === "closePath") return "Z";
  return `${letter(segment)}${serializeArgs(segment, precision)}`;
}

/**
 * Serialize a whole path. The result round-trips through `parsePath`:
 * `parsePath(serializePath(s))` is deep-equal to `s` up to `precision`.
 */
export function serializePath(segments: readonly Segment[], precision?: number): string {
  return segments.map((segment) => serializeSegment(segment, precision)).join(" ");
}
