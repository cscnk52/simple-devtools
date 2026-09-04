import { describe, expect, it } from "vitest";

import { parsePath } from "./index";
import { minify } from "./minify";
import type { Segment } from "./parser";

const compact = (d: string) => minify(parsePath(d));

describe("minify", () => {
  it("returns an empty string for an empty path", () => {
    expect(minify([])).toBe("");
  });

  it("emits a single segment verbatim", () => {
    expect(compact("M10 20")).toBe("M10 20");
  });

  it("merges consecutive lineTo into implicit repetition", () => {
    expect(compact("L10 20 L30 40")).toBe("L10 20 30 40");
  });

  it("merges several consecutive segments of the same type", () => {
    expect(compact("M0 0 L10 0 L10 10 L0 10")).toBe("M0 0 L10 0 10 10 0 10");
  });

  it("keeps the command letter when the type changes", () => {
    expect(compact("M10 20 L30 40")).toBe("M10 20 L30 40");
  });

  it("merges relative segments in lowercase", () => {
    expect(compact("m0 0 l10 0 l10 10")).toBe("m0 0 l10 0 10 10");
  });

  it("does not merge across a relative/absolute boundary", () => {
    expect(compact("l10 20 L30 40")).toBe("l10 20 L30 40");
  });

  it("does not merge moveTo, whose implicit repeat is lineTo", () => {
    expect(compact("M10 20 M30 40")).toBe("M10 20 M30 40");
  });

  it("never merges closePath", () => {
    expect(compact("M0 0 L10 0 Z")).toBe("M0 0 L10 0 Z");
  });

  it("never merges two closePath", () => {
    expect(compact("M0 0 Z Z")).toBe("M0 0 Z Z");
  });

  it("does not merge across a closePath", () => {
    expect(compact("M0 0 L10 0 Z L20 0")).toBe("M0 0 L10 0 Z L20 0");
  });
});

describe("minify merges each repeatable command type", () => {
  it("merges horizontalLineTo", () => {
    expect(
      minify([
        { type: "horizontalLineTo", mode: "absolute", x: 10 },
        { type: "horizontalLineTo", mode: "absolute", x: 20 },
      ]),
    ).toBe("H10 20");
  });

  it("merges verticalLineTo", () => {
    expect(
      minify([
        { type: "verticalLineTo", mode: "absolute", y: 10 },
        { type: "verticalLineTo", mode: "absolute", y: 20 },
      ]),
    ).toBe("V10 20");
  });

  it("merges curveTo", () => {
    expect(
      minify([
        { type: "curveTo", mode: "absolute", x1: 0, y1: 1, x2: 2, y2: 3, x: 4, y: 5 },
        { type: "curveTo", mode: "absolute", x1: 6, y1: 7, x2: 8, y2: 9, x: 10, y: 11 },
      ]),
    ).toBe("C0 1 2 3 4 5 6 7 8 9 10 11");
  });

  it("merges smoothCurveTo", () => {
    expect(
      minify([
        { type: "smoothCurveTo", mode: "absolute", x2: 1, y2: 2, x: 3, y: 4 },
        { type: "smoothCurveTo", mode: "absolute", x2: 5, y2: 6, x: 7, y: 8 },
      ]),
    ).toBe("S1 2 3 4 5 6 7 8");
  });

  it("merges quadraticCurveTo", () => {
    expect(
      minify([
        { type: "quadraticCurveTo", mode: "absolute", x1: 1, y1: 2, x: 3, y: 4 },
        { type: "quadraticCurveTo", mode: "absolute", x1: 5, y1: 6, x: 7, y: 8 },
      ]),
    ).toBe("Q1 2 3 4 5 6 7 8");
  });

  it("merges smoothQuadraticCurveTo", () => {
    expect(
      minify([
        { type: "smoothQuadraticCurveTo", mode: "absolute", x: 1, y: 2 },
        { type: "smoothQuadraticCurveTo", mode: "absolute", x: 3, y: 4 },
      ]),
    ).toBe("T1 2 3 4");
  });

  it("merges ellipticalArcTo", () => {
    expect(
      minify([
        {
          type: "ellipticalArcTo",
          mode: "absolute",
          rx: 1,
          ry: 1,
          xAxisRotation: 0,
          largeArcFlag: 0,
          sweepFlag: 1,
          x: 2,
          y: 2,
        },
        {
          type: "ellipticalArcTo",
          mode: "absolute",
          rx: 3,
          ry: 3,
          xAxisRotation: 0,
          largeArcFlag: 1,
          sweepFlag: 0,
          x: 4,
          y: 4,
        },
      ]),
    ).toBe("A1 1 0 0 1 2 2 3 3 0 1 0 4 4");
  });
});

describe("minify precision", () => {
  it("passes precision through to repeated arguments", () => {
    const segments: Segment[] = [
      { type: "lineTo", mode: "absolute", x: 1.234, y: 5.678 },
      { type: "lineTo", mode: "absolute", x: 9.876, y: 5.432 },
    ];
    expect(minify(segments, 1)).toBe("L1.2 5.7 9.9 5.4");
  });
});

describe("minify round-trips", () => {
  it.each([
    "M0 0 L10 0 L10 10 L0 10 Z",
    "M0 0 H10 H20 V10 V20 Z",
    "M0 0 C0 0 1 1 2 2 C3 3 4 4 5 5 Z",
    "M0 0 S1 1 2 2 S3 3 4 4 Z",
    "M0 0 Q1 1 2 2 Q3 3 4 4 Z",
    "M0 0 T1 1 T2 2 Z",
    "M0 0 A1 1 0 0 1 2 2 A3 3 0 1 0 4 4 Z",
  ])("round-trips %s", (d) => {
    const segments = parsePath(d);
    expect(parsePath(minify(segments))).toEqual(segments);
  });

  it("does not lose the moveTo/lineTo distinction", () => {
    const segments = parsePath("M10 20 M30 40");
    expect(parsePath(minify(segments))).toEqual(segments);
  });
});
