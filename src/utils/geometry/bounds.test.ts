import { describe, expect, it } from "vitest";

import { parsePath } from "@/utils/parser";

import { bounds, boundsCenter, boundsSize } from "./bounds";
import { resolve } from "./resolve";

const boundsOf = (d: string) => bounds(resolve(parsePath(d)));

describe("bounds", () => {
  it("returns null for an empty path", () => {
    expect(boundsOf("")).toBeNull();
  });

  it("boxes a simple polyline", () => {
    expect(boundsOf("M0 0 L10 0 L10 20 Z")).toEqual({ minX: 0, minY: 0, maxX: 10, maxY: 20 });
  });

  // a lone moveTo draws nothing, so the origin it started from is not boxed
  it("boxes a single point", () => {
    expect(boundsOf("M5 7")).toEqual({ minX: 5, minY: 7, maxX: 5, maxY: 7 });
  });

  it("handles negative coordinates", () => {
    expect(boundsOf("M-10 -20 L10 20")).toEqual({ minX: -10, minY: -20, maxX: 10, maxY: 20 });
  });

  it("resolves relative segments before boxing", () => {
    expect(boundsOf("M10 10 l10 10 l-30 0")).toEqual({
      minX: -10,
      minY: 10,
      maxX: 20,
      maxY: 20,
    });
  });

  it("includes the control points of a cubic curve", () => {
    expect(boundsOf("M0 0 C0 -50 100 -50 100 0")).toEqual({
      minX: 0,
      minY: -50,
      maxX: 100,
      maxY: 0,
    });
  });

  it("includes the control point of a quadratic curve", () => {
    expect(boundsOf("M0 0 Q50 -80 100 0")).toEqual({
      minX: 0,
      minY: -80,
      maxX: 100,
      maxY: 0,
    });
  });

  it("includes the full ellipse of an arc", () => {
    const box = boundsOf("M0 0 A10 10 0 0 1 0 20")!;

    expect(box.minX).toBeCloseTo(-10);
    expect(box.maxX).toBeCloseTo(10);
    expect(box.minY).toBeCloseTo(0);
    expect(box.maxY).toBeCloseTo(20);
  });

  it("ignores a degenerate arc and keeps just the endpoints", () => {
    expect(boundsOf("M0 0 A0 0 0 0 1 10 20")).toEqual({ minX: 0, minY: 0, maxX: 10, maxY: 20 });
  });
});

describe("boundsSize", () => {
  it("returns the width and height", () => {
    expect(boundsSize({ minX: 0, minY: 0, maxX: 10, maxY: 20 })).toEqual({
      width: 10,
      height: 20,
    });
  });

  it("returns a zero size for a degenerate box", () => {
    expect(boundsSize({ minX: 5, minY: 5, maxX: 5, maxY: 5 })).toEqual({ width: 0, height: 0 });
  });

  it("handles a box spanning the origin", () => {
    expect(boundsSize({ minX: -10, minY: -5, maxX: 10, maxY: 5 })).toEqual({
      width: 20,
      height: 10,
    });
  });
});

describe("boundsCenter", () => {
  it("returns the midpoint", () => {
    expect(boundsCenter({ minX: 0, minY: 0, maxX: 10, maxY: 20 })).toEqual({ x: 5, y: 10 });
  });

  it("handles a box spanning the origin", () => {
    expect(boundsCenter({ minX: -10, minY: -5, maxX: 10, maxY: 5 })).toEqual({ x: 0, y: 0 });
  });
});
