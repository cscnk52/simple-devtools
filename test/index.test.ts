import { describe, it, expect } from "vitest";

function sum(a: number, b: number): number {
  return a + b;
}

describe("sum", () => {
  it("adds two positive numbers", () => {
    expect(sum(2, 3)).toBe(5);
  });

  it("handles negative numbers", () => {
    expect(sum(-2, 5)).toBe(3);
  });

  it("returns 0 when both inputs are 0", () => {
    expect(sum(0, 0)).toBe(0);
  });
});
