import { describe, expect, it } from "vitest";

import { lexer } from "./lexer";

describe("lexer", () => {
  it("lexes move command", () => {
    expect(lexer("M 10 20")).toEqual([
      { kind: "command", value: "M" },
      { kind: "number", value: 10 },
      { kind: "number", value: 20 },
    ]);
  });

  it("lexes relative commands", () => {
    expect(lexer("m 10 20 l 30 40")).toEqual([
      { kind: "command", value: "m" },
      { kind: "number", value: 10 },
      { kind: "number", value: 20 },
      { kind: "command", value: "l" },
      { kind: "number", value: 30 },
      { kind: "number", value: 40 },
    ]);
  });

  it("ignores commas and whitespace", () => {
    expect(lexer("M10,20 L30,40")).toEqual([
      { kind: "command", value: "M" },
      { kind: "number", value: 10 },
      { kind: "number", value: 20 },
      { kind: "command", value: "L" },
      { kind: "number", value: 30 },
      { kind: "number", value: 40 },
    ]);
  });

  it("lexes decimal numbers", () => {
    expect(lexer("M 1.5 .5")).toEqual([
      { kind: "command", value: "M" },
      { kind: "number", value: 1.5 },
      { kind: "number", value: 0.5 },
    ]);
  });

  it("lexes signed numbers", () => {
    expect(lexer("M -10 +20")).toEqual([
      { kind: "command", value: "M" },
      { kind: "number", value: -10 },
      { kind: "number", value: 20 },
    ]);
  });

  it("lexes scientific notation", () => {
    expect(lexer("M 1e2 -3.5e-1")).toEqual([
      { kind: "command", value: "M" },
      { kind: "number", value: 100 },
      { kind: "number", value: -0.35 },
    ]);
  });

  it("lexes arc commands", () => {
    expect(lexer("A 30 50 0 1 0 100 100")).toEqual([
      { kind: "command", value: "A" },
      { kind: "number", value: 30 },
      { kind: "number", value: 50 },
      { kind: "number", value: 0 },
      { kind: "number", value: 1 },
      { kind: "number", value: 0 },
      { kind: "number", value: 100 },
      { kind: "number", value: 100 },
    ]);
  });

  it("lexes close path", () => {
    expect(lexer("Z")).toEqual([{ kind: "command", value: "Z" }]);
  });

  it("point", () => {
    expect(lexer("M.5.5")).toEqual([
      { kind: "command", value: "M" },
      { kind: "number", value: 0.5 },
      { kind: "number", value: 0.5 },
    ]);
  });

  it("lexes numbers running into each other", () => {
    expect(lexer("M10-20.5-.5")).toEqual([
      { kind: "command", value: "M" },
      { kind: "number", value: 10 },
      { kind: "number", value: -20.5 },
      { kind: "number", value: -0.5 },
    ]);
  });

  it("lexes compact arc flags", () => {
    expect(lexer("a1 1 0 011 1")).toEqual([
      { kind: "command", value: "a" },
      { kind: "number", value: 1 },
      { kind: "number", value: 1 },
      { kind: "number", value: 0 },
      { kind: "number", value: 0 },
      { kind: "number", value: 1 },
      { kind: "number", value: 1 },
      { kind: "number", value: 1 },
    ]);
  });

  it("lexes compact arc flags on a repeated arc", () => {
    expect(lexer("a5 5 0 1150 0 5 5 0 0130 0")).toEqual([
      { kind: "command", value: "a" },
      { kind: "number", value: 5 },
      { kind: "number", value: 5 },
      { kind: "number", value: 0 },
      { kind: "number", value: 1 },
      { kind: "number", value: 1 },
      { kind: "number", value: 50 },
      { kind: "number", value: 0 },
      { kind: "number", value: 5 },
      { kind: "number", value: 5 },
      { kind: "number", value: 0 },
      { kind: "number", value: 0 },
      { kind: "number", value: 1 },
      { kind: "number", value: 30 },
      { kind: "number", value: 0 },
    ]);
  });

  it("lexes an empty path", () => {
    expect(lexer("")).toEqual([]);
    expect(lexer("   ")).toEqual([]);
  });

  it("rejects a path not starting with a command", () => {
    expect(() => lexer("10 20")).toThrow(SyntaxError);
  });

  it("rejects unknown characters", () => {
    expect(() => lexer("M 10 x")).toThrow(SyntaxError);
  });
});
