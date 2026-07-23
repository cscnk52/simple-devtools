export interface Point {
  readonly x: number;
  readonly y: number;
}

export function point(x: number, y: number): Point {
  return { x, y };
}

export function isFinitePoint(p: Point): boolean {
  return Number.isFinite(p.x) && Number.isFinite(p.y);
}

export function add(a: Point, b: Point): Point {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function subtract(a: Point, b: Point): Point {
  return { x: a.x - b.x, y: a.y - b.y };
}

/** Mirror `p` through `origin` — the reflection used to derive S/T control points. */
export function reflect(p: Point, origin: Point): Point {
  return { x: 2 * origin.x - p.x, y: 2 * origin.y - p.y };
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
