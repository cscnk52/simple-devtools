import { describe, expect, it } from "vitest";

import { endPoint } from "@/utils/geometry";
import { parsePath, serializePath } from "@/utils/parser";

import { appendCommand, createSegment } from "./factory";

const START = { x: 100, y: 200 };

describe("createSegment", () => {
  describe("absolute mode", () => {
    it("builds an M offset from the start point", () => {
      expect(createSegment("M", { start: START })).toEqual({
        type: "moveTo",
        mode: "absolute",
        x: 110,
        y: 210,
      });
    });

    it("builds an L reaching to the right of the start point", () => {
      expect(createSegment("L", { start: START })).toEqual({
        type: "lineTo",
        mode: "absolute",
        x: 110,
        y: 200,
      });
    });

    it("builds an H", () => {
      expect(createSegment("H", { start: START })).toEqual({
        type: "horizontalLineTo",
        mode: "absolute",
        x: 110,
      });
    });

    it("builds a V", () => {
      expect(createSegment("V", { start: START })).toEqual({
        type: "verticalLineTo",
        mode: "absolute",
        y: 210,
      });
    });

    it("builds a Z with no coordinates or mode", () => {
      expect(createSegment("Z", { start: START })).toEqual({ type: "closePath" });
    });

    it("builds a C", () => {
      expect(createSegment("C", { start: START })).toEqual({
        type: "curveTo",
        mode: "absolute",
        x1: 100 + 10 / 3,
        y1: 195,
        x2: 100 + 20 / 3,
        y2: 205,
        x: 110,
        y: 200,
      });
    });

    it("builds an S", () => {
      expect(createSegment("S", { start: START })).toEqual({
        type: "smoothCurveTo",
        mode: "absolute",
        x2: 100 + 20 / 3,
        y2: 205,
        x: 110,
        y: 200,
      });
    });

    it("builds a Q", () => {
      expect(createSegment("Q", { start: START })).toEqual({
        type: "quadraticCurveTo",
        mode: "absolute",
        x1: 105,
        y1: 195,
        x: 110,
        y: 200,
      });
    });

    it("builds a T", () => {
      expect(createSegment("T", { start: START })).toEqual({
        type: "smoothQuadraticCurveTo",
        mode: "absolute",
        x: 110,
        y: 200,
      });
    });

    it("builds an A with half-step radii and a sweep", () => {
      expect(createSegment("A", { start: START })).toEqual({
        type: "ellipticalArcTo",
        mode: "absolute",
        rx: 5,
        ry: 5,
        xAxisRotation: 0,
        largeArcFlag: 0,
        sweepFlag: 1,
        x: 110,
        y: 200,
      });
    });
  });

  describe("relative mode", () => {
    it("builds an M from the raw offsets", () => {
      expect(createSegment("M", { start: START, mode: "relative" })).toEqual({
        type: "moveTo",
        mode: "relative",
        x: 10,
        y: 10,
      });
    });

    it("builds an L from the raw offsets", () => {
      expect(createSegment("L", { start: START, mode: "relative" })).toEqual({
        type: "lineTo",
        mode: "relative",
        x: 10,
        y: 0,
      });
    });

    it("builds an H from the raw offset", () => {
      expect(createSegment("H", { start: START, mode: "relative" })).toEqual({
        type: "horizontalLineTo",
        mode: "relative",
        x: 10,
      });
    });

    it("builds a V from the raw offset", () => {
      expect(createSegment("V", { start: START, mode: "relative" })).toEqual({
        type: "verticalLineTo",
        mode: "relative",
        y: 10,
      });
    });

    it("builds a Z identical to the absolute one", () => {
      expect(createSegment("Z", { start: START, mode: "relative" })).toEqual({ type: "closePath" });
    });

    it("builds a C from the raw offsets", () => {
      expect(createSegment("C", { start: START, mode: "relative" })).toEqual({
        type: "curveTo",
        mode: "relative",
        x1: 10 / 3,
        y1: -5,
        x2: 20 / 3,
        y2: 5,
        x: 10,
        y: 0,
      });
    });

    it("builds an S from the raw offsets", () => {
      expect(createSegment("S", { start: START, mode: "relative" })).toEqual({
        type: "smoothCurveTo",
        mode: "relative",
        x2: 20 / 3,
        y2: 5,
        x: 10,
        y: 0,
      });
    });

    it("builds a Q from the raw offsets", () => {
      expect(createSegment("Q", { start: START, mode: "relative" })).toEqual({
        type: "quadraticCurveTo",
        mode: "relative",
        x1: 5,
        y1: -5,
        x: 10,
        y: 0,
      });
    });

    it("builds a T from the raw offsets", () => {
      expect(createSegment("T", { start: START, mode: "relative" })).toEqual({
        type: "smoothQuadraticCurveTo",
        mode: "relative",
        x: 10,
        y: 0,
      });
    });

    it("builds an A from the raw offsets, with radii independent of mode", () => {
      expect(createSegment("A", { start: START, mode: "relative" })).toEqual({
        type: "ellipticalArcTo",
        mode: "relative",
        rx: 5,
        ry: 5,
        xAxisRotation: 0,
        largeArcFlag: 0,
        sweepFlag: 1,
        x: 10,
        y: 0,
      });
    });
  });

  describe("defaults", () => {
    it("starts at the origin, absolute, with a step of 10", () => {
      expect(createSegment("L")).toEqual({ type: "lineTo", mode: "absolute", x: 10, y: 0 });
      expect(createSegment("M")).toEqual({ type: "moveTo", mode: "absolute", x: 10, y: 10 });
    });

    it("treats an empty options object like no options", () => {
      expect(createSegment("V", {})).toEqual(createSegment("V"));
    });
  });

  describe("step", () => {
    it("scales the generated line", () => {
      expect(createSegment("L", { step: 30 })).toEqual({
        type: "lineTo",
        mode: "absolute",
        x: 30,
        y: 0,
      });
    });

    it("scales the generated curve control points", () => {
      expect(createSegment("C", { step: 6 })).toEqual({
        type: "curveTo",
        mode: "absolute",
        x1: 2,
        y1: -3,
        x2: 4,
        y2: 3,
        x: 6,
        y: 0,
      });
    });

    it("scales the generated arc radii", () => {
      expect(createSegment("A", { step: 8 })).toMatchObject({ rx: 4, ry: 4, x: 8, y: 0 });
    });
  });

  describe("validation", () => {
    it("throws RangeError on a non-finite start point", () => {
      expect(() => createSegment("L", { start: { x: Number.NaN, y: 0 } })).toThrow(RangeError);
      expect(() => createSegment("L", { start: { x: 0, y: Number.POSITIVE_INFINITY } })).toThrow(
        RangeError,
      );
    });

    it("throws RangeError on a zero step", () => {
      expect(() => createSegment("L", { step: 0 })).toThrow(RangeError);
    });

    it("throws RangeError on a negative step", () => {
      expect(() => createSegment("L", { step: -5 })).toThrow(RangeError);
    });

    it("throws RangeError on a non-finite step", () => {
      expect(() => createSegment("L", { step: Number.NaN })).toThrow(RangeError);
      expect(() => createSegment("L", { step: Number.POSITIVE_INFINITY })).toThrow(RangeError);
    });
  });
});

describe("appendCommand", () => {
  it("appends to the end of the path", () => {
    const segments = parsePath("M0 0 L10 10");
    expect(serializePath(appendCommand(segments, "L"))).toBe("M0 0 L10 10 L20 10");
  });

  it("starts from the path's current end point", () => {
    const segments = parsePath("M5 5 l10 20");
    const result = appendCommand(segments, "V");
    expect(endPoint(result)).toEqual({ x: 15, y: 35 });
    expect(serializePath(result)).toBe("M5 5 l10 20 V35");
  });

  it("works on an empty path, starting from the origin", () => {
    expect(serializePath(appendCommand([], "M"))).toBe("M10 10");
  });

  it("passes step through", () => {
    const segments = parsePath("M0 0 L10 10");
    expect(serializePath(appendCommand(segments, "L", { step: 50 }))).toBe("M0 0 L10 10 L60 10");
  });

  it("passes mode through", () => {
    const segments = parsePath("M0 0 L10 10");
    expect(serializePath(appendCommand(segments, "L", { mode: "relative" }))).toBe(
      "M0 0 L10 10 l10 0",
    );
  });

  it("does not mutate the input", () => {
    const segments = parsePath("M0 0 L10 10");
    const before = structuredClone(segments);
    appendCommand(segments, "L");
    expect(segments).toEqual(before);
  });
});
