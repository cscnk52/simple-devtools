import { describe, expect, it } from "vitest";

import { parsePath } from "@/utils/parser";

import { anchorHandles, controlHandles, tethers } from "./handles";
import { resolve } from "./resolve";

describe("anchorHandles", () => {
  it("returns no handles for an empty path", () => {
    expect(anchorHandles(resolve([]))).toEqual([]);
  });

  it("emits one handle per segment with its id and segment index", () => {
    expect(anchorHandles(resolve(parsePath("M10 10 L20 20")))).toEqual([
      {
        id: "anchor:0",
        kind: "anchor",
        segmentIndex: 0,
        point: { x: 10, y: 10 },
        axis: "both",
      },
      {
        id: "anchor:1",
        kind: "anchor",
        segmentIndex: 1,
        point: { x: 20, y: 20 },
        axis: "both",
      },
    ]);
  });

  it("produces no anchor for a closePath", () => {
    const handles = anchorHandles(resolve(parsePath("M10 10 L20 20 Z")));

    expect(handles.map((h) => h.segmentIndex)).toEqual([0, 1]);
  });

  it("keeps the original segment index after skipping a closePath", () => {
    const handles = anchorHandles(resolve(parsePath("M0 0 L5 5 Z M10 10 L20 20")));

    expect(handles.map((h) => h.id)).toEqual(["anchor:0", "anchor:1", "anchor:3", "anchor:4"]);
  });

  it('uses axis "x" for H, "y" for V and "both" otherwise', () => {
    const handles = anchorHandles(resolve(parsePath("M10 20 H50 V60 h5 v5 L1 1")));

    expect(handles.map((h) => h.axis)).toEqual(["both", "x", "y", "x", "y", "both"]);
  });

  it("anchors a curve at its endpoint, not its control points", () => {
    const handles = anchorHandles(resolve(parsePath("M0 0 C10 0 20 10 30 10")));

    expect(handles[1].point).toEqual({ x: 30, y: 10 });
  });

  it("anchors relative segments at their absolute endpoints", () => {
    const handles = anchorHandles(resolve(parsePath("m10 10 l5 5")));

    expect(handles.map((h) => h.point)).toEqual([
      { x: 10, y: 10 },
      { x: 15, y: 15 },
    ]);
  });
});

describe("controlHandles", () => {
  it("returns no handles for a path without curves", () => {
    expect(controlHandles(resolve(parsePath("M0 0 L10 10 H20 V30 Z")))).toEqual([]);
  });

  it("emits both control points of a cubic with slot-suffixed ids", () => {
    expect(controlHandles(resolve(parsePath("M0 0 C10 0 20 10 30 10")))).toEqual([
      {
        id: "control:1:c1",
        kind: "control",
        segmentIndex: 1,
        slot: "c1",
        point: { x: 10, y: 0 },
        implied: false,
      },
      {
        id: "control:1:c2",
        kind: "control",
        segmentIndex: 1,
        slot: "c2",
        point: { x: 20, y: 10 },
        implied: false,
      },
    ]);
  });

  it("marks S's first control implied and its second explicit", () => {
    const handles = controlHandles(resolve(parsePath("M0 0 C10 0 20 10 30 10 S50 30 60 30")));

    expect(handles.slice(2)).toEqual([
      {
        id: "control:2:c1",
        kind: "control",
        segmentIndex: 2,
        slot: "c1",
        point: { x: 40, y: 10 },
        implied: true,
      },
      {
        id: "control:2:c2",
        kind: "control",
        segmentIndex: 2,
        slot: "c2",
        point: { x: 50, y: 30 },
        implied: false,
      },
    ]);
  });

  it("emits one explicit control for a quadratic", () => {
    expect(controlHandles(resolve(parsePath("M0 0 Q10 0 20 10")))).toEqual([
      {
        id: "control:1:c1",
        kind: "control",
        segmentIndex: 1,
        slot: "c1",
        point: { x: 10, y: 0 },
        implied: false,
      },
    ]);
  });

  it("marks T's only control implied", () => {
    const handles = controlHandles(resolve(parsePath("M0 0 Q10 0 20 10 T40 20")));

    expect(handles[1]).toEqual({
      id: "control:2:c1",
      kind: "control",
      segmentIndex: 2,
      slot: "c1",
      point: { x: 30, y: 20 },
      implied: true,
    });
  });

  it("emits no controls for an arc", () => {
    expect(controlHandles(resolve(parsePath("M10 10 a5 5 0 0 1 10 0")))).toEqual([]);
  });

  it("keeps ids unique across several curves", () => {
    const handles = controlHandles(resolve(parsePath("M0 0 C1 1 2 2 3 3 C4 4 5 5 6 6 Q7 7 8 8")));

    expect(handles.map((h) => h.id)).toEqual([
      "control:1:c1",
      "control:1:c2",
      "control:2:c1",
      "control:2:c2",
      "control:3:c1",
    ]);
  });
});

describe("tethers", () => {
  it("returns nothing for non-curve segments", () => {
    expect(tethers(resolve(parsePath("M0 0 L10 10 H20 V30 Z")))).toEqual([]);
  });

  it("returns nothing for an arc", () => {
    expect(tethers(resolve(parsePath("M10 10 a5 5 0 0 1 10 0")))).toEqual([]);
  });

  it("tethers a cubic's c1 to its start and c2 to its end", () => {
    expect(tethers(resolve(parsePath("M0 0 C10 0 20 10 30 10")))).toEqual([
      {
        id: "tether:1:c1",
        segmentIndex: 1,
        from: { x: 0, y: 0 },
        to: { x: 10, y: 0 },
      },
      {
        id: "tether:1:c2",
        segmentIndex: 1,
        from: { x: 30, y: 10 },
        to: { x: 20, y: 10 },
      },
    ]);
  });

  it("tethers an S the same way, using its reflected control point", () => {
    const guides = tethers(resolve(parsePath("M0 0 C10 0 20 10 30 10 S50 30 60 30")));

    expect(guides.slice(2)).toEqual([
      {
        id: "tether:2:c1",
        segmentIndex: 2,
        from: { x: 30, y: 10 },
        to: { x: 40, y: 10 },
      },
      {
        id: "tether:2:c2",
        segmentIndex: 2,
        from: { x: 60, y: 30 },
        to: { x: 50, y: 30 },
      },
    ]);
  });

  it("gives a quadratic two tethers to the same control point", () => {
    expect(tethers(resolve(parsePath("M0 0 Q10 0 20 10")))).toEqual([
      {
        id: "tether:1:in",
        segmentIndex: 1,
        from: { x: 0, y: 0 },
        to: { x: 10, y: 0 },
      },
      {
        id: "tether:1:out",
        segmentIndex: 1,
        from: { x: 20, y: 10 },
        to: { x: 10, y: 0 },
      },
    ]);
  });

  it("gives a T two tethers to its reflected control point", () => {
    const guides = tethers(resolve(parsePath("M0 0 Q10 0 20 10 T40 20")));

    expect(guides.slice(2)).toEqual([
      {
        id: "tether:2:in",
        segmentIndex: 2,
        from: { x: 20, y: 10 },
        to: { x: 30, y: 20 },
      },
      {
        id: "tether:2:out",
        segmentIndex: 2,
        from: { x: 40, y: 20 },
        to: { x: 30, y: 20 },
      },
    ]);
  });
});
