import { describe, expect, it } from "vitest";

import { canRedo, canUndo, commit, initHistory, redo, replace, undo } from "./history";

describe("initHistory", () => {
  it("starts with the given present and empty stacks", () => {
    expect(initHistory("a")).toEqual({ past: [], present: "a", future: [] });
  });

  it("keeps an object present by reference", () => {
    const present = { x: 1 };
    expect(initHistory(present).present).toBe(present);
  });
});

describe("commit", () => {
  it("pushes the old present onto the past", () => {
    expect(commit(initHistory("a"), "b")).toEqual({ past: ["a"], present: "b", future: [] });
  });

  it("accumulates several commits in order", () => {
    const history = commit(commit(commit(initHistory("a"), "b"), "c"), "d");
    expect(history).toEqual({ past: ["a", "b", "c"], present: "d", future: [] });
  });

  it("is a no-op when the value is unchanged", () => {
    const history = commit(initHistory("a"), "b");
    expect(commit(history, "b")).toBe(history);
  });

  it("compares by identity, not by structure", () => {
    const history = initHistory({ x: 1 });
    expect(commit(history, { x: 1 })).not.toBe(history);
  });

  it("clears the redo branch", () => {
    const history = undo(commit(initHistory("a"), "b"));
    expect(history.future).toEqual(["b"]);
    expect(commit(history, "c")).toEqual({ past: ["a"], present: "c", future: [] });
  });

  it("drops the oldest entry once the limit is exceeded", () => {
    const history = commit(commit(commit(initHistory("a"), "b"), "c", 2), "d", 2);
    expect(history).toEqual({ past: ["b", "c"], present: "d", future: [] });
  });

  it("keeps exactly `limit` past entries", () => {
    let history = initHistory(0);
    for (let i = 1; i <= 10; i++) history = commit(history, i, 3);

    expect(history.past).toEqual([7, 8, 9]);
    expect(history.present).toBe(10);
  });

  it("does not mutate the input history", () => {
    const history = initHistory("a");
    commit(history, "b");
    expect(history).toEqual({ past: [], present: "a", future: [] });
  });

  it("rejects a zero limit", () => {
    expect(() => commit(initHistory("a"), "b", 0)).toThrow(RangeError);
  });

  it("rejects a negative limit", () => {
    expect(() => commit(initHistory("a"), "b", -1)).toThrow(RangeError);
  });

  it("rejects a fractional limit", () => {
    expect(() => commit(initHistory("a"), "b", 1.5)).toThrow(RangeError);
  });

  it("rejects a non-finite limit", () => {
    expect(() => commit(initHistory("a"), "b", Infinity)).toThrow(RangeError);
  });
});

describe("replace", () => {
  it("changes the present without touching past or future", () => {
    const history = undo(commit(commit(initHistory("a"), "b"), "c"));
    const replaced = replace(history, "x");

    expect(replaced.present).toBe("x");
    expect(replaced.past).toEqual(history.past);
    expect(replaced.future).toEqual(history.future);
  });

  it("is a no-op when the value is unchanged", () => {
    const history = initHistory("a");
    expect(replace(history, "a")).toBe(history);
  });

  it("does not mutate the input history", () => {
    const history = commit(initHistory("a"), "b");
    replace(history, "c");
    expect(history.present).toBe("b");
  });
});

describe("undo", () => {
  it("steps back one entry", () => {
    expect(undo(commit(initHistory("a"), "b"))).toEqual({
      past: [],
      present: "a",
      future: ["b"],
    });
  });

  it("returns the history unchanged when there is nothing to undo", () => {
    const history = initHistory("a");
    expect(undo(history)).toBe(history);
  });

  it("stacks the most recent entry first in the future", () => {
    const history = undo(undo(commit(commit(initHistory("a"), "b"), "c")));
    expect(history).toEqual({ past: [], present: "a", future: ["b", "c"] });
  });
});

describe("redo", () => {
  it("steps forward one entry", () => {
    const history = undo(commit(initHistory("a"), "b"));
    expect(redo(history)).toEqual({ past: ["a"], present: "b", future: [] });
  });

  it("returns the history unchanged when there is nothing to redo", () => {
    const history = commit(initHistory("a"), "b");
    expect(redo(history)).toBe(history);
  });

  it("round-trips with undo", () => {
    const history = commit(commit(initHistory("a"), "b"), "c");
    expect(redo(undo(history))).toEqual(history);
  });

  it("round-trips repeated undos", () => {
    const history = commit(commit(commit(initHistory("a"), "b"), "c"), "d");
    expect(redo(redo(redo(undo(undo(undo(history))))))).toEqual(history);
  });
});

describe("canUndo", () => {
  it("is false for a fresh history", () => {
    expect(canUndo(initHistory("a"))).toBe(false);
  });

  it("is true once something is committed", () => {
    expect(canUndo(commit(initHistory("a"), "b"))).toBe(true);
  });

  it("is false again after undoing everything", () => {
    expect(canUndo(undo(commit(initHistory("a"), "b")))).toBe(false);
  });
});

describe("canRedo", () => {
  it("is false for a fresh history", () => {
    expect(canRedo(initHistory("a"))).toBe(false);
  });

  it("is false right after a commit", () => {
    expect(canRedo(commit(initHistory("a"), "b"))).toBe(false);
  });

  it("is true after an undo", () => {
    expect(canRedo(undo(commit(initHistory("a"), "b")))).toBe(true);
  });

  it("is false again after redoing everything", () => {
    expect(canRedo(redo(undo(commit(initHistory("a"), "b"))))).toBe(false);
  });
});
