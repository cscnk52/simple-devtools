import { atom } from "jotai";

import {
  appendCommand,
  insertSegment,
  moveAnchor,
  moveControl,
  moveSegment,
  removeSegment,
  updateParam,
  type ParamKey,
} from "@/utils/edit";
import { type ControlSlot, type Point, endPoint } from "@/utils/geometry";
import type { BaseCommand, Segment } from "@/utils/parser";

import {
  type WriteOptions,
  clampSelectionAtom,
  segmentsAtom,
  selectedIndexAtom,
  setSegmentsAtom,
} from "./editor";

/**
 * Write atoms wrapping the pure edit operations.
 *
 * They deliberately do not catch: the operations throw only on inputs the UI
 * cannot produce (an index with no handle, a control point that is implied),
 * so a throw here is a bug worth surfacing rather than swallowing.
 */

export const dragAnchorAtom = atom(
  null,
  (get, set, index: number, to: Point, options: WriteOptions = {}) => {
    set(setSegmentsAtom, moveAnchor(get(segmentsAtom), index, to), options);
  },
);

export const dragControlAtom = atom(
  null,
  (get, set, index: number, slot: ControlSlot, to: Point, options: WriteOptions = {}) => {
    set(setSegmentsAtom, moveControl(get(segmentsAtom), index, slot, to), options);
  },
);

export const setParamAtom = atom(
  null,
  (get, set, index: number, key: ParamKey, value: number, options: WriteOptions = {}) => {
    set(setSegmentsAtom, updateParam(get(segmentsAtom), index, key, value), options);
  },
);

/** Append a command, and select it so its parameters are immediately editable. */
export const appendCommandAtom = atom(null, (get, set, command: BaseCommand) => {
  const segments = get(segmentsAtom);
  set(setSegmentsAtom, appendCommand(segments, command, { step: suggestStep(segments) }));
  set(selectedIndexAtom, segments.length);
});

/** Insert a command directly after `index`. */
export const insertCommandAtom = atom(null, (get, set, index: number, command: BaseCommand) => {
  const segments = get(segmentsAtom);
  const before = segments.slice(0, index + 1);
  const created = appendCommand(before, command, { step: suggestStep(segments) });
  const segment = created[created.length - 1];

  set(setSegmentsAtom, insertSegment(segments, index + 1, segment));
  set(selectedIndexAtom, index + 1);
});

export const deleteSegmentAtom = atom(null, (get, set, index: number) => {
  set(setSegmentsAtom, removeSegment(get(segmentsAtom), index));
  set(clampSelectionAtom);
});

export const reorderSegmentAtom = atom(null, (get, set, from: number, to: number) => {
  const segments = get(segmentsAtom);
  if (to < 0 || to >= segments.length) return;

  set(setSegmentsAtom, moveSegment(segments, from, to));
  set(selectedIndexAtom, to);
});

export const clearPathAtom = atom(null, (_get, set) => {
  set(setSegmentsAtom, []);
  set(selectedIndexAtom, null);
});

/**
 * Pick a placeholder size for a new command that suits the path already drawn,
 * so adding a command to a 24-unit icon does not append a 10-unit stub and
 * adding to a 1000-unit drawing does not append an invisible one.
 */
function suggestStep(segments: readonly Segment[]): number {
  const end = endPoint(segments);
  const reach = Math.max(Math.abs(end.x), Math.abs(end.y));
  return reach > 0 ? Math.max(1, reach / 5) : 10;
}
