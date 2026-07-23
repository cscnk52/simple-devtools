import { describe, expect, it } from "vitest";

import { resolve } from "@/utils/geometry";
import { type Segment, parsePath, serializePath } from "@/utils/parser";

import {
  insertSegment,
  moveAnchor,
  moveControl,
  moveSegment,
  removeSegment,
  shiftRelativeStart,
  updateParam,
} from "./operations";

/** Absolute endpoints of every segment, for asserting geometry is preserved. */
function endpoints(segments: readonly Segment[]) {
  return resolve(segments).map((r) => r.end);
}

function snapshot(segments: readonly Segment[]) {
  return structuredClone(segments) as Segment[];
}

describe("shiftRelativeStart", () => {
  it("returns an absolute segment unchanged", () => {
    const [segment] = parsePath("L10 20");
    expect(shiftRelativeStart(segment, { x: 5, y: 5 })).toBe(segment);
  });

  it("returns a closePath unchanged", () => {
    const segment = parsePath("M0 0 Z")[1];
    expect(shiftRelativeStart(segment, { x: 5, y: 5 })).toBe(segment);
  });

  it("returns the same reference for a zero delta", () => {
    const [segment] = parsePath("l10 20");
    expect(shiftRelativeStart(segment, { x: 0, y: 0 })).toBe(segment);
  });

  it("shifts a relative moveTo", () => {
    const [segment] = parsePath("m1 2");
    expect(shiftRelativeStart(segment, { x: 10, y: 20 })).toEqual({
      type: "moveTo",
      mode: "relative",
      x: 11,
      y: 22,
    });
  });

  it("shifts a relative lineTo", () => {
    const [segment] = parsePath("l1 2");
    expect(shiftRelativeStart(segment, { x: 10, y: 20 })).toEqual({
      type: "lineTo",
      mode: "relative",
      x: 11,
      y: 22,
    });
  });

  it("shifts only x of a relative horizontalLineTo", () => {
    const [segment] = parsePath("h1");
    expect(shiftRelativeStart(segment, { x: 10, y: 20 })).toEqual({
      type: "horizontalLineTo",
      mode: "relative",
      x: 11,
    });
  });

  it("shifts only y of a relative verticalLineTo", () => {
    const [segment] = parsePath("v2");
    expect(shiftRelativeStart(segment, { x: 10, y: 20 })).toEqual({
      type: "verticalLineTo",
      mode: "relative",
      y: 22,
    });
  });

  it("shifts every pair of a relative curveTo", () => {
    const [segment] = parsePath("c1 2 3 4 5 6");
    expect(shiftRelativeStart(segment, { x: 10, y: 20 })).toEqual({
      type: "curveTo",
      mode: "relative",
      x1: 11,
      y1: 22,
      x2: 13,
      y2: 24,
      x: 15,
      y: 26,
    });
  });

  it("shifts every pair of a relative smoothCurveTo", () => {
    const [segment] = parsePath("s3 4 5 6");
    expect(shiftRelativeStart(segment, { x: 10, y: 20 })).toEqual({
      type: "smoothCurveTo",
      mode: "relative",
      x2: 13,
      y2: 24,
      x: 15,
      y: 26,
    });
  });

  it("shifts every pair of a relative quadraticCurveTo", () => {
    const [segment] = parsePath("q1 2 5 6");
    expect(shiftRelativeStart(segment, { x: 10, y: 20 })).toEqual({
      type: "quadraticCurveTo",
      mode: "relative",
      x1: 11,
      y1: 22,
      x: 15,
      y: 26,
    });
  });

  it("shifts a relative smoothQuadraticCurveTo", () => {
    const [segment] = parsePath("t5 6");
    expect(shiftRelativeStart(segment, { x: 10, y: 20 })).toEqual({
      type: "smoothQuadraticCurveTo",
      mode: "relative",
      x: 15,
      y: 26,
    });
  });

  it("shifts only the endpoint of a relative ellipticalArcTo", () => {
    const [segment] = parsePath("a5 6 7 1 0 10 20");
    expect(shiftRelativeStart(segment, { x: 1, y: 2 })).toEqual({
      type: "ellipticalArcTo",
      mode: "relative",
      rx: 5,
      ry: 6,
      xAxisRotation: 7,
      largeArcFlag: 1,
      sweepFlag: 0,
      x: 11,
      y: 22,
    });
  });

  it("does not mutate the input segment", () => {
    const [segment] = parsePath("c1 2 3 4 5 6");
    const before = snapshot([segment]);
    shiftRelativeStart(segment, { x: 10, y: 20 });
    expect([segment]).toEqual(before);
  });
});

describe("moveAnchor", () => {
  it("writes literal coordinates into an absolute segment", () => {
    const segments = parsePath("M0 0 L10 10");
    expect(serializePath(moveAnchor(segments, 1, { x: 30, y: 40 }))).toBe("M0 0 L30 40");
  });

  it("writes coordinates relative to the segment start into a relative segment", () => {
    const segments = parsePath("M10 10 l5 5");
    expect(serializePath(moveAnchor(segments, 1, { x: 30, y: 40 }))).toBe("M10 10 l20 30");
  });

  it("ignores the y of the target for a horizontalLineTo", () => {
    const segments = parsePath("M0 0 H10");
    expect(serializePath(moveAnchor(segments, 1, { x: 30, y: 999 }))).toBe("M0 0 H30");
  });

  it("ignores the x of the target for a verticalLineTo", () => {
    const segments = parsePath("M0 0 V10");
    expect(serializePath(moveAnchor(segments, 1, { x: 999, y: 50 }))).toBe("M0 0 V50");
  });

  it("re-anchors a following relative segment so the rest of the path stays put", () => {
    const segments = parsePath("M0 0 L10 10 l5 0 l0 5 L40 40");
    const before = endpoints(segments);

    const after = endpoints(moveAnchor(segments, 1, { x: 20, y: 30 }));

    expect(after[1]).toEqual({ x: 20, y: 30 });
    expect(after.slice(2)).toEqual(before.slice(2));
  });

  it("re-anchors a following relative segment after a horizontalLineTo edit", () => {
    const segments = parsePath("M0 0 H10 l5 5");
    const result = moveAnchor(segments, 1, { x: 30, y: 0 });

    expect(serializePath(result)).toBe("M0 0 H30 l-15 5");
    expect(endpoints(result)[2]).toEqual(endpoints(segments)[2]);
  });

  it("leaves a following absolute segment untouched", () => {
    const segments = parsePath("M0 0 L10 10 L20 20");
    expect(serializePath(moveAnchor(segments, 1, { x: 5, y: 5 }))).toBe("M0 0 L5 5 L20 20");
  });

  it("throws TypeError on a closePath", () => {
    const segments = parsePath("M0 0 L10 10 Z");
    expect(() => moveAnchor(segments, 2, { x: 1, y: 1 })).toThrow(TypeError);
  });

  it("throws RangeError on an out-of-range index", () => {
    const segments = parsePath("M0 0 L10 10");
    expect(() => moveAnchor(segments, 2, { x: 1, y: 1 })).toThrow(RangeError);
    expect(() => moveAnchor(segments, -1, { x: 1, y: 1 })).toThrow(RangeError);
    expect(() => moveAnchor(segments, 1.5, { x: 1, y: 1 })).toThrow(RangeError);
  });

  it("throws RangeError on a non-finite coordinate", () => {
    const segments = parsePath("M0 0 L10 10");
    expect(() => moveAnchor(segments, 1, { x: Number.NaN, y: 1 })).toThrow(RangeError);
    expect(() => moveAnchor(segments, 1, { x: 1, y: Number.POSITIVE_INFINITY })).toThrow(
      RangeError,
    );
  });

  it("does not mutate the input", () => {
    const segments = parsePath("M0 0 L10 10 l5 5");
    const before = snapshot(segments);
    moveAnchor(segments, 1, { x: 30, y: 40 });
    expect(segments).toEqual(before);
  });
});

describe("moveControl", () => {
  it("moves c1 of an absolute curveTo", () => {
    const segments = parsePath("M0 0 C1 2 3 4 5 6");
    expect(serializePath(moveControl(segments, 1, "c1", { x: 9, y: 9 }))).toBe("M0 0 C9 9 3 4 5 6");
  });

  it("moves c2 of an absolute curveTo", () => {
    const segments = parsePath("M0 0 C1 2 3 4 5 6");
    expect(serializePath(moveControl(segments, 1, "c2", { x: 9, y: 9 }))).toBe("M0 0 C1 2 9 9 5 6");
  });

  it("converts the target to segment-relative coordinates for a relative curveTo", () => {
    const segments = parsePath("M10 10 c1 2 3 4 5 6");
    expect(serializePath(moveControl(segments, 1, "c2", { x: 20, y: 20 }))).toBe(
      "M10 10 c1 2 10 10 5 6",
    );
  });

  it("moves c2 of a smoothCurveTo", () => {
    const segments = parsePath("M0 0 C0 0 1 1 2 2 S3 3 4 4");
    expect(serializePath(moveControl(segments, 2, "c2", { x: 8, y: 9 }))).toBe(
      "M0 0 C0 0 1 1 2 2 S8 9 4 4",
    );
  });

  it("moves c1 of a quadraticCurveTo", () => {
    const segments = parsePath("M0 0 Q1 2 3 4");
    expect(serializePath(moveControl(segments, 1, "c1", { x: 7, y: 8 }))).toBe("M0 0 Q7 8 3 4");
  });

  it("leaves the rest of the path untouched", () => {
    const segments = parsePath("M0 0 C1 2 3 4 5 6 l1 1");
    expect(serializePath(moveControl(segments, 1, "c1", { x: 9, y: 9 }))).toBe(
      "M0 0 C9 9 3 4 5 6 l1 1",
    );
  });

  it("throws TypeError for the implied first control point of S", () => {
    const segments = parsePath("M0 0 S3 3 4 4");
    expect(() => moveControl(segments, 1, "c1", { x: 1, y: 1 })).toThrow(TypeError);
  });

  it("throws TypeError for the implied control point of T", () => {
    const segments = parsePath("M0 0 T4 4");
    expect(() => moveControl(segments, 1, "c1", { x: 1, y: 1 })).toThrow(TypeError);
  });

  it("throws TypeError when the segment has no such control point", () => {
    const segments = parsePath("M0 0 L10 10 Q1 2 3 4 A5 5 0 0 1 6 6");
    expect(() => moveControl(segments, 1, "c1", { x: 1, y: 1 })).toThrow(TypeError);
    expect(() => moveControl(segments, 2, "c2", { x: 1, y: 1 })).toThrow(TypeError);
    expect(() => moveControl(segments, 3, "c1", { x: 1, y: 1 })).toThrow(TypeError);
  });

  it("throws RangeError on an out-of-range index", () => {
    const segments = parsePath("M0 0 C1 2 3 4 5 6");
    expect(() => moveControl(segments, 5, "c1", { x: 1, y: 1 })).toThrow(RangeError);
    expect(() => moveControl(segments, -1, "c1", { x: 1, y: 1 })).toThrow(RangeError);
  });

  it("throws RangeError on a non-finite point", () => {
    const segments = parsePath("M0 0 C1 2 3 4 5 6");
    expect(() => moveControl(segments, 1, "c1", { x: Number.NaN, y: 1 })).toThrow(RangeError);
  });

  it("does not mutate the input", () => {
    const segments = parsePath("M0 0 C1 2 3 4 5 6");
    const before = snapshot(segments);
    moveControl(segments, 1, "c1", { x: 9, y: 9 });
    expect(segments).toEqual(before);
  });
});

describe("updateParam", () => {
  it("writes the named field literally", () => {
    const segments = parsePath("M0 0 C1 2 3 4 5 6");
    expect(serializePath(updateParam(segments, 1, "y2", 99))).toBe("M0 0 C1 2 3 99 5 6");
  });

  it("writes an arc flag", () => {
    const segments = parsePath("M0 0 A5 6 7 0 0 10 20");
    expect(serializePath(updateParam(segments, 1, "sweepFlag", 1))).toBe("M0 0 A5 6 7 0 1 10 20");
  });

  it("does not compensate the following relative segment", () => {
    const segments = parsePath("M0 0 L10 10 l5 5");
    expect(serializePath(updateParam(segments, 1, "x", 50))).toBe("M0 0 L50 10 l5 5");
  });

  it("throws TypeError for a parameter the segment type does not have", () => {
    const segments = parsePath("M0 0 L10 10 H5 Z");
    expect(() => updateParam(segments, 1, "x1", 1)).toThrow(TypeError);
    expect(() => updateParam(segments, 2, "y", 1)).toThrow(TypeError);
    expect(() => updateParam(segments, 3, "x", 1)).toThrow(TypeError);
  });

  it("throws RangeError on a non-finite value", () => {
    const segments = parsePath("M0 0 L10 10");
    expect(() => updateParam(segments, 1, "x", Number.NaN)).toThrow(RangeError);
    expect(() => updateParam(segments, 1, "y", Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });

  it("throws RangeError for an arc flag outside {0, 1}", () => {
    const segments = parsePath("M0 0 A5 6 7 0 0 10 20");
    expect(() => updateParam(segments, 1, "largeArcFlag", 2)).toThrow(RangeError);
    expect(() => updateParam(segments, 1, "sweepFlag", 0.5)).toThrow(RangeError);
  });

  it("throws RangeError on an out-of-range index", () => {
    const segments = parsePath("M0 0 L10 10");
    expect(() => updateParam(segments, 2, "x", 1)).toThrow(RangeError);
    expect(() => updateParam(segments, -1, "x", 1)).toThrow(RangeError);
  });

  it("does not mutate the input", () => {
    const segments = parsePath("M0 0 L10 10");
    const before = snapshot(segments);
    updateParam(segments, 1, "x", 50);
    expect(segments).toEqual(before);
  });
});

describe("insertSegment", () => {
  it("inserts at the given index", () => {
    const segments = parsePath("M0 0 L10 10");
    const [inserted] = parsePath("L5 5");
    expect(serializePath(insertSegment(segments, 1, inserted))).toBe("M0 0 L5 5 L10 10");
  });

  it("accepts an index equal to segments.length", () => {
    const segments = parsePath("M0 0 L10 10");
    const [inserted] = parsePath("L5 5");
    expect(serializePath(insertSegment(segments, 2, inserted))).toBe("M0 0 L10 10 L5 5");
  });

  it("throws RangeError beyond segments.length", () => {
    const segments = parsePath("M0 0 L10 10");
    const [inserted] = parsePath("L5 5");
    expect(() => insertSegment(segments, 3, inserted)).toThrow(RangeError);
    expect(() => insertSegment(segments, -1, inserted)).toThrow(RangeError);
  });

  it("re-anchors the following relative segment so the tail stays put", () => {
    const segments = parsePath("M0 0 l10 10");
    const [inserted] = parsePath("L5 5");
    const result = insertSegment(segments, 1, inserted);

    expect(serializePath(result)).toBe("M0 0 L5 5 l5 5");
    expect(endpoints(result).at(-1)).toEqual(endpoints(segments).at(-1));
  });

  it("re-anchors relative to the origin when inserting at index 0", () => {
    const segments = parsePath("m10 10 l5 5");
    const [inserted] = parsePath("L20 20");
    const result = insertSegment(segments, 0, inserted);

    expect(serializePath(result)).toBe("L20 20 m-10 -10 l5 5");
    expect(endpoints(result).slice(1)).toEqual(endpoints(segments));
  });

  it("leaves a following absolute segment untouched", () => {
    const segments = parsePath("M0 0 L10 10");
    const [inserted] = parsePath("L5 5");
    const result = insertSegment(segments, 1, inserted);
    expect(serializePath(result)).toBe("M0 0 L5 5 L10 10");
  });

  it("does not mutate the input", () => {
    const segments = parsePath("M0 0 l10 10");
    const before = snapshot(segments);
    insertSegment(segments, 1, parsePath("L5 5")[0]);
    expect(segments).toEqual(before);
  });
});

describe("removeSegment", () => {
  it("removes the segment at the given index", () => {
    const segments = parsePath("M0 0 L10 10 L20 20");
    expect(serializePath(removeSegment(segments, 1))).toBe("M0 0 L20 20");
  });

  it("throws RangeError for an index equal to segments.length", () => {
    const segments = parsePath("M0 0 L10 10");
    expect(() => removeSegment(segments, 2)).toThrow(RangeError);
    expect(() => removeSegment(segments, -1)).toThrow(RangeError);
  });

  it("re-anchors the following relative segment so the tail stays put", () => {
    const segments = parsePath("M0 0 L10 10 l5 5");
    const result = removeSegment(segments, 1);

    expect(serializePath(result)).toBe("M0 0 l15 15");
    expect(endpoints(result).at(-1)).toEqual(endpoints(segments).at(-1));
  });

  it("leaves a following absolute segment untouched", () => {
    const segments = parsePath("M0 0 L10 10 L20 20");
    const result = removeSegment(segments, 1);
    expect(serializePath(result)).toBe("M0 0 L20 20");
    expect(endpoints(result).at(-1)).toEqual(endpoints(segments).at(-1));
  });

  it("removes the last segment without a follower", () => {
    const segments = parsePath("M0 0 L10 10");
    expect(serializePath(removeSegment(segments, 1))).toBe("M0 0");
  });

  it("does not mutate the input", () => {
    const segments = parsePath("M0 0 L10 10 l5 5");
    const before = snapshot(segments);
    removeSegment(segments, 1);
    expect(segments).toEqual(before);
  });
});

describe("moveSegment", () => {
  it("reorders literally, without re-anchoring", () => {
    const segments = parsePath("M0 0 l10 0 l0 10");
    expect(serializePath(moveSegment(segments, 1, 2))).toBe("M0 0 l0 10 l10 0");
  });

  it("moves a segment backwards", () => {
    const segments = parsePath("M0 0 L10 10 L20 20");
    expect(serializePath(moveSegment(segments, 2, 1))).toBe("M0 0 L20 20 L10 10");
  });

  it("returns a copy when from equals to", () => {
    const segments = parsePath("M0 0 L10 10");
    const result = moveSegment(segments, 1, 1);
    expect(result).not.toBe(segments);
    expect(result).toEqual(segments);
  });

  it("throws RangeError on an out-of-range index", () => {
    const segments = parsePath("M0 0 L10 10");
    expect(() => moveSegment(segments, 2, 0)).toThrow(RangeError);
    expect(() => moveSegment(segments, 0, 2)).toThrow(RangeError);
    expect(() => moveSegment(segments, -1, 0)).toThrow(RangeError);
  });

  it("does not mutate the input", () => {
    const segments = parsePath("M0 0 l10 0 l0 10");
    const before = snapshot(segments);
    moveSegment(segments, 1, 2);
    expect(segments).toEqual(before);
  });
});
