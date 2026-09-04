import { describe, expect, it } from "vitest";

import { parsePath } from "@/utils/parser";

import { pathLength, segmentLength } from "./length";
import { resolve } from "./resolve";

const lengthOf = (d: string) => pathLength(resolve(parsePath(d)));

describe("segmentLength", () => {
  it("measures a line exactly", () => {
    const [, line] = resolve(parsePath("M0 0 L30 40"));
    expect(segmentLength(line)).toBeCloseTo(50, 9);
  });

  it("measures a moveTo as zero", () => {
    const [move] = resolve(parsePath("M10 20"));
    expect(segmentLength(move)).toBe(0);
  });
});

describe("pathLength", () => {
  it("returns zero for an empty path", () => {
    expect(pathLength([])).toBe(0);
  });

  it("ignores a moveTo, which draws nothing", () => {
    expect(lengthOf("M10 20")).toBe(0);
  });

  it("sums the segments of a polyline", () => {
    expect(lengthOf("M0 0 L3 0 L3 4")).toBeCloseTo(7, 9);
  });

  it("approximates a half-circle arc", () => {
    expect(lengthOf("M10 0 A10 10 0 0 1 -10 0")).toBeCloseTo(Math.PI * 10, 1);
  });
});
