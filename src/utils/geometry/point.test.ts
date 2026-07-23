import { describe, expect, it } from "vitest";

import { add, distance, isFinitePoint, point, reflect, subtract } from "./point";

describe("point", () => {
  it("builds a point from x and y", () => {
    expect(point(3, 4)).toEqual({ x: 3, y: 4 });
  });

  it("keeps negative and fractional coordinates", () => {
    expect(point(-1.5, 0.25)).toEqual({ x: -1.5, y: 0.25 });
  });
});

describe("isFinitePoint", () => {
  it("accepts a finite point", () => {
    expect(isFinitePoint({ x: 0, y: 0 })).toBe(true);
    expect(isFinitePoint({ x: -1e10, y: 1e10 })).toBe(true);
  });

  it("rejects NaN in either coordinate", () => {
    expect(isFinitePoint({ x: Number.NaN, y: 0 })).toBe(false);
    expect(isFinitePoint({ x: 0, y: Number.NaN })).toBe(false);
  });

  it("rejects Infinity in either coordinate", () => {
    expect(isFinitePoint({ x: Number.POSITIVE_INFINITY, y: 0 })).toBe(false);
    expect(isFinitePoint({ x: 0, y: Number.NEGATIVE_INFINITY })).toBe(false);
  });
});

describe("add", () => {
  it("adds componentwise", () => {
    expect(add({ x: 1, y: 2 }, { x: 10, y: 20 })).toEqual({ x: 11, y: 22 });
  });

  it("returns the original when adding the origin", () => {
    expect(add({ x: 3, y: 4 }, { x: 0, y: 0 })).toEqual({ x: 3, y: 4 });
  });

  it("does not mutate its arguments", () => {
    const a = { x: 1, y: 2 };
    const b = { x: 10, y: 20 };
    add(a, b);
    expect(a).toEqual({ x: 1, y: 2 });
    expect(b).toEqual({ x: 10, y: 20 });
  });
});

describe("subtract", () => {
  it("subtracts componentwise", () => {
    expect(subtract({ x: 10, y: 20 }, { x: 1, y: 2 })).toEqual({ x: 9, y: 18 });
  });

  it("yields the origin for equal points", () => {
    expect(subtract({ x: 5, y: 5 }, { x: 5, y: 5 })).toEqual({ x: 0, y: 0 });
  });

  it("undoes add", () => {
    const a = { x: 7, y: -3 };
    const b = { x: 2, y: 9 };
    expect(subtract(add(a, b), b)).toEqual(a);
  });
});

describe("reflect", () => {
  it("mirrors a point through an origin", () => {
    expect(reflect({ x: 1, y: 2 }, { x: 10, y: 10 })).toEqual({ x: 19, y: 18 });
  });

  it("mirrors through the origin by negating", () => {
    expect(reflect({ x: 3, y: -4 }, { x: 0, y: 0 })).toEqual({ x: -3, y: 4 });
  });

  it("returns the point itself when it is the origin", () => {
    expect(reflect({ x: 5, y: 6 }, { x: 5, y: 6 })).toEqual({ x: 5, y: 6 });
  });

  it("returns the original when applied twice", () => {
    const p = { x: 1.5, y: -2.5 };
    const origin = { x: 10, y: 20 };
    expect(reflect(reflect(p, origin), origin)).toEqual(p);
  });
});

describe("distance", () => {
  it("measures a 3-4-5 triangle", () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });

  it("is zero for equal points", () => {
    expect(distance({ x: 2, y: 2 }, { x: 2, y: 2 })).toBe(0);
  });

  it("is symmetric", () => {
    const a = { x: -1, y: 7 };
    const b = { x: 4, y: -2 };
    expect(distance(a, b)).toBe(distance(b, a));
  });
});
