import { describe, expect, it } from "vitest";

import { parsePath } from "@/utils/parser";

import { endPoint, resolve } from "./resolve";

describe("resolve", () => {
  it("resolves an empty path to no segments", () => {
    expect(resolve([])).toEqual([]);
  });

  it("resolves a single absolute moveTo", () => {
    expect(resolve(parsePath("M10 20"))).toEqual([
      {
        index: 0,
        segment: { type: "moveTo", mode: "absolute", x: 10, y: 20 },
        start: { x: 0, y: 0 },
        end: { x: 10, y: 20 },
        subpathStart: { x: 10, y: 20 },
        controls: [],
      },
    ]);
  });

  it("starts a relative moveTo from the origin", () => {
    expect(resolve(parsePath("m10 10 l5 5")).map((r) => r.end)).toEqual([
      { x: 10, y: 10 },
      { x: 15, y: 15 },
    ]);
  });

  it("expands relative lineTo against the current point", () => {
    expect(resolve(parsePath("M10 10 l5 5 L30 30 l-10 -10")).map((r) => r.end)).toEqual([
      { x: 10, y: 10 },
      { x: 15, y: 15 },
      { x: 30, y: 30 },
      { x: 20, y: 20 },
    ]);
  });

  it("inherits the y coordinate for H and the x coordinate for V", () => {
    expect(resolve(parsePath("M10 20 H50 V60 h5 v5")).map((r) => r.end)).toEqual([
      { x: 10, y: 20 },
      { x: 50, y: 20 },
      { x: 50, y: 60 },
      { x: 55, y: 60 },
      { x: 55, y: 65 },
    ]);
  });

  it("returns closePath to the subpath start", () => {
    const resolved = resolve(parsePath("M10 10 L20 20 L30 5 Z"));

    expect(resolved[3].end).toEqual({ x: 10, y: 10 });
    expect(resolved[3].start).toEqual({ x: 30, y: 5 });
  });

  it("opens a new subpath on a second moveTo so a later Z returns to the new start", () => {
    const resolved = resolve(parsePath("M0 0 L5 5 M100 100 L110 110 Z"));

    expect(resolved.map((r) => r.subpathStart)).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 100, y: 100 },
      { x: 100, y: 100 },
      { x: 100, y: 100 },
    ]);
    expect(resolved[4].end).toEqual({ x: 100, y: 100 });
  });

  it("resolves the control points of an absolute cubic", () => {
    const resolved = resolve(parsePath("M0 0 C10 0 20 10 30 10"));

    expect(resolved[1].controls).toEqual([
      { slot: "c1", point: { x: 10, y: 0 }, implied: false },
      { slot: "c2", point: { x: 20, y: 10 }, implied: false },
    ]);
    expect(resolved[1].end).toEqual({ x: 30, y: 10 });
  });

  it("resolves the control points of a relative cubic", () => {
    const resolved = resolve(parsePath("M10 10 c10 0 20 10 30 10"));

    expect(resolved[1].controls).toEqual([
      { slot: "c1", point: { x: 20, y: 10 }, implied: false },
      { slot: "c2", point: { x: 30, y: 20 }, implied: false },
    ]);
    expect(resolved[1].end).toEqual({ x: 40, y: 20 });
  });

  it("reflects the previous cubic's second control point for S", () => {
    const resolved = resolve(parsePath("M0 0 C10 0 20 10 30 10 S50 30 60 30"));

    expect(resolved[2].controls).toEqual([
      { slot: "c1", point: { x: 40, y: 10 }, implied: true },
      { slot: "c2", point: { x: 50, y: 30 }, implied: false },
    ]);
    expect(resolved[2].end).toEqual({ x: 60, y: 30 });
  });

  it("reflects the previous S's second control point for a following S", () => {
    const resolved = resolve(parsePath("M0 0 C10 0 20 10 30 10 S50 30 60 30 S80 50 90 50"));

    // previous c2 (50,30) mirrored through (60,30)
    expect(resolved[3].controls[0]).toEqual({
      slot: "c1",
      point: { x: 70, y: 30 },
      implied: true,
    });
  });

  it("collapses S's first control onto the current point when the previous segment is not a cubic", () => {
    const resolved = resolve(parsePath("M0 0 L10 10 S20 30 30 30"));

    expect(resolved[2].controls).toEqual([
      { slot: "c1", point: { x: 10, y: 10 }, implied: true },
      { slot: "c2", point: { x: 20, y: 30 }, implied: false },
    ]);
  });

  it("reflects correctly for a relative S after a relative cubic", () => {
    const resolved = resolve(parsePath("M10 10 c10 0 20 10 30 10 s20 20 30 20"));

    expect(resolved[2].controls).toEqual([
      { slot: "c1", point: { x: 50, y: 20 }, implied: true },
      { slot: "c2", point: { x: 60, y: 40 }, implied: false },
    ]);
    expect(resolved[2].end).toEqual({ x: 70, y: 40 });
  });

  it("resolves the single control point of a quadratic", () => {
    const resolved = resolve(parsePath("M0 0 Q10 0 20 10"));

    expect(resolved[1].controls).toEqual([{ slot: "c1", point: { x: 10, y: 0 }, implied: false }]);
  });

  it("reflects the previous quadratic's control point for T", () => {
    const resolved = resolve(parsePath("M0 0 Q10 0 20 10 T40 20"));

    expect(resolved[2].controls).toEqual([{ slot: "c1", point: { x: 30, y: 20 }, implied: true }]);
    expect(resolved[2].end).toEqual({ x: 40, y: 20 });
  });

  it("collapses T's control onto the current point when the previous segment is a line", () => {
    const resolved = resolve(parsePath("M0 0 L10 10 T20 20"));

    expect(resolved[2].controls).toEqual([{ slot: "c1", point: { x: 10, y: 10 }, implied: true }]);
  });

  it("reflects correctly for a relative T after a relative quadratic", () => {
    const resolved = resolve(parsePath("M10 10 q10 0 20 10 t20 10"));

    // control (20,10) mirrored through the current point (30,20)
    expect(resolved[2].controls).toEqual([{ slot: "c1", point: { x: 40, y: 30 }, implied: true }]);
    expect(resolved[2].end).toEqual({ x: 50, y: 30 });
  });

  it("does not reflect a cubic control point into T", () => {
    const resolved = resolve(parsePath("M0 0 C10 0 20 10 30 10 T40 20"));

    expect(resolved[2].controls).toEqual([{ slot: "c1", point: { x: 30, y: 10 }, implied: true }]);
  });

  it("does not reflect a quadratic control point into S", () => {
    const resolved = resolve(parsePath("M0 0 Q10 0 20 10 S30 30 40 30"));

    expect(resolved[2].controls[0]).toEqual({
      slot: "c1",
      point: { x: 20, y: 10 },
      implied: true,
    });
  });

  it("resolves an arc endpoint with no control points", () => {
    const resolved = resolve(parsePath("M10 10 a5 5 0 0 1 10 0"));

    expect(resolved[1].end).toEqual({ x: 20, y: 10 });
    expect(resolved[1].controls).toEqual([]);
  });

  it("records the start of each segment as the end of the previous one", () => {
    const resolved = resolve(parsePath("M10 10 L20 20 L30 30"));

    expect(resolved.map((r) => r.start)).toEqual([
      { x: 0, y: 0 },
      { x: 10, y: 10 },
      { x: 20, y: 20 },
    ]);
  });

  it("numbers segments by their index in the source path", () => {
    expect(resolve(parsePath("M0 0 L1 1 L2 2 Z")).map((r) => r.index)).toEqual([0, 1, 2, 3]);
  });

  it("does not mutate the input segments", () => {
    const segments = parsePath("M10 10 c10 0 20 10 30 10");
    const snapshot = structuredClone(segments);

    resolve(segments);

    expect(segments).toEqual(snapshot);
  });

  it("resolves fractional relative coordinates", () => {
    const resolved = resolve(parsePath("M0.1 0.2 l0.2 0.1"));

    expect(resolved[1].end.x).toBeCloseTo(0.3);
    expect(resolved[1].end.y).toBeCloseTo(0.3);
  });
});

describe("endPoint", () => {
  it("returns the origin for an empty path", () => {
    expect(endPoint([])).toEqual({ x: 0, y: 0 });
  });

  it("returns the end of the last segment", () => {
    expect(endPoint(parsePath("M10 10 L20 20 l5 5"))).toEqual({ x: 25, y: 25 });
  });

  it("returns the subpath start when the path ends with a closePath", () => {
    expect(endPoint(parsePath("M10 10 L20 20 Z"))).toEqual({ x: 10, y: 10 });
  });

  it("returns the moveTo point for a path with only a moveTo", () => {
    expect(endPoint(parsePath("M7 8"))).toEqual({ x: 7, y: 8 });
  });
});
