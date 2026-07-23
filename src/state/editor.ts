import { atom } from "jotai";

import { resolve } from "@/utils/geometry";
import {
  type History,
  canRedo as canRedoHistory,
  canUndo as canUndoHistory,
  commit,
  initHistory,
  redo as redoHistory,
  replace,
  undo as undoHistory,
} from "@/utils/history";
import { type Segment, serializePath, tryParsePath } from "@/utils/parser";

/**
 * The path string is the single source of truth; segments are derived from it.
 *
 * That keeps typing and structural editing on one code path — an edit
 * serializes back to text, and the text re-parses — so the textarea can never
 * disagree with the canvas.
 */
const pathHistoryAtom = atom<History<string>>(initHistory(""));

export const pathTextAtom = atom((get) => get(pathHistoryAtom).present);

/** Parse error for the current text, or `null` when it parses. */
export const parseErrorAtom = atom((get) => {
  const result = tryParsePath(get(pathTextAtom));
  return result.ok ? null : result.message;
});

/**
 * Segments for the current text, falling back to the most recent text that
 * parsed. Half-typed input is invalid most of the time, and blanking the
 * canvas on every keystroke is worse than showing a slightly stale path
 * alongside the error.
 */
export const segmentsAtom = atom<Segment[]>((get) => {
  const history = get(pathHistoryAtom);

  const current = tryParsePath(history.present);
  if (current.ok) return current.segments;

  for (let i = history.past.length - 1; i >= 0; i--) {
    const previous = tryParsePath(history.past[i]);
    if (previous.ok) return previous.segments;
  }

  return [];
});

export const resolvedAtom = atom((get) => resolve(get(segmentsAtom)));

/** Index of the selected segment, or `null`. */
export const selectedIndexAtom = atom<number | null>(null);

export const canUndoAtom = atom((get) => canUndoHistory(get(pathHistoryAtom)));
export const canRedoAtom = atom((get) => canRedoHistory(get(pathHistoryAtom)));

export interface WriteOptions {
  /**
   * Whether this write starts a new undo step. Default `true`.
   *
   * Continuation frames of one gesture — the moves within a drag, the
   * keystrokes within a burst of typing — pass `false` so the whole gesture
   * collapses into a single undo entry.
   */
  newStep?: boolean;
}

export const setPathTextAtom = atom(null, (get, set, text: string, options: WriteOptions = {}) => {
  const history = get(pathHistoryAtom);
  set(pathHistoryAtom, options.newStep === false ? replace(history, text) : commit(history, text));
});

/** Write edited segments back to the path text. */
export const setSegmentsAtom = atom(
  null,
  (_get, set, segments: readonly Segment[], options: WriteOptions = {}) => {
    set(setPathTextAtom, serializePath(segments), options);
  },
);

/** Drop a selection that no longer points at a segment. */
export const clampSelectionAtom = atom(null, (get, set) => {
  const selected = get(selectedIndexAtom);
  if (selected === null) return;

  const count = get(segmentsAtom).length;
  if (selected >= count) set(selectedIndexAtom, count === 0 ? null : count - 1);
});

export const undoAtom = atom(null, (get, set) => {
  set(pathHistoryAtom, undoHistory(get(pathHistoryAtom)));
  set(clampSelectionAtom);
});

export const redoAtom = atom(null, (get, set) => {
  set(pathHistoryAtom, redoHistory(get(pathHistoryAtom)));
  set(clampSelectionAtom);
});
