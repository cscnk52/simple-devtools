import { describe, expect, it } from "vitest";

import { arcCenter, arcPointAtAngle } from "./arc";
import type { Point } from "./point";

const START: Point = { x: 10, y: 0 };
const END: Point = { x: 0, y: 10 };

describe("arcCenter", () => {
  it("finds the centre of a quarter circle", () => {
    const arc = arcCenter(START, END, 10, 10, 0, 0, 0);

    expect(arc).not.toBeNull();
    expect(arc!.center.x).toBeCloseTo(10);
    expect(arc!.center.y).toBeCloseTo(10);
    expect(arc!.rx).toBeCloseTo(10);
    expect(arc!.ry).toBeCloseTo(10);
    expect(Math.abs(arc!.deltaAngle)).toBeCloseTo(Math.PI / 2);
  });

  it("puts the centre on the other side when sweepFlag is 1", () => {
    const arc = arcCenter(START, END, 10, 10, 0, 0, 1);

    expect(arc).not.toBeNull();
    expect(arc!.center.x).toBeCloseTo(0);
    expect(arc!.center.y).toBeCloseTo(0);
  });

  it("sweeps clockwise for sweepFlag 1 and counter-clockwise for sweepFlag 0", () => {
    const ccw = arcCenter(START, END, 10, 10, 0, 0, 0);
    const cw = arcCenter(START, END, 10, 10, 0, 0, 1);

    expect(ccw!.deltaAngle).toBeLessThan(0);
    expect(cw!.deltaAngle).toBeGreaterThan(0);
  });

  it("takes the long way round when largeArcFlag is 1", () => {
    const small = arcCenter(START, END, 10, 10, 0, 0, 1);
    const large = arcCenter(START, END, 10, 10, 0, 1, 1);

    expect(Math.abs(small!.deltaAngle)).toBeLessThan(Math.PI);
    expect(Math.abs(large!.deltaAngle)).toBeGreaterThan(Math.PI);
  });

  it("returns null for coincident endpoints", () => {
    expect(arcCenter({ x: 5, y: 5 }, { x: 5, y: 5 }, 10, 10, 0, 0, 1)).toBeNull();
  });

  it("returns null for a zero rx", () => {
    expect(arcCenter(START, END, 0, 10, 0, 0, 1)).toBeNull();
  });

  it("returns null for a zero ry", () => {
    expect(arcCenter(START, END, 10, 0, 0, 0, 1)).toBeNull();
  });

  it("scales up radii too small to span the endpoints", () => {
    const arc = arcCenter({ x: 0, y: 0 }, { x: 10, y: 0 }, 1, 1, 0, 0, 1);

    expect(arc).not.toBeNull();
    expect(arc!.rx).toBeGreaterThan(1);
    expect(arc!.ry).toBeGreaterThan(1);
    expect(arc!.rx).toBeCloseTo(5);
    expect(arc!.ry).toBeCloseTo(5);
  });

  it("keeps radii large enough to span the endpoints untouched", () => {
    const arc = arcCenter({ x: 0, y: 0 }, { x: 10, y: 0 }, 20, 30, 0, 0, 1);

    expect(arc!.rx).toBe(20);
    expect(arc!.ry).toBe(30);
  });

  it("uses the absolute value of a negative radius", () => {
    const arc = arcCenter(START, END, -10, -10, 0, 0, 0);

    expect(arc!.rx).toBeCloseTo(10);
    expect(arc!.ry).toBeCloseTo(10);
  });

  it("converts xAxisRotation from degrees to radians", () => {
    expect(arcCenter(START, END, 10, 20, 90, 0, 1)!.rotation).toBeCloseTo(Math.PI / 2);
    expect(arcCenter(START, END, 10, 20, 180, 0, 1)!.rotation).toBeCloseTo(Math.PI);
    expect(arcCenter(START, END, 10, 20, 0, 0, 1)!.rotation).toBeCloseTo(0);
  });

  it("throws RangeError on a non-finite coordinate", () => {
    expect(() => arcCenter({ x: NaN, y: 0 }, END, 10, 10, 0, 0, 1)).toThrow(RangeError);
    expect(() => arcCenter(START, { x: 0, y: Infinity }, 10, 10, 0, 0, 1)).toThrow(RangeError);
  });

  it("throws RangeError on a non-finite radius or rotation", () => {
    expect(() => arcCenter(START, END, NaN, 10, 0, 0, 1)).toThrow(RangeError);
    expect(() => arcCenter(START, END, 10, Infinity, 0, 0, 1)).toThrow(RangeError);
    expect(() => arcCenter(START, END, 10, 10, NaN, 0, 1)).toThrow(RangeError);
  });
});

describe("arcPointAtAngle", () => {
  it("returns the start point at startAngle", () => {
    const arc = arcCenter(START, END, 10, 10, 0, 0, 0)!;
    const point = arcPointAtAngle(arc, arc.startAngle);

    expect(point.x).toBeCloseTo(START.x);
    expect(point.y).toBeCloseTo(START.y);
  });

  it("returns the end point at startAngle + deltaAngle", () => {
    const arc = arcCenter(START, END, 10, 10, 0, 0, 0)!;
    const point = arcPointAtAngle(arc, arc.startAngle + arc.deltaAngle);

    expect(point.x).toBeCloseTo(END.x);
    expect(point.y).toBeCloseTo(END.y);
  });

  it("round-trips the endpoints of a rotated elliptical arc", () => {
    const start: Point = { x: -30, y: 12 };
    const end: Point = { x: 25, y: -8 };
    const arc = arcCenter(start, end, 40, 20, 37, 1, 0)!;

    const first = arcPointAtAngle(arc, arc.startAngle);
    const last = arcPointAtAngle(arc, arc.startAngle + arc.deltaAngle);

    expect(first.x).toBeCloseTo(start.x);
    expect(first.y).toBeCloseTo(start.y);
    expect(last.x).toBeCloseTo(end.x);
    expect(last.y).toBeCloseTo(end.y);
  });

  it("stays on the ellipse at an angle inside the sweep", () => {
    const arc = arcCenter(START, END, 10, 10, 0, 0, 0)!;
    const point = arcPointAtAngle(arc, arc.startAngle + arc.deltaAngle / 2);

    expect(Math.hypot(point.x - arc.center.x, point.y - arc.center.y)).toBeCloseTo(10);
  });
});
