import { describe, expect, it } from "vitest";

import {
  appendCommand,
  createSegment,
  insertSegment,
  moveAnchor,
  moveControl,
  moveSegment,
  removeSegment,
  updateParam,
} from "@/utils/edit";
import { anchorHandles, controlHandles, resolve, tethers } from "@/utils/geometry";
import { type Segment, parsePath, serializePath } from "@/utils/parser";

function ends(segments: readonly Segment[]) {
  return resolve(segments).map((r) => r.end);
}

/** The absolute geometry the editor promises to leave alone, for segments `from`.. */
function tailEnds(segments: readonly Segment[], from: number) {
  return ends(segments).slice(from);
}

/** Every edit must leave text the parser accepts back into the same segments. */
function expectSerializable(segments: readonly Segment[]) {
  expect(parsePath(serializePath(segments))).toEqual(segments);
}

const RELATIVE_STAIRCASE = "m10 10 l10 0 l0 10 l10 0 l0 10";

describe("dragging an anchor in the middle of a relative path", () => {
  it("moves the dragged segment and re-anchors the one after it", () => {
    const segments = parsePath(RELATIVE_STAIRCASE);
    expect(ends(segments)).toEqual([
      { x: 10, y: 10 },
      { x: 20, y: 10 },
      { x: 20, y: 20 },
      { x: 30, y: 20 },
      { x: 30, y: 30 },
    ]);

    const edited = moveAnchor(segments, 2, { x: 25, y: 25 });

    expect(edited[2]).toEqual({ type: "lineTo", mode: "relative", x: 5, y: 15 });
    expect(edited[3]).toEqual({ type: "lineTo", mode: "relative", x: 5, y: -5 });
    expect(ends(edited)).toEqual([
      { x: 10, y: 10 },
      { x: 20, y: 10 },
      { x: 25, y: 25 },
      { x: 30, y: 20 },
      { x: 30, y: 30 },
    ]);
    expectSerializable(edited);
  });

  it("keeps every segment after the edited one exactly where it was", () => {
    const segments = parsePath(RELATIVE_STAIRCASE);
    const before = tailEnds(segments, 3);

    const edited = moveAnchor(segments, 2, { x: -40, y: 90 });

    expect(ends(edited)[2]).toEqual({ x: -40, y: 90 });
    expect(tailEnds(edited, 3)).toEqual(before);
  });

  it("leaves the segments before the edited one untouched", () => {
    const segments = parsePath(RELATIVE_STAIRCASE);
    const edited = moveAnchor(segments, 2, { x: 25, y: 25 });

    expect(edited.slice(0, 2)).toEqual(segments.slice(0, 2));
  });

  it("re-anchors a relative curve that follows the dragged segment", () => {
    const segments = parsePath("m0 0 l10 0 c5 -5 10 -5 15 0 l10 0");
    const before = tailEnds(segments, 2);

    const edited = moveAnchor(segments, 1, { x: 30, y: 20 });

    expect(ends(edited)[1]).toEqual({ x: 30, y: 20 });
    expect(tailEnds(edited, 2)).toEqual(before);
    expectSerializable(edited);
  });

  it("keeps an absolute tail put without needing to touch it", () => {
    const segments = parsePath("M0 0 L10 0 L20 0 L30 0");
    const before = tailEnds(segments, 2);

    const edited = moveAnchor(segments, 1, { x: 10, y: 50 });

    expect(edited.slice(2)).toEqual(segments.slice(2));
    expect(tailEnds(edited, 2)).toEqual(before);
  });

  it("only moves an H along its own axis", () => {
    const segments = parsePath("M0 0 H10 L20 20");
    const edited = moveAnchor(segments, 1, { x: 15, y: 999 });

    expect(edited[1]).toEqual({ type: "horizontalLineTo", mode: "absolute", x: 15 });
    expect(ends(edited)[1]).toEqual({ x: 15, y: 0 });
  });
});

describe("deleting a command from a relative path", () => {
  it("leaves the tail where it was", () => {
    const segments = parsePath(RELATIVE_STAIRCASE);
    const before = tailEnds(segments, 3);

    const edited = removeSegment(segments, 2);

    expect(edited).toHaveLength(4);
    expect(edited[2]).toEqual({ type: "lineTo", mode: "relative", x: 10, y: 10 });
    expect(tailEnds(edited, 2)).toEqual(before);
    expectSerializable(edited);
  });

  it("keeps the tail put when the deleted command is a curve", () => {
    const segments = parsePath("m0 0 l10 0 c5 -5 10 -5 15 0 l10 0 l0 10");
    const before = tailEnds(segments, 3);

    const edited = removeSegment(segments, 2);

    expect(tailEnds(edited, 2)).toEqual(before);
  });

  it("deletes the last command without disturbing anything", () => {
    const segments = parsePath(RELATIVE_STAIRCASE);
    const edited = removeSegment(segments, segments.length - 1);

    expect(edited).toEqual(segments.slice(0, -1));
  });
});

describe("inserting a command into a relative path", () => {
  it("leaves the tail where it was", () => {
    const segments = parsePath(RELATIVE_STAIRCASE);
    const before = tailEnds(segments, 2);

    const inserted: Segment = { type: "lineTo", mode: "absolute", x: 50, y: 50 };
    const edited = insertSegment(segments, 2, inserted);

    expect(edited).toHaveLength(6);
    expect(edited[2]).toEqual(inserted);
    expect(edited[3]).toEqual({ type: "lineTo", mode: "relative", x: -30, y: -30 });
    expect(tailEnds(edited, 3)).toEqual(before);
    expectSerializable(edited);
  });

  it("keeps the tail put when inserting a generated relative command", () => {
    const segments = parsePath(RELATIVE_STAIRCASE);
    const before = tailEnds(segments, 2);

    const created = createSegment("C", {
      start: resolve(segments)[1].end,
      mode: "relative",
      step: 6,
    });
    const edited = insertSegment(segments, 2, created);

    expect(edited[2]).toEqual(created);
    expect(tailEnds(edited, 3)).toEqual(before);
  });

  it("appends at the end without re-anchoring anything", () => {
    const segments = parsePath(RELATIVE_STAIRCASE);
    const edited = insertSegment(segments, segments.length, {
      type: "closePath",
    });

    expect(edited.slice(0, -1)).toEqual(segments);
    expect(ends(edited)[5]).toEqual({ x: 10, y: 10 });
  });
});

describe("building a path from scratch with appendCommand", () => {
  it("produces a path that parses and resolves sensibly", () => {
    let segments: Segment[] = [];
    segments = appendCommand(segments, "M");
    segments = appendCommand(segments, "L");
    segments = appendCommand(segments, "C", { step: 6 });
    segments = appendCommand(segments, "Q", { step: 6 });
    segments = appendCommand(segments, "A", { step: 4 });
    segments = appendCommand(segments, "Z");

    expect(segments).toEqual([
      { type: "moveTo", mode: "absolute", x: 10, y: 10 },
      { type: "lineTo", mode: "absolute", x: 20, y: 10 },
      {
        type: "curveTo",
        mode: "absolute",
        x1: 22,
        y1: 7,
        x2: 24,
        y2: 13,
        x: 26,
        y: 10,
      },
      { type: "quadraticCurveTo", mode: "absolute", x1: 29, y1: 7, x: 32, y: 10 },
      {
        type: "ellipticalArcTo",
        mode: "absolute",
        rx: 2,
        ry: 2,
        xAxisRotation: 0,
        largeArcFlag: 0,
        sweepFlag: 1,
        x: 36,
        y: 10,
      },
      { type: "closePath" },
    ]);

    const text = serializePath(segments);
    expect(text).toBe("M10 10 L20 10 C22 7 24 13 26 10 Q29 7 32 10 A2 2 0 0 1 36 10 Z");
    expect(parsePath(text)).toEqual(segments);

    expect(ends(segments)).toEqual([
      { x: 10, y: 10 },
      { x: 20, y: 10 },
      { x: 26, y: 10 },
      { x: 32, y: 10 },
      { x: 36, y: 10 },
      { x: 10, y: 10 },
    ]);
  });

  it("builds a relative path whose commands chain off each other", () => {
    let segments: Segment[] = [];
    segments = appendCommand(segments, "M", { mode: "relative", step: 5 });
    segments = appendCommand(segments, "H", { mode: "relative", step: 5 });
    segments = appendCommand(segments, "V", { mode: "relative", step: 5 });
    segments = appendCommand(segments, "T", { mode: "relative", step: 5 });

    expect(serializePath(segments)).toBe("m5 5 h5 v5 t5 0");
    expect(ends(segments)).toEqual([
      { x: 5, y: 5 },
      { x: 10, y: 5 },
      { x: 10, y: 10 },
      { x: 15, y: 10 },
    ]);
    expectSerializable(segments);
  });

  it("gives every appended command a handle on the canvas", () => {
    let segments: Segment[] = [];
    for (const command of ["M", "L", "C", "Q", "Z"] as const) {
      segments = appendCommand(segments, command, { step: 8 });
    }

    const resolved = resolve(segments);
    // one anchor per segment except the closePath
    expect(anchorHandles(resolved)).toHaveLength(4);
    // C contributes two control points, Q one
    expect(controlHandles(resolved)).toHaveLength(3);
    expect(controlHandles(resolved).every((h) => h.implied === false)).toBe(true);
    expect(tethers(resolved)).toHaveLength(4);
  });
});

describe("editing a curve's control point", () => {
  const CURVE_PATH = "M0 0 C10 0 20 10 30 10 L40 10";

  it("changes only that segment", () => {
    const segments = parsePath(CURVE_PATH);
    const edited = moveControl(segments, 1, "c1", { x: 5, y: -5 });

    expect(edited[0]).toEqual(segments[0]);
    expect(edited[2]).toEqual(segments[2]);
    expect(edited[1]).toEqual({
      type: "curveTo",
      mode: "absolute",
      x1: 5,
      y1: -5,
      x2: 20,
      y2: 10,
      x: 30,
      y: 10,
    });
  });

  it("leaves every anchor position untouched", () => {
    const segments = parsePath(CURVE_PATH);
    const edited = moveControl(segments, 1, "c2", { x: 25, y: 40 });

    expect(ends(edited)).toEqual(ends(segments));
    expectSerializable(edited);
  });

  it("converts to relative coordinates when the segment is relative", () => {
    const segments = parsePath("m0 0 c10 0 20 10 30 10");
    const edited = moveControl(segments, 1, "c1", { x: 5, y: -5 });

    expect(edited[1]).toEqual({
      type: "curveTo",
      mode: "relative",
      x1: 5,
      y1: -5,
      x2: 20,
      y2: 10,
      x: 30,
      y: 10,
    });
    expect(resolve(edited)[1].controls[0].point).toEqual({ x: 5, y: -5 });
  });

  it("refuses to move an implied control point", () => {
    const segments = parsePath("M0 0 C10 0 20 10 30 10 S50 20 60 10");
    expect(() => moveControl(segments, 2, "c1", { x: 0, y: 0 })).toThrow(TypeError);
  });
});

describe("an S following a C", () => {
  const SMOOTH_PATH = "M0 0 C10 0 20 10 30 10 S50 20 60 10";

  it("reflects the C's second control point into the S", () => {
    const segments = parsePath(SMOOTH_PATH);
    const resolved = resolve(segments);

    expect(resolved[1].controls[1]).toEqual({
      slot: "c2",
      point: { x: 20, y: 10 },
      implied: false,
    });
    expect(resolved[2].controls[0]).toEqual({
      slot: "c1",
      point: { x: 40, y: 10 },
      implied: true,
    });
  });

  it("moves the S's implied control point when the C's second control moves", () => {
    const segments = parsePath(SMOOTH_PATH);
    const edited = moveControl(segments, 1, "c2", { x: 25, y: 4 });
    const resolved = resolve(edited);

    // the S segment itself is untouched
    expect(edited[2]).toEqual(segments[2]);
    // but its implied control point is the reflection of the new one
    expect(resolved[2].controls[0].point).toEqual({ x: 35, y: 16 });
    expect(resolved[2].controls[0].implied).toBe(true);
    // and no anchor moved
    expect(ends(edited)).toEqual(ends(segments));
  });

  it("moves the implied control point when the C's endpoint is dragged", () => {
    const segments = parsePath(SMOOTH_PATH);
    const edited = moveAnchor(segments, 1, { x: 30, y: 30 });
    const resolved = resolve(edited);

    // reflect (20, 10) through the new current point (30, 30)
    expect(resolved[2].controls[0].point).toEqual({ x: 40, y: 50 });
  });

  it("falls back to the current point when the S does not follow a cubic", () => {
    const segments = parsePath("M0 0 L30 10 S50 20 60 10");
    expect(resolve(segments)[2].controls[0]).toEqual({
      slot: "c1",
      point: { x: 30, y: 10 },
      implied: true,
    });
  });

  it("propagates through a chain of S commands", () => {
    const segments = parsePath("M0 0 C10 0 20 10 30 10 S50 20 60 10 S80 0 90 10");
    const edited = moveControl(segments, 1, "c2", { x: 25, y: 4 });
    const resolved = resolve(edited);

    // first S: reflection of the edited control through (30, 10)
    expect(resolved[2].controls[0].point).toEqual({ x: 35, y: 16 });
    // second S: reflection of the first S's own c2 through (60, 10) — unchanged
    expect(resolved[3].controls[0].point).toEqual({ x: 70, y: 0 });
  });
});

describe("a multi-step edit session", () => {
  it("survives a drag, an insert, a param tweak, a reorder and a delete", () => {
    let segments = parsePath("m4 4 l8 0 l0 8 l-8 0 z");
    const closedAt = ends(segments)[4];

    segments = moveAnchor(segments, 1, { x: 16, y: 4 });
    segments = insertSegment(
      segments,
      2,
      createSegment("L", {
        start: { x: 16, y: 4 },
        mode: "relative",
        step: 4,
      }),
    );
    segments = updateParam(segments, 0, "x", 6);
    segments = moveSegment(segments, 5, 5);
    segments = removeSegment(segments, 2);

    expect(segments).toHaveLength(5);
    expectSerializable(segments);
    // the subpath still closes back onto its moveTo
    expect(ends(segments)[4]).toEqual({ x: 6, y: 4 });
    expect(closedAt).toEqual({ x: 4, y: 4 });
  });

  it("keeps text and segments in agreement at every step", () => {
    const steps: Segment[][] = [];
    let segments = parsePath("M0 0 C10 0 20 10 30 10 S50 20 60 10 Z");

    steps.push(segments);
    segments = moveControl(segments, 1, "c1", { x: 4, y: -4 });
    steps.push(segments);
    segments = moveAnchor(segments, 2, { x: 70, y: 20 });
    steps.push(segments);
    segments = appendCommand(segments, "L", { step: 5 });
    steps.push(segments);

    for (const step of steps) {
      expect(parsePath(serializePath(step))).toEqual(step);
    }
  });
});
