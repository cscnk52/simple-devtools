import { describe, expect, it } from "vitest";

import { parsePath } from "@/utils/parser";

import { arcAngleStep, flattenEllipse, flattenSegment } from "./flatten";
import { resolve } from "./resolve";

const flattenOf = (d: string, index: number, tolerance?: number) =>
  flattenSegment(resolve(parsePath(d))[index], tolerance ? { tolerance } : {});

function toPoints(flat: readonly number[]): Array<{ x: number; y: number }> {
  const points = [];
  for (let i = 0; i < flat.length; i += 2) points.push({ x: flat[i], y: flat[i + 1] });
  return points;
}

/** Shortest distance from a point to a line segment. */
function distanceToSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSq = dx * dx + dy * dy;
  const t =
    lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSq));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function distanceToPolyline(px: number, py: number, flat: readonly number[]): number {
  let best = Infinity;
  for (let i = 0; i + 3 < flat.length; i += 2) {
    best = Math.min(
      best,
      distanceToSegment(px, py, flat[i], flat[i + 1], flat[i + 2], flat[i + 3]),
    );
  }
  return best;
}

function cubicAt(
  t: number,
  p: readonly [number, number, number, number, number, number, number, number],
) {
  const u = 1 - t;
  const [x0, y0, x1, y1, x2, y2, x3, y3] = p;
  return {
    x: u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3,
    y: u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3,
  };
}

function quadraticAt(t: number, p: readonly [number, number, number, number, number, number]) {
  const u = 1 - t;
  const [x0, y0, x1, y1, x2, y2] = p;
  return {
    x: u * u * x0 + 2 * u * t * x1 + t * t * x2,
    y: u * u * y0 + 2 * u * t * y1 + t * t * y2,
  };
}

describe("flattenSegment", () => {
  it("returns null for a moveTo, which draws nothing", () => {
    expect(flattenOf("M10 20", 0)).toBeNull();
  });

  it("returns null for a closePath on an already-closed subpath", () => {
    expect(flattenOf("M0 0 L10 0 L0 0 Z", 3)).toBeNull();
  });

  it("returns the closing line for an open subpath", () => {
    expect(flattenOf("M0 0 L10 0 L10 10 Z", 3)).toEqual([10, 10, 0, 0]);
  });

  it("returns exactly two points for a line", () => {
    expect(flattenOf("M0 0 L10 20", 1)).toEqual([0, 0, 10, 20]);
  });

  it("resolves a relative line to absolute coordinates", () => {
    expect(flattenOf("M10 10 l5 5", 1)).toEqual([10, 10, 15, 15]);
  });

  it("inherits the untouched axis of an H and a V", () => {
    expect(flattenOf("M4 7 H20", 1)).toEqual([4, 7, 20, 7]);
    expect(flattenOf("M4 7 V20", 1)).toEqual([4, 7, 4, 20]);
  });

  it("returns null for a zero-length line", () => {
    expect(flattenOf("M5 5 L5 5", 1)).toBeNull();
  });

  it("starts at the segment start and ends at the segment end", () => {
    const flat = flattenOf("M0 0 C0 50 100 50 100 0", 1)!;
    expect(flat.slice(0, 2)).toEqual([0, 0]);
    expect(flat.slice(-2)).toEqual([100, 0]);
  });

  it("keeps a cubic within the requested tolerance", () => {
    const control = [0, 0, 0, 80, 100, 80, 100, 0] as const;
    const tolerance = 0.5;
    const flat = flattenOf("M0 0 C0 80 100 80 100 0", 1, tolerance)!;

    for (let i = 0; i <= 400; i++) {
      const { x, y } = cubicAt(i / 400, control);
      expect(distanceToPolyline(x, y, flat)).toBeLessThanOrEqual(tolerance);
    }
  });

  it("keeps a quadratic within the requested tolerance", () => {
    const control = [0, 0, 50, 100, 100, 0] as const;
    const tolerance = 0.25;
    const flat = flattenOf("M0 0 Q50 100 100 0", 1, tolerance)!;

    for (let i = 0; i <= 400; i++) {
      const { x, y } = quadraticAt(i / 400, control);
      expect(distanceToPolyline(x, y, flat)).toBeLessThanOrEqual(tolerance);
    }
  });

  it("spends more vertices on a tighter tolerance", () => {
    const coarse = flattenOf("M0 0 C0 80 100 80 100 0", 1, 5)!;
    const fine = flattenOf("M0 0 C0 80 100 80 100 0", 1, 0.05)!;
    expect(fine.length).toBeGreaterThan(coarse.length);
  });

  it("emits a single line for an already-flat cubic", () => {
    expect(flattenOf("M0 0 C10 0 20 0 30 0", 1, 0.1)).toEqual([0, 0, 30, 0]);
  });

  it("bakes the reflected control point of an S into the sampled geometry", () => {
    const smooth = flattenOf("M0 0 C10 0 20 10 30 10 S50 20 60 10", 2, 0.01);
    // the S reflects C's second control (20,10) about (30,10) to give (40,10)
    const explicit = flattenOf("M0 0 C10 0 20 10 30 10 C40 10 50 20 60 10", 2, 0.01);
    expect(smooth).toEqual(explicit);
  });

  it("bakes the reflected control point of a T into the sampled geometry", () => {
    const smooth = flattenOf("M0 0 Q10 0 20 10 T40 10", 2, 0.01);
    const explicit = flattenOf("M0 0 Q10 0 20 10 Q30 20 40 10", 2, 0.01);
    expect(smooth).toEqual(explicit);
  });

  it("samples an arc onto its ellipse", () => {
    const flat = flattenOf("M0 10 A10 10 0 0 1 20 10", 1, 0.01)!;

    for (const { x, y } of toPoints(flat)) {
      // centre is (10,10) with radius 10
      expect(Math.hypot(x - 10, y - 10)).toBeCloseTo(10, 6);
    }
  });

  it("starts and ends an arc exactly on its endpoints", () => {
    const flat = flattenOf("M0 10 A10 10 0 0 1 20 10", 1)!;
    expect(flat.slice(0, 2)).toEqual([0, 10]);
    const [x, y] = flat.slice(-2);
    expect(x).toBeCloseTo(20, 9);
    expect(y).toBeCloseTo(10, 9);
  });

  it("keeps an arc within the requested tolerance", () => {
    const tolerance = 0.2;
    const flat = flattenOf("M0 10 A10 10 0 0 1 20 10", 1, tolerance)!;

    // the true arc: half circle of radius 10 centred at (10,10)
    for (let i = 0; i <= 200; i++) {
      const angle = Math.PI + (Math.PI * i) / 200;
      const x = 10 + 10 * Math.cos(angle);
      const y = 10 + 10 * Math.sin(angle);
      expect(distanceToPolyline(x, y, flat)).toBeLessThanOrEqual(tolerance);
    }
  });

  it("draws a degenerate arc as the straight line the spec calls for", () => {
    expect(flattenOf("M0 0 A0 10 0 0 1 20 20", 1)).toEqual([0, 0, 20, 20]);
  });

  it("returns null for an arc with coincident endpoints", () => {
    expect(flattenOf("M5 5 A10 10 0 0 1 5 5", 1)).toBeNull();
  });

  it("bounds the vertex count with maxDepth", () => {
    const segment = resolve(parsePath("M0 0 C0 500 500 500 500 0"))[1];
    const flat = flattenSegment(segment, { tolerance: 0.000001, maxDepth: 3 })!;
    // 2^3 line segments at most, so 2^3 + 1 points
    expect(flat.length / 2).toBeLessThanOrEqual(9);
  });

  it("throws on a non-positive or non-finite tolerance", () => {
    const segment = resolve(parsePath("M0 0 L1 1"))[1];
    expect(() => flattenSegment(segment, { tolerance: 0 })).toThrow(RangeError);
    expect(() => flattenSegment(segment, { tolerance: -1 })).toThrow(RangeError);
    expect(() => flattenSegment(segment, { tolerance: NaN })).toThrow(RangeError);
  });

  it("throws on a negative or fractional maxDepth", () => {
    const segment = resolve(parsePath("M0 0 L1 1"))[1];
    expect(() => flattenSegment(segment, { maxDepth: -1 })).toThrow(RangeError);
    expect(() => flattenSegment(segment, { maxDepth: 1.5 })).toThrow(RangeError);
  });
});

describe("arcAngleStep", () => {
  it("takes smaller steps for a tighter tolerance", () => {
    expect(arcAngleStep(10, 0.01)).toBeLessThan(arcAngleStep(10, 1));
  });

  it("takes smaller steps on a larger radius at the same tolerance", () => {
    expect(arcAngleStep(1000, 0.1)).toBeLessThan(arcAngleStep(10, 0.1));
  });

  it("keeps the chord sagitta at the tolerance", () => {
    const radius = 25;
    const tolerance = 0.4;
    const step = arcAngleStep(radius, tolerance);
    expect(radius * (1 - Math.cos(step / 2))).toBeCloseTo(tolerance, 9);
  });

  it("falls back to a half turn when the tolerance swamps the radius", () => {
    expect(arcAngleStep(1, 5)).toBe(Math.PI);
  });

  it("falls back to a quarter turn on a degenerate radius", () => {
    expect(arcAngleStep(0, 1)).toBe(Math.PI / 2);
  });
});

describe("flattenEllipse", () => {
  it("samples points that all lie on the ellipse", () => {
    const flat = flattenEllipse({ x: 5, y: 5 }, 10, 4, 0, 0.01);

    for (const { x, y } of toPoints(flat)) {
      expect(((x - 5) / 10) ** 2 + ((y - 5) / 4) ** 2).toBeCloseTo(1, 6);
    }
  });

  it("emits an open ring, leaving the closing edge to the renderer", () => {
    const flat = flattenEllipse({ x: 0, y: 0 }, 10, 10, 0, 0.5);
    expect(flat.slice(0, 2)).not.toEqual(flat.slice(-2));
  });

  it("honours the rotation", () => {
    const flat = flattenEllipse({ x: 0, y: 0 }, 10, 2, Math.PI / 2, 0.01);
    // rotated a quarter turn, the long axis now runs vertically
    expect(flat[0]).toBeCloseTo(0, 9);
    expect(flat[1]).toBeCloseTo(10, 9);
  });

  it("never drops below eight points", () => {
    expect(flattenEllipse({ x: 0, y: 0 }, 1, 1, 0, 1000).length / 2).toBeGreaterThanOrEqual(8);
  });
});
