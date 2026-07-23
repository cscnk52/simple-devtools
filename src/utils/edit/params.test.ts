import { describe, expect, it } from "vitest";

import { type BaseCommand, parsePath } from "@/utils/parser";

import {
  COMMAND_OF,
  FLAG_KEYS,
  PARAM_KEYS,
  SEGMENT_TYPE_OF,
  type SegmentType,
  commandLetter,
  params,
} from "./params";

const COMMANDS: BaseCommand[] = ["M", "L", "H", "V", "Z", "C", "S", "Q", "T", "A"];

describe("PARAM_KEYS", () => {
  it("has an entry for every segment type", () => {
    expect(Object.keys(PARAM_KEYS).sort()).toEqual(
      (Object.values(SEGMENT_TYPE_OF) as SegmentType[]).sort(),
    );
  });

  it("lists the arguments of each segment type in path order", () => {
    expect(PARAM_KEYS.moveTo).toEqual(["x", "y"]);
    expect(PARAM_KEYS.lineTo).toEqual(["x", "y"]);
    expect(PARAM_KEYS.horizontalLineTo).toEqual(["x"]);
    expect(PARAM_KEYS.verticalLineTo).toEqual(["y"]);
    expect(PARAM_KEYS.closePath).toEqual([]);
    expect(PARAM_KEYS.curveTo).toEqual(["x1", "y1", "x2", "y2", "x", "y"]);
    expect(PARAM_KEYS.smoothCurveTo).toEqual(["x2", "y2", "x", "y"]);
    expect(PARAM_KEYS.quadraticCurveTo).toEqual(["x1", "y1", "x", "y"]);
    expect(PARAM_KEYS.smoothQuadraticCurveTo).toEqual(["x", "y"]);
    expect(PARAM_KEYS.ellipticalArcTo).toEqual([
      "rx",
      "ry",
      "xAxisRotation",
      "largeArcFlag",
      "sweepFlag",
      "x",
      "y",
    ]);
  });
});

describe("FLAG_KEYS", () => {
  it("contains exactly the two arc flags", () => {
    expect([...FLAG_KEYS].sort()).toEqual(["largeArcFlag", "sweepFlag"]);
  });
});

describe("COMMAND_OF / SEGMENT_TYPE_OF", () => {
  it("covers all ten commands", () => {
    expect(Object.keys(SEGMENT_TYPE_OF).sort()).toEqual([...COMMANDS].sort());
  });

  it("round-trips command -> type -> command", () => {
    for (const command of COMMANDS) {
      expect(COMMAND_OF[SEGMENT_TYPE_OF[command]]).toBe(command);
    }
  });

  it("round-trips type -> command -> type", () => {
    for (const type of Object.keys(PARAM_KEYS) as SegmentType[]) {
      expect(SEGMENT_TYPE_OF[COMMAND_OF[type]]).toBe(type);
    }
  });
});

describe("commandLetter", () => {
  it("returns an uppercase letter for an absolute segment", () => {
    expect(commandLetter(parsePath("M1 2")[0])).toBe("M");
    expect(commandLetter(parsePath("M0 0 C1 2 3 4 5 6")[1])).toBe("C");
    expect(commandLetter(parsePath("M0 0 A5 6 7 0 1 8 9")[1])).toBe("A");
  });

  it("returns a lowercase letter for a relative segment", () => {
    expect(commandLetter(parsePath("m1 2")[0])).toBe("m");
    expect(commandLetter(parsePath("M0 0 h5")[1])).toBe("h");
    expect(commandLetter(parsePath("M0 0 t5 6")[1])).toBe("t");
  });

  it("returns Z for a closePath", () => {
    expect(commandLetter(parsePath("M0 0 z")[1])).toBe("Z");
  });
});

describe("params", () => {
  it("returns ordered pairs for a curveTo", () => {
    expect(params(parsePath("M0 0 C1 2 3 4 5 6")[1])).toEqual([
      ["x1", 1],
      ["y1", 2],
      ["x2", 3],
      ["y2", 4],
      ["x", 5],
      ["y", 6],
    ]);
  });

  it("returns ordered pairs for an ellipticalArcTo", () => {
    expect(params(parsePath("M0 0 A5 6 7 1 0 8 9")[1])).toEqual([
      ["rx", 5],
      ["ry", 6],
      ["xAxisRotation", 7],
      ["largeArcFlag", 1],
      ["sweepFlag", 0],
      ["x", 8],
      ["y", 9],
    ]);
  });

  it("returns the single argument of a horizontalLineTo", () => {
    expect(params(parsePath("M0 0 H12")[1])).toEqual([["x", 12]]);
  });

  it("returns the single argument of a verticalLineTo", () => {
    expect(params(parsePath("M0 0 V12")[1])).toEqual([["y", 12]]);
  });

  it("returns the raw values of a relative segment", () => {
    expect(params(parsePath("M10 10 l5 6")[1])).toEqual([
      ["x", 5],
      ["y", 6],
    ]);
  });

  it("returns an empty array for a closePath", () => {
    expect(params(parsePath("M0 0 Z")[1])).toEqual([]);
  });
});
