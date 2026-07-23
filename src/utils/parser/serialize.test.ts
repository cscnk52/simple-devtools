import { describe, expect, it } from "vitest";

import { parsePath } from "./index";
import type { Segment } from "./parser";
import { formatNumber, serializePath, serializeSegment } from "./serialize";

describe("formatNumber", () => {
  it("renders an integer without a decimal part", () => {
    expect(formatNumber(10)).toBe("10");
  });

  it("keeps a value already inside the default precision", () => {
    expect(formatNumber(1.5)).toBe("1.5");
  });

  it("rounds to six decimals by default", () => {
    expect(formatNumber(1.23456789)).toBe("1.234568");
  });

  it("drops trailing zeros produced by rounding", () => {
    expect(formatNumber(2.0000001)).toBe("2");
  });

  it("collapses float noise", () => {
    expect(formatNumber(0.1 + 0.2)).toBe("0.3");
  });

  it('renders negative zero as "0"', () => {
    expect(formatNumber(-0)).toBe("0");
  });

  it('renders a value rounding to negative zero as "0"', () => {
    expect(formatNumber(-0.0000001)).toBe("0");
  });

  it("keeps the sign of a negative value", () => {
    expect(formatNumber(-12.5)).toBe("-12.5");
  });

  it("honours a custom precision", () => {
    expect(formatNumber(1.23456789, 2)).toBe("1.23");
  });

  it("rounds to an integer at precision 0", () => {
    expect(formatNumber(1.6, 0)).toBe("2");
  });

  it("rejects NaN", () => {
    expect(() => formatNumber(NaN)).toThrow(RangeError);
  });

  it("rejects Infinity", () => {
    expect(() => formatNumber(Infinity)).toThrow(RangeError);
  });

  it("rejects -Infinity", () => {
    expect(() => formatNumber(-Infinity)).toThrow(RangeError);
  });

  it("rejects a negative precision", () => {
    expect(() => formatNumber(1, -1)).toThrow(RangeError);
  });

  it("rejects a fractional precision", () => {
    expect(() => formatNumber(1, 2.5)).toThrow(RangeError);
  });

  it("rejects a precision above 20", () => {
    expect(() => formatNumber(1, 21)).toThrow(RangeError);
  });
});

describe("serializeSegment", () => {
  it("serializes MoveTo", () => {
    expect(serializeSegment({ type: "moveTo", mode: "absolute", x: 10, y: 20 })).toBe("M10 20");
  });

  it("serializes relative MoveTo in lowercase", () => {
    expect(serializeSegment({ type: "moveTo", mode: "relative", x: 10, y: 20 })).toBe("m10 20");
  });

  it("serializes LineTo", () => {
    expect(serializeSegment({ type: "lineTo", mode: "absolute", x: 30, y: 40 })).toBe("L30 40");
  });

  it("serializes relative LineTo in lowercase", () => {
    expect(serializeSegment({ type: "lineTo", mode: "relative", x: 30, y: 40 })).toBe("l30 40");
  });

  it("serializes HorizontalLineTo", () => {
    expect(serializeSegment({ type: "horizontalLineTo", mode: "absolute", x: 50 })).toBe("H50");
  });

  it("serializes relative HorizontalLineTo in lowercase", () => {
    expect(serializeSegment({ type: "horizontalLineTo", mode: "relative", x: 50 })).toBe("h50");
  });

  it("serializes VerticalLineTo", () => {
    expect(serializeSegment({ type: "verticalLineTo", mode: "absolute", y: 60 })).toBe("V60");
  });

  it("serializes relative VerticalLineTo in lowercase", () => {
    expect(serializeSegment({ type: "verticalLineTo", mode: "relative", y: 60 })).toBe("v60");
  });

  it("serializes ClosePath without arguments", () => {
    expect(serializeSegment({ type: "closePath" })).toBe("Z");
  });

  it("serializes CurveTo", () => {
    expect(
      serializeSegment({
        type: "curveTo",
        mode: "absolute",
        x1: 10,
        y1: 20,
        x2: 30,
        y2: 40,
        x: 50,
        y: 60,
      }),
    ).toBe("C10 20 30 40 50 60");
  });

  it("serializes relative CurveTo in lowercase", () => {
    expect(
      serializeSegment({
        type: "curveTo",
        mode: "relative",
        x1: 10,
        y1: 20,
        x2: 30,
        y2: 40,
        x: 50,
        y: 60,
      }),
    ).toBe("c10 20 30 40 50 60");
  });

  it("serializes SmoothCurveTo", () => {
    expect(
      serializeSegment({ type: "smoothCurveTo", mode: "absolute", x2: 30, y2: 40, x: 50, y: 60 }),
    ).toBe("S30 40 50 60");
  });

  it("serializes relative SmoothCurveTo in lowercase", () => {
    expect(
      serializeSegment({ type: "smoothCurveTo", mode: "relative", x2: 30, y2: 40, x: 50, y: 60 }),
    ).toBe("s30 40 50 60");
  });

  it("serializes QuadraticCurveTo", () => {
    expect(
      serializeSegment({
        type: "quadraticCurveTo",
        mode: "absolute",
        x1: 10,
        y1: 20,
        x: 50,
        y: 60,
      }),
    ).toBe("Q10 20 50 60");
  });

  it("serializes relative QuadraticCurveTo in lowercase", () => {
    expect(
      serializeSegment({
        type: "quadraticCurveTo",
        mode: "relative",
        x1: 10,
        y1: 20,
        x: 50,
        y: 60,
      }),
    ).toBe("q10 20 50 60");
  });

  it("serializes SmoothQuadraticCurveTo", () => {
    expect(
      serializeSegment({ type: "smoothQuadraticCurveTo", mode: "absolute", x: 50, y: 60 }),
    ).toBe("T50 60");
  });

  it("serializes relative SmoothQuadraticCurveTo in lowercase", () => {
    expect(
      serializeSegment({ type: "smoothQuadraticCurveTo", mode: "relative", x: 50, y: 60 }),
    ).toBe("t50 60");
  });

  it("serializes EllipticalArcTo with bare flags", () => {
    expect(
      serializeSegment({
        type: "ellipticalArcTo",
        mode: "absolute",
        rx: 25,
        ry: 25,
        xAxisRotation: 45,
        largeArcFlag: 1,
        sweepFlag: 0,
        x: 100,
        y: 200,
      }),
    ).toBe("A25 25 45 1 0 100 200");
  });

  it("serializes relative EllipticalArcTo in lowercase", () => {
    expect(
      serializeSegment({
        type: "ellipticalArcTo",
        mode: "relative",
        rx: 5,
        ry: 5,
        xAxisRotation: 0,
        largeArcFlag: 0,
        sweepFlag: 1,
        x: 10,
        y: 0,
      }),
    ).toBe("a5 5 0 0 1 10 0");
  });

  it("applies a custom precision to every argument", () => {
    expect(
      serializeSegment(
        {
          type: "curveTo",
          mode: "absolute",
          x1: 1.111,
          y1: 2.222,
          x2: 3.333,
          y2: 4.444,
          x: 5.555,
          y: 6.666,
        },
        1,
      ),
    ).toBe("C1.1 2.2 3.3 4.4 5.6 6.7");
  });
});

describe("serializePath", () => {
  it("returns an empty string for an empty path", () => {
    expect(serializePath([])).toBe("");
  });

  it("joins segments with a single space", () => {
    const segments: Segment[] = [
      { type: "moveTo", mode: "absolute", x: 0, y: 0 },
      { type: "horizontalLineTo", mode: "absolute", x: 10 },
      { type: "verticalLineTo", mode: "absolute", y: 10 },
      { type: "closePath" },
    ];
    expect(serializePath(segments)).toBe("M0 0 H10 V10 Z");
  });

  it("passes the precision through to each segment", () => {
    const segments: Segment[] = [
      { type: "moveTo", mode: "absolute", x: 1.234, y: 5.678 },
      { type: "lineTo", mode: "absolute", x: 9.876, y: 5.432 },
    ];
    expect(serializePath(segments, 1)).toBe("M1.2 5.7 L9.9 5.4");
  });

  it.each([
    ["M0 0 L10 0 L10 10 Z"],
    ["M 10 20 H 30 V 40 Z"],
    ["m10 20 l30 40 l-5 -5 z"],
    ["M0 0 C0 -50 100 -50 100 0 S200 50 200 0"],
    ["M0 0 Q50 -50 100 0 T200 0"],
    ["M10 20 30 40 50 60"],
    ["M8 0a8 8 0 100 16A8 8 0 008 0z"],
    [
      "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18a8 8 0 110-16 8 8 0 010 16z",
    ],
    ["M2.5 1.5a1 1 0 011-1h9a1 1 0 011 1v11a1 1 0 01-1 1h-9a1 1 0 01-1-1v-11z"],
  ])("round-trips %s through parsePath", (d) => {
    const segments = parsePath(d);
    expect(parsePath(serializePath(segments))).toEqual(segments);
  });
});
