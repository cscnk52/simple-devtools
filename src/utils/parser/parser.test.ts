import { describe, expect, it } from "vitest";

import { lexer } from "./lexer";
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
        type: "moveTo",
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
        type: "moveTo",
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
        type: "lineTo",
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
        type: "horizontalLineTo",
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
        type: "verticalLineTo",
        mode: "absolute",
        y: 60,
      },
    ]);
  });

  it("parse ClosePath", () => {
    expect(parse([{ kind: "command", value: "Z" }])).toEqual([
      {
        type: "closePath",
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
        type: "curveTo",
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
        type: "smoothCurveTo",
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
        type: "quadraticCurveTo",
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
        type: "smoothQuadraticCurveTo",
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
        type: "ellipticalArcTo",
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

  it("parses an empty token list", () => {
    expect(parse([])).toEqual([]);
  });

  it("treats extra MoveTo arguments as implicit LineTo", () => {
    expect(parse(lexer("M 10 20 30 40 50 60"))).toEqual([
      { type: "moveTo", mode: "absolute", x: 10, y: 20 },
      { type: "lineTo", mode: "absolute", x: 30, y: 40 },
      { type: "lineTo", mode: "absolute", x: 50, y: 60 },
    ]);
  });

  it("keeps the mode of an implicit LineTo", () => {
    expect(parse(lexer("m 10 20 30 40"))).toEqual([
      { type: "moveTo", mode: "relative", x: 10, y: 20 },
      { type: "lineTo", mode: "relative", x: 30, y: 40 },
    ]);
  });

  it("repeats a command with extra arguments", () => {
    expect(parse(lexer("L 10 20 30 40"))).toEqual([
      { type: "lineTo", mode: "absolute", x: 10, y: 20 },
      { type: "lineTo", mode: "absolute", x: 30, y: 40 },
    ]);
  });

  it("repeats an arc with extra arguments", () => {
    expect(parse(lexer("a5 5 0 1150 0 5 5 0 0130 0"))).toEqual([
      {
        type: "ellipticalArcTo",
        mode: "relative",
        rx: 5,
        ry: 5,
        xAxisRotation: 0,
        largeArcFlag: 1,
        sweepFlag: 1,
        x: 50,
        y: 0,
      },
      {
        type: "ellipticalArcTo",
        mode: "relative",
        rx: 5,
        ry: 5,
        xAxisRotation: 0,
        largeArcFlag: 0,
        sweepFlag: 1,
        x: 30,
        y: 0,
      },
    ]);
  });

  it("parses several commands in one path", () => {
    expect(parse(lexer("M0 0H10V10Z"))).toEqual([
      { type: "moveTo", mode: "absolute", x: 0, y: 0 },
      { type: "horizontalLineTo", mode: "absolute", x: 10 },
      { type: "verticalLineTo", mode: "absolute", y: 10 },
      { type: "closePath" },
    ]);
  });

  it("rejects a path not starting with a command", () => {
    expect(() => parse([{ kind: "number", value: 10 }])).toThrow(SyntaxError);
  });

  it("rejects missing arguments", () => {
    expect(() => parse(lexer("M 10"))).toThrow(SyntaxError);
  });

  it("rejects arguments after ClosePath", () => {
    expect(() => parse(lexer("M 0 0 Z 10"))).toThrow(SyntaxError);
  });

  it("rejects an out of range arc flag", () => {
    expect(() =>
      parse([
        { kind: "command", value: "A" },
        { kind: "number", value: 25 },
        { kind: "number", value: 25 },
        { kind: "number", value: 0 },
        { kind: "number", value: 2 },
        { kind: "number", value: 0 },
        { kind: "number", value: 100 },
        { kind: "number", value: 200 },
      ]),
    ).toThrow(SyntaxError);
  });
});
