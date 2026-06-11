import { describe, expect, it } from "vitest";

import { parse } from "./parser";

describe("parse", () => {
  it("parse MoveTo", () => {
    expect(
      parse([
        { kind: "command", value: "M" },
        { kind: "number", value: 10 },
        { kind: "number", value: 20 },
      ]),
    ).toEqual([
      {
        kind: "moveTo",
        mode: "absolute",
        x: 10,
        y: 20,
      },
    ]);
  });

  it("parse relative MoveTo", () => {
    expect(
      parse([
        { kind: "command", value: "m" },
        { kind: "number", value: 10 },
        { kind: "number", value: 20 },
      ]),
    ).toEqual([
      {
        kind: "moveTo",
        mode: "relative",
        x: 10,
        y: 20,
      },
    ]);
  });

  it("parse LineTo", () => {
    expect(
      parse([
        { kind: "command", value: "L" },
        { kind: "number", value: 30 },
        { kind: "number", value: 40 },
      ]),
    ).toEqual([
      {
        kind: "lineTo",
        mode: "absolute",
        x: 30,
        y: 40,
      },
    ]);
  });

  it("parse HorizontalLineTo", () => {
    expect(
      parse([
        { kind: "command", value: "H" },
        { kind: "number", value: 50 },
      ]),
    ).toEqual([
      {
        kind: "horizontalLineTo",
        mode: "absolute",
        x: 50,
      },
    ]);
  });

  it("parse VerticalLineTo", () => {
    expect(
      parse([
        { kind: "command", value: "V" },
        { kind: "number", value: 60 },
      ]),
    ).toEqual([
      {
        kind: "verticalLineTo",
        mode: "absolute",
        y: 60,
      },
    ]);
  });

  it("parse ClosePath", () => {
    expect(parse([{ kind: "command", value: "Z" }])).toEqual([
      {
        kind: "closePath",
      },
    ]);
  });

  it("parse CurveTo", () => {
    expect(
      parse([
        { kind: "command", value: "C" },
        { kind: "number", value: 10 },
        { kind: "number", value: 20 },
        { kind: "number", value: 30 },
        { kind: "number", value: 40 },
        { kind: "number", value: 50 },
        { kind: "number", value: 60 },
      ]),
    ).toEqual([
      {
        kind: "curveTo",
        mode: "absolute",
        x1: 10,
        y1: 20,
        x2: 30,
        y2: 40,
        x: 50,
        y: 60,
      },
    ]);
  });

  it("parse SmoothCurveTo", () => {
    expect(
      parse([
        { kind: "command", value: "S" },
        { kind: "number", value: 30 },
        { kind: "number", value: 40 },
        { kind: "number", value: 50 },
        { kind: "number", value: 60 },
      ]),
    ).toEqual([
      {
        kind: "smoothCurveTo",
        mode: "absolute",
        x2: 30,
        y2: 40,
        x: 50,
        y: 60,
      },
    ]);
  });

  it("parse QuadraticCurveTo", () => {
    expect(
      parse([
        { kind: "command", value: "Q" },
        { kind: "number", value: 10 },
        { kind: "number", value: 20 },
        { kind: "number", value: 50 },
        { kind: "number", value: 60 },
      ]),
    ).toEqual([
      {
        kind: "quadraticCurveTo",
        mode: "absolute",
        x1: 10,
        y1: 20,
        x: 50,
        y: 60,
      },
    ]);
  });

  it("parse SmoothQuadraticCurveTo", () => {
    expect(
      parse([
        { kind: "command", value: "T" },
        { kind: "number", value: 50 },
        { kind: "number", value: 60 },
      ]),
    ).toEqual([
      {
        kind: "smoothQuadraticCurveTo",
        mode: "absolute",
        x: 50,
        y: 60,
      },
    ]);
  });

  it("parse EllipticalArcTo", () => {
    expect(
      parse([
        { kind: "command", value: "A" },
        { kind: "number", value: 25 },
        { kind: "number", value: 25 },
        { kind: "number", value: 45 },
        { kind: "number", value: 1 },
        { kind: "number", value: 0 },
        { kind: "number", value: 100 },
        { kind: "number", value: 200 },
      ]),
    ).toEqual([
      {
        kind: "ellipticalArcTo",
        mode: "absolute",
        rx: 25,
        ry: 25,
        xAxisRotation: 45,
        largeArcFlag: 1,
        sweepFlag: 0,
        x: 100,
        y: 200,
      },
    ]);
  });
});
