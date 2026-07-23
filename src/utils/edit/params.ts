import type { BaseCommand } from "@/utils/parser";
import type { Segment } from "@/utils/parser";

export type SegmentType = Segment["type"];

export type ParamKey =
  | "x"
  | "y"
  | "x1"
  | "y1"
  | "x2"
  | "y2"
  | "rx"
  | "ry"
  | "xAxisRotation"
  | "largeArcFlag"
  | "sweepFlag";

/** Editable numeric fields of each segment type, in path-argument order. */
export const PARAM_KEYS: Record<SegmentType, readonly ParamKey[]> = {
  moveTo: ["x", "y"],
  lineTo: ["x", "y"],
  horizontalLineTo: ["x"],
  verticalLineTo: ["y"],
  closePath: [],
  curveTo: ["x1", "y1", "x2", "y2", "x", "y"],
  smoothCurveTo: ["x2", "y2", "x", "y"],
  quadraticCurveTo: ["x1", "y1", "x", "y"],
  smoothQuadraticCurveTo: ["x", "y"],
  ellipticalArcTo: ["rx", "ry", "xAxisRotation", "largeArcFlag", "sweepFlag", "x", "y"],
};

/** Params constrained to exactly 0 or 1. */
export const FLAG_KEYS: ReadonlySet<ParamKey> = new Set<ParamKey>(["largeArcFlag", "sweepFlag"]);

export const COMMAND_OF: Record<SegmentType, BaseCommand> = {
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

export const SEGMENT_TYPE_OF: Record<BaseCommand, SegmentType> = {
  M: "moveTo",
  L: "lineTo",
  H: "horizontalLineTo",
  V: "verticalLineTo",
  Z: "closePath",
  C: "curveTo",
  S: "smoothCurveTo",
  Q: "quadraticCurveTo",
  T: "smoothQuadraticCurveTo",
  A: "ellipticalArcTo",
};

/** The command letter as it appears in the path, respecting the segment's mode. */
export function commandLetter(segment: Segment): string {
  const base = COMMAND_OF[segment.type];
  return "mode" in segment && segment.mode === "relative" ? base.toLowerCase() : base;
}

/** Ordered `[key, value]` pairs of a segment's numeric arguments. */
export function params(segment: Segment): Array<[ParamKey, number]> {
  const record = segment as unknown as Record<ParamKey, number>;
  return PARAM_KEYS[segment.type].map((key) => [key, record[key]]);
}
