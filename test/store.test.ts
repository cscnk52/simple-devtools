import { createStore } from "jotai";
import { describe, expect, it } from "vitest";

import {
  appendCommandAtom,
  clearPathAtom,
  deleteSegmentAtom,
  dragAnchorAtom,
  dragControlAtom,
  insertCommandAtom,
  reorderSegmentAtom,
  setParamAtom,
} from "@/state/actions";
import {
  canRedoAtom,
  canUndoAtom,
  parseErrorAtom,
  pathTextAtom,
  redoAtom,
  resolvedAtom,
  segmentsAtom,
  selectedIndexAtom,
  setPathTextAtom,
  undoAtom,
} from "@/state/editor";

function newStore(text?: string) {
  const store = createStore();
  if (text !== undefined) store.set(setPathTextAtom, text);
  return store;
}

describe("typing a path", () => {
  it("derives segments from the text", () => {
    const store = newStore("M0 0 L10 10");

    expect(store.get(pathTextAtom)).toBe("M0 0 L10 10");
    expect(store.get(parseErrorAtom)).toBeNull();
    expect(store.get(segmentsAtom)).toEqual([
      { type: "moveTo", mode: "absolute", x: 0, y: 0 },
      { type: "lineTo", mode: "absolute", x: 10, y: 10 },
    ]);
  });

  it("starts empty", () => {
    const store = createStore();

    expect(store.get(pathTextAtom)).toBe("");
    expect(store.get(segmentsAtom)).toEqual([]);
    expect(store.get(parseErrorAtom)).toBeNull();
    expect(store.get(selectedIndexAtom)).toBeNull();
    expect(store.get(canUndoAtom)).toBe(false);
    expect(store.get(canRedoAtom)).toBe(false);
  });

  it("resolves the text into absolute geometry", () => {
    const store = newStore("m10 10 l10 0 l0 10");

    expect(store.get(resolvedAtom).map((r) => r.end)).toEqual([
      { x: 10, y: 10 },
      { x: 20, y: 10 },
      { x: 20, y: 20 },
    ]);
  });

  it("re-derives everything when the text changes", () => {
    const store = newStore("M0 0 L10 10");
    store.set(setPathTextAtom, "M0 0 L20 20 L30 30");

    expect(store.get(segmentsAtom)).toHaveLength(3);
    expect(store.get(resolvedAtom)[2].end).toEqual({ x: 30, y: 30 });
  });
});

describe("half-typed, invalid text", () => {
  it("sets a parse error and falls back to the last text that parsed", () => {
    const store = newStore("M0 0 L10 10");
    const valid = store.get(segmentsAtom);

    store.set(setPathTextAtom, "M0 0 L10 10 L");

    expect(store.get(pathTextAtom)).toBe("M0 0 L10 10 L");
    expect(store.get(parseErrorAtom)).toContain("expects 2 arguments");
    expect(store.get(segmentsAtom)).toEqual(valid);
  });

  it("skips past several invalid entries to find one that parses", () => {
    const store = newStore("M0 0 L10 10");
    const valid = store.get(segmentsAtom);

    store.set(setPathTextAtom, "M0 0 L10 10 C");
    store.set(setPathTextAtom, "M0 0 L10 10 C1");
    store.set(setPathTextAtom, "M0 0 L10 10 C1 2");

    expect(store.get(parseErrorAtom)).not.toBeNull();
    expect(store.get(segmentsAtom)).toEqual(valid);
  });

  it("recovers once the command is finished", () => {
    const store = newStore("M0 0 L10 10");
    store.set(setPathTextAtom, "M0 0 L10 10 C");
    store.set(setPathTextAtom, "M0 0 L10 10 C1 2 3 4 5 6");

    expect(store.get(parseErrorAtom)).toBeNull();
    expect(store.get(segmentsAtom)).toHaveLength(3);
  });

  it("falls back to an empty path when nothing has ever parsed", () => {
    const store = newStore("nonsense");

    expect(store.get(parseErrorAtom)).not.toBeNull();
    expect(store.get(segmentsAtom)).toEqual([]);
  });
});

describe("a canvas drag", () => {
  it("collapses into a single undo step", () => {
    const store = newStore("M0 0 L10 10");
    const before = store.get(pathTextAtom);

    store.set(dragAnchorAtom, 1, { x: 12, y: 12 }, { newStep: true });
    store.set(dragAnchorAtom, 1, { x: 15, y: 14 }, { newStep: false });
    store.set(dragAnchorAtom, 1, { x: 18, y: 16 }, { newStep: false });
    store.set(dragAnchorAtom, 1, { x: 20, y: 20 }, { newStep: false });

    expect(store.get(pathTextAtom)).toBe("M0 0 L20 20");

    store.set(undoAtom);
    expect(store.get(pathTextAtom)).toBe(before);
    expect(store.get(canUndoAtom)).toBe(true);
  });

  it("redoes back to the end of the drag", () => {
    const store = newStore("M0 0 L10 10");

    store.set(dragAnchorAtom, 1, { x: 12, y: 12 }, { newStep: true });
    store.set(dragAnchorAtom, 1, { x: 20, y: 20 }, { newStep: false });
    store.set(undoAtom);
    store.set(redoAtom);

    expect(store.get(pathTextAtom)).toBe("M0 0 L20 20");
    expect(store.get(canRedoAtom)).toBe(false);
  });

  it("records two undo steps for two separate drags", () => {
    const store = newStore("M0 0 L10 10");

    store.set(dragAnchorAtom, 1, { x: 20, y: 20 }, { newStep: true });
    store.set(dragAnchorAtom, 1, { x: 22, y: 22 }, { newStep: false });
    store.set(dragAnchorAtom, 1, { x: 30, y: 30 }, { newStep: true });
    store.set(dragAnchorAtom, 1, { x: 40, y: 40 }, { newStep: false });

    store.set(undoAtom);
    expect(store.get(pathTextAtom)).toBe("M0 0 L22 22");
    store.set(undoAtom);
    expect(store.get(pathTextAtom)).toBe("M0 0 L10 10");
  });

  it("re-anchors the relative tail through the store", () => {
    const store = newStore("m10 10 l10 0 l0 10 l10 0");

    store.set(dragAnchorAtom, 1, { x: 30, y: 30 }, { newStep: true });

    expect(store.get(resolvedAtom).map((r) => r.end)).toEqual([
      { x: 10, y: 10 },
      { x: 30, y: 30 },
      { x: 20, y: 20 },
      { x: 30, y: 20 },
    ]);
  });

  it("collapses a control-point drag the same way", () => {
    const store = newStore("M0 0 C10 0 20 10 30 10");

    store.set(dragControlAtom, 1, "c2", { x: 22, y: 12 }, { newStep: true });
    store.set(dragControlAtom, 1, "c2", { x: 25, y: 15 }, { newStep: false });

    expect(store.get(pathTextAtom)).toBe("M0 0 C10 0 25 15 30 10");
    store.set(undoAtom);
    expect(store.get(pathTextAtom)).toBe("M0 0 C10 0 20 10 30 10");
  });

  it("collapses a burst of typing in a number field", () => {
    const store = newStore("M0 0 L10 10");

    store.set(setParamAtom, 1, "x", 1, { newStep: true });
    store.set(setParamAtom, 1, "x", 12, { newStep: false });
    store.set(setParamAtom, 1, "x", 125, { newStep: false });

    expect(store.get(pathTextAtom)).toBe("M0 0 L125 10");
    store.set(undoAtom);
    expect(store.get(pathTextAtom)).toBe("M0 0 L10 10");
  });
});

describe("undo and redo", () => {
  it("restores the exact path text", () => {
    const store = createStore();
    const texts = ["M0 0", "M0 0 L10 10", "M0 0 L10 10 L20 0"];
    for (const text of texts) store.set(setPathTextAtom, text);

    store.set(undoAtom);
    expect(store.get(pathTextAtom)).toBe(texts[1]);
    store.set(undoAtom);
    expect(store.get(pathTextAtom)).toBe(texts[0]);
    store.set(undoAtom);
    expect(store.get(pathTextAtom)).toBe("");
    expect(store.get(canUndoAtom)).toBe(false);

    store.set(undoAtom);
    expect(store.get(pathTextAtom)).toBe("");

    for (const text of texts) {
      store.set(redoAtom);
      expect(store.get(pathTextAtom)).toBe(text);
    }
    expect(store.get(canRedoAtom)).toBe(false);
  });

  it("discards the redo branch after a new edit", () => {
    const store = newStore("M0 0 L10 10");
    store.set(setPathTextAtom, "M0 0 L20 20");
    store.set(undoAtom);
    expect(store.get(canRedoAtom)).toBe(true);

    store.set(setPathTextAtom, "M0 0 L30 30");

    expect(store.get(canRedoAtom)).toBe(false);
    expect(store.get(pathTextAtom)).toBe("M0 0 L30 30");
  });

  it("clamps a selection that undo makes invalid", () => {
    const store = newStore("M0 0 L10 10 L20 20");
    store.set(selectedIndexAtom, 2);
    store.set(setPathTextAtom, "M0 0");

    store.set(undoAtom);
    expect(store.get(selectedIndexAtom)).toBe(2);

    store.set(redoAtom);
    expect(store.get(selectedIndexAtom)).toBe(0);
  });
});

describe("appending and inserting commands", () => {
  it("selects the appended command", () => {
    const store = newStore("M0 0 L10 10");

    store.set(appendCommandAtom, "L");

    expect(store.get(selectedIndexAtom)).toBe(2);
    expect(store.get(segmentsAtom)).toHaveLength(3);
    expect(store.get(parseErrorAtom)).toBeNull();
  });

  it("scales the placeholder to the size of the path already drawn", () => {
    const small = newStore("M0 0 L10 10");
    small.set(appendCommandAtom, "L");
    expect(small.get(resolvedAtom)[2].end).toEqual({ x: 12, y: 10 });

    const large = newStore("M0 0 L1000 1000");
    large.set(appendCommandAtom, "L");
    expect(large.get(resolvedAtom)[2].end).toEqual({ x: 1200, y: 1000 });
  });

  it("appends onto an empty path", () => {
    const store = createStore();
    store.set(appendCommandAtom, "M");

    expect(store.get(pathTextAtom)).toBe("M10 10");
    expect(store.get(selectedIndexAtom)).toBe(0);
  });

  it("inserts after an index and selects the new command", () => {
    const store = newStore("M0 0 L10 10 L20 20");

    store.set(insertCommandAtom, 0, "L");

    expect(store.get(selectedIndexAtom)).toBe(1);
    expect(store.get(segmentsAtom)).toHaveLength(4);
    expect(store.get(resolvedAtom).map((r) => r.end)).toEqual([
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 10, y: 10 },
      { x: 20, y: 20 },
    ]);
  });

  it("reorders and follows the moved command with the selection", () => {
    const store = newStore("M0 0 L10 10 L20 0");

    store.set(reorderSegmentAtom, 1, 2);

    expect(store.get(selectedIndexAtom)).toBe(2);
    expect(store.get(pathTextAtom)).toBe("M0 0 L20 0 L10 10");
  });

  it("ignores a reorder to an out-of-range index", () => {
    const store = newStore("M0 0 L10 10");
    store.set(reorderSegmentAtom, 1, 5);

    expect(store.get(pathTextAtom)).toBe("M0 0 L10 10");
    expect(store.get(selectedIndexAtom)).toBeNull();
  });
});

describe("deleting a segment", () => {
  it("clamps the selection to the last remaining segment", () => {
    const store = newStore("M0 0 L10 10 L20 20");
    store.set(selectedIndexAtom, 2);

    store.set(deleteSegmentAtom, 2);

    expect(store.get(segmentsAtom)).toHaveLength(2);
    expect(store.get(selectedIndexAtom)).toBe(1);
  });

  it("clears the selection when the last segment goes", () => {
    const store = newStore("M0 0");
    store.set(selectedIndexAtom, 0);

    store.set(deleteSegmentAtom, 0);

    expect(store.get(segmentsAtom)).toEqual([]);
    expect(store.get(selectedIndexAtom)).toBeNull();
  });

  it("leaves a still-valid selection alone", () => {
    const store = newStore("M0 0 L10 10 L20 20");
    store.set(selectedIndexAtom, 0);

    store.set(deleteSegmentAtom, 2);

    expect(store.get(selectedIndexAtom)).toBe(0);
  });

  it("keeps the relative tail where it was", () => {
    const store = newStore("m10 10 l10 0 l0 10 l10 0");
    const before = store.get(resolvedAtom).map((r) => r.end);

    store.set(deleteSegmentAtom, 2);

    expect(store.get(resolvedAtom).map((r) => r.end)).toEqual([before[0], before[1], before[3]]);
  });

  it("is undoable as one step", () => {
    const store = newStore("M0 0 L10 10 L20 20");
    store.set(deleteSegmentAtom, 1);
    expect(store.get(pathTextAtom)).toBe("M0 0 L20 20");

    store.set(undoAtom);
    expect(store.get(pathTextAtom)).toBe("M0 0 L10 10 L20 20");
  });
});

describe("clearing the path", () => {
  it("empties the text, the segments and the selection", () => {
    const store = newStore("M0 0 L10 10 L20 20");
    store.set(selectedIndexAtom, 1);

    store.set(clearPathAtom);

    expect(store.get(pathTextAtom)).toBe("");
    expect(store.get(segmentsAtom)).toEqual([]);
    expect(store.get(resolvedAtom)).toEqual([]);
    expect(store.get(selectedIndexAtom)).toBeNull();
    expect(store.get(parseErrorAtom)).toBeNull();
  });

  it("is undoable", () => {
    const store = newStore("M0 0 L10 10");
    store.set(clearPathAtom);

    store.set(undoAtom);

    expect(store.get(pathTextAtom)).toBe("M0 0 L10 10");
    expect(store.get(segmentsAtom)).toHaveLength(2);
  });
});

describe("a full editing session through the store", () => {
  it("goes from typing to dragging to appending to undoing", () => {
    const store = createStore();

    store.set(setPathTextAtom, "M4 4 L12 4 L12 12 Z");
    expect(store.get(parseErrorAtom)).toBeNull();

    store.set(dragAnchorAtom, 2, { x: 16, y: 16 }, { newStep: true });
    store.set(dragAnchorAtom, 2, { x: 20, y: 20 }, { newStep: false });
    expect(store.get(pathTextAtom)).toBe("M4 4 L12 4 L20 20 Z");

    store.set(appendCommandAtom, "C");
    expect(store.get(selectedIndexAtom)).toBe(4);
    expect(store.get(segmentsAtom)).toHaveLength(5);

    store.set(deleteSegmentAtom, 4);
    expect(store.get(pathTextAtom)).toBe("M4 4 L12 4 L20 20 Z");

    store.set(undoAtom);
    store.set(undoAtom);
    store.set(undoAtom);
    expect(store.get(pathTextAtom)).toBe("M4 4 L12 4 L12 12 Z");
    expect(store.get(canUndoAtom)).toBe(true);
  });
});
