import { describe, expect, it } from "vitest";

import { parsePath } from "./index";

describe("parsePath", () => {
  it("parses an empty path", () => {
    expect(parsePath("")).toEqual([]);
  });

  it("parses a minified icon path", () => {
    expect(parsePath("M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z")).toEqual(
      [
        { type: "moveTo", mode: "absolute", x: 12, y: 2 },
        {
          type: "curveTo",
          mode: "absolute",
          x1: 6.48,
          y1: 2,
          x2: 2,
          y2: 6.48,
          x: 2,
          y: 12,
        },
        {
          type: "smoothCurveTo",
          mode: "relative",
          x2: 4.48,
          y2: 10,
          x: 10,
          y: 10,
        },
        {
          type: "smoothCurveTo",
          mode: "relative",
          x2: 10,
          y2: -4.48,
          x: 10,
          y: -10,
        },
        {
          type: "smoothCurveTo",
          mode: "absolute",
          x2: 17.52,
          y2: 2,
          x: 12,
          y: 2,
        },
        { type: "closePath" },
      ],
    );
  });

  it("parses a path with arcs", () => {
    expect(parsePath("M10 10a5 5 0 0110 0z")).toEqual([
      { type: "moveTo", mode: "absolute", x: 10, y: 10 },
      {
        type: "ellipticalArcTo",
        mode: "relative",
        rx: 5,
        ry: 5,
        xAxisRotation: 0,
        largeArcFlag: 0,
        sweepFlag: 1,
        x: 10,
        y: 0,
      },
      { type: "closePath" },
    ]);
  });
});
