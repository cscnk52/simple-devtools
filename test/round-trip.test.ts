import { describe, expect, it } from "vitest";

import { bounds, flattenSegment, resolve } from "@/utils/geometry";
import { type Segment, parsePath, serializePath, tryParsePath } from "@/utils/parser";

/** text -> segments -> text -> segments, the loop the editor runs on every edit. */
function roundTrip(d: string): { first: Segment[]; text: string; second: Segment[] } {
  const first = parsePath(d);
  const text = serializePath(first);
  return { first, text, second: parsePath(text) };
}

function ends(segments: readonly Segment[]) {
  return resolve(segments).map((r) => r.end);
}

function controlPoints(segments: readonly Segment[]) {
  return resolve(segments).flatMap((r) => r.controls.map((c) => c.point));
}

const CORPUS: Record<string, string> = {
  "minified icon path":
    "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z",
  "arcs with flag runs": "M10 10a1 1 0 011 1a5 5 0 10-2 3A2.5 2.5 0 0115 15z",
  "implicit repeated moveTo pairs": "M0 0 10 10 20 20 30 5",
  "implicit repeated lineTo and curveTo": "M0 0L1 1 2 2 3 3C4 4 5 5 6 6 7 7 8 8 9 9",
  "scientific notation": "M1e2 2e1L1.5e1 3e-1 -2.5E1 4e0",
  "all relative": "m10 10l10 0l0 10c1 1 2 2 3 3q1 1 2 2t3 3h5v5z",
  "multiple subpaths with several Z": "M0 0H10V10H0Z M20 0H30V10H20Z M40 0H50V10H40Z",
  "smooth chains": "M0 0C10 0 20 10 30 10S50 20 60 10S80 0 90 10 Q100 20 110 10T130 10",
  "negative and compact numbers": "M-.5-.5L.5.5-1.25 3.75",
  "vertical and horizontal mix": "M5 5H20V20H5V5Z",
};

describe("path text round trip", () => {
  for (const [name, d] of Object.entries(CORPUS)) {
    it(`preserves segments for ${name}`, () => {
      const { first, second } = roundTrip(d);
      expect(second).toEqual(first);
    });

    it(`preserves absolute geometry for ${name}`, () => {
      const { first, second } = roundTrip(d);
      expect(ends(second)).toEqual(ends(first));
      expect(controlPoints(second)).toEqual(controlPoints(first));
      expect(bounds(resolve(second))).toEqual(bounds(resolve(first)));
    });

    it(`is stable on a third pass for ${name}`, () => {
      const { text, second } = roundTrip(d);
      expect(serializePath(second)).toBe(text);
    });

    it(`flattens to identical per-segment geometry for ${name}`, () => {
      const { first, second } = roundTrip(d);
      const flatten = (segments: ReturnType<typeof resolve>) =>
        segments.map((segment) => flattenSegment(segment, { tolerance: 0.01 }));

      expect(flatten(resolve(second))).toEqual(flatten(resolve(first)));
    });
  }
});

describe("parsing details preserved across the round trip", () => {
  it("turns the extra pairs of a moveTo into lineTo, and keeps them as lineTo", () => {
    const { first, second } = roundTrip("M0 0 10 10 20 20");
    expect(first).toEqual([
      { type: "moveTo", mode: "absolute", x: 0, y: 0 },
      { type: "lineTo", mode: "absolute", x: 10, y: 10 },
      { type: "lineTo", mode: "absolute", x: 20, y: 20 },
    ]);
    expect(second).toEqual(first);
  });

  it("keeps the extra pairs of a relative moveTo relative", () => {
    const { first, second } = roundTrip("m5 5 10 10 20 20");
    expect(first).toEqual([
      { type: "moveTo", mode: "relative", x: 5, y: 5 },
      { type: "lineTo", mode: "relative", x: 10, y: 10 },
      { type: "lineTo", mode: "relative", x: 20, y: 20 },
    ]);
    expect(second).toEqual(first);
    expect(ends(first)).toEqual([
      { x: 5, y: 5 },
      { x: 15, y: 15 },
      { x: 35, y: 35 },
    ]);
  });

  it("splits an arc flag run into separate flags", () => {
    const { first, second, text } = roundTrip("M0 0a1 1 0 011 1");
    expect(first[1]).toEqual({
      type: "ellipticalArcTo",
      mode: "relative",
      rx: 1,
      ry: 1,
      xAxisRotation: 0,
      largeArcFlag: 0,
      sweepFlag: 1,
      x: 1,
      y: 1,
    });
    expect(text).toBe("M0 0 a1 1 0 0 1 1 1");
    expect(second).toEqual(first);
  });

  it("expands scientific notation into plain decimals", () => {
    const { first, text, second } = roundTrip("M1e2 2e1L1.5e1 3e-1");
    expect(first).toEqual([
      { type: "moveTo", mode: "absolute", x: 100, y: 20 },
      { type: "lineTo", mode: "absolute", x: 15, y: 0.3 },
    ]);
    expect(text).toBe("M100 20 L15 0.3");
    expect(second).toEqual(first);
  });

  it("keeps every closePath of a multi-subpath path", () => {
    const { first, second } = roundTrip("M0 0H10V10Z M20 0H30V10Z M40 0H50V10Z");
    expect(first.filter((s) => s.type === "closePath")).toHaveLength(3);
    expect(second).toEqual(first);
    expect(resolve(second).map((r) => r.subpathStart)).toEqual(
      resolve(first).map((r) => r.subpathStart),
    );
  });

  it("round trips an all-relative path without drifting", () => {
    const { first, second } = roundTrip("m10 10l10 0l0 10c1 1 2 2 3 3q1 1 2 2t3 3h5v5z");
    expect(second).toEqual(first);
    expect(second.every((s) => s.type === "closePath" || s.mode === "relative")).toBe(true);
    expect(ends(second)).toEqual(ends(first));
  });
});

describe("tryParsePath alongside the round trip", () => {
  it("reports ok for every corpus entry and for its serialization", () => {
    for (const d of Object.values(CORPUS)) {
      const parsed = tryParsePath(d);
      expect(parsed.ok).toBe(true);
      if (!parsed.ok) return;
      expect(tryParsePath(serializePath(parsed.segments)).ok).toBe(true);
    }
  });

  it("reports a message instead of throwing on a truncated command", () => {
    const result = tryParsePath("M0 0 L10");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toContain("expects 2 arguments");
  });

  it("rejects an arc flag that is not 0 or 1", () => {
    expect(tryParsePath("M0 0 A1 1 0 2 1 10 10").ok).toBe(false);
  });

  it("serializes anything it parses", () => {
    const result = tryParsePath("M0 0 A1 1 0 1 1 10 10");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(serializePath(result.segments)).toBe("M0 0 A1 1 0 1 1 10 10");
  });
});
