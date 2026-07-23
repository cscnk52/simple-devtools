export interface History<T> {
  readonly past: readonly T[];
  readonly present: T;
  readonly future: readonly T[];
}

export const DEFAULT_LIMIT = 100;

export function initHistory<T>(present: T): History<T> {
  return { past: [], present, future: [] };
}

export function canUndo<T>(history: History<T>): boolean {
  return history.past.length > 0;
}

export function canRedo<T>(history: History<T>): boolean {
  return history.future.length > 0;
}

/**
 * Record a new present state.
 *
 * Committing an unchanged value is a no-op, so a drag that ends where it began
 * does not leave a dead entry in the stack. Any redo branch is discarded, and
 * the oldest entries are dropped once `limit` is exceeded.
 *
 * @throws RangeError when `limit` is not a positive integer
 */
export function commit<T>(history: History<T>, next: T, limit: number = DEFAULT_LIMIT): History<T> {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new RangeError(`limit must be a positive integer, got ${limit}`);
  }
  if (Object.is(next, history.present)) return history;

  const past = [...history.past, history.present];
  return {
    past: past.length > limit ? past.slice(past.length - limit) : past,
    present: next,
    future: [],
  };
}

/**
 * Replace the present without touching the stack.
 *
 * Used for transient states — the intermediate frames of a drag — so a single
 * gesture becomes a single undo step once it is committed.
 */
export function replace<T>(history: History<T>, next: T): History<T> {
  return Object.is(next, history.present) ? history : { ...history, present: next };
}

/** Step back one entry, or return the history unchanged when there is none. */
export function undo<T>(history: History<T>): History<T> {
  if (!canUndo(history)) return history;

  const previous = history.past[history.past.length - 1];
  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
  };
}

/** Step forward one entry, or return the history unchanged when there is none. */
export function redo<T>(history: History<T>): History<T> {
  if (!canRedo(history)) return history;

  const [next, ...rest] = history.future;
  return {
    past: [...history.past, history.present],
    present: next,
    future: rest,
  };
}
