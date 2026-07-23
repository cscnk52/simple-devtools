import type { Point } from "./point";

export interface ArcCenter {
  center: Point;
  /** radii after the spec-mandated correction for out-of-range values */
  rx: number;
  ry: number;
  /** x-axis rotation, in radians */
  rotation: number;
  /** start angle on the unit circle, in radians */
  startAngle: number;
  /** signed sweep, in radians; negative means counter-clockwise */
  deltaAngle: number;
}

const TAU = Math.PI * 2;

/** Signed angle from vector `u` to vector `v`, in (-PI, PI]. */
function angleBetween(ux: number, uy: number, vx: number, vy: number): number {
  const sign = ux * vy - uy * vx < 0 ? -1 : 1;
  const magnitude = Math.hypot(ux, uy) * Math.hypot(vx, vy);
  if (magnitude === 0) return 0;
  // guard against |cos| slipping past 1 from rounding
  const cos = Math.min(1, Math.max(-1, (ux * vx + uy * vy) / magnitude));
  return sign * Math.acos(cos);
}

/**
 * Convert an elliptical arc from SVG's endpoint parameterization to centre
 * parameterization (SVG 1.1, appendix F.6.5).
 *
 * Returns `null` when the arc degenerates and should be drawn as a straight
 * line: coincident endpoints, or a zero radius. Radii too small to span the
 * endpoints are scaled up per F.6.6 rather than rejected.
 *
 * Throws on non-finite input.
 */
export function arcCenter(
  start: Point,
  end: Point,
  rx: number,
  ry: number,
  xAxisRotationDeg: number,
  largeArcFlag: 0 | 1,
  sweepFlag: 0 | 1,
): ArcCenter | null {
  const inputs = [start.x, start.y, end.x, end.y, rx, ry, xAxisRotationDeg];
  if (inputs.some((value) => !Number.isFinite(value))) {
    throw new RangeError("arcCenter requires finite coordinates, radii and rotation");
  }

  if (start.x === end.x && start.y === end.y) return null;

  let rX = Math.abs(rx);
  let rY = Math.abs(ry);
  if (rX === 0 || rY === 0) return null;

  const rotation = ((xAxisRotationDeg % 360) * Math.PI) / 180;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);

  // step 1: translate the ellipse to the origin and undo its rotation
  const dx = (start.x - end.x) / 2;
  const dy = (start.y - end.y) / 2;
  const x1 = cos * dx + sin * dy;
  const y1 = -sin * dx + cos * dy;

  // step 2: scale up radii that cannot span the endpoints
  const lambda = (x1 * x1) / (rX * rX) + (y1 * y1) / (rY * rY);
  if (lambda > 1) {
    const scale = Math.sqrt(lambda);
    rX *= scale;
    rY *= scale;
  }

  const rxSq = rX * rX;
  const rySq = rY * rY;
  const numerator = rxSq * rySq - rxSq * y1 * y1 - rySq * x1 * x1;
  const denominator = rxSq * y1 * y1 + rySq * x1 * x1;
  // numerator is >= 0 after step 2; max() only absorbs rounding error
  const factor =
    (largeArcFlag === sweepFlag ? -1 : 1) * Math.sqrt(Math.max(0, numerator) / denominator);

  const cxPrime = (factor * rX * y1) / rY;
  const cyPrime = (-factor * rY * x1) / rX;

  // step 3: rotate the centre back into user space
  const center: Point = {
    x: cos * cxPrime - sin * cyPrime + (start.x + end.x) / 2,
    y: sin * cxPrime + cos * cyPrime + (start.y + end.y) / 2,
  };

  // step 4: recover the angles
  const startVecX = (x1 - cxPrime) / rX;
  const startVecY = (y1 - cyPrime) / rY;
  const endVecX = (-x1 - cxPrime) / rX;
  const endVecY = (-y1 - cyPrime) / rY;

  const startAngle = angleBetween(1, 0, startVecX, startVecY);
  let deltaAngle = angleBetween(startVecX, startVecY, endVecX, endVecY) % TAU;

  if (sweepFlag === 0 && deltaAngle > 0) deltaAngle -= TAU;
  if (sweepFlag === 1 && deltaAngle < 0) deltaAngle += TAU;

  return { center, rx: rX, ry: rY, rotation, startAngle, deltaAngle };
}

/** Point on a centre-parameterized arc at `angle` radians. */
export function arcPointAtAngle(arc: ArcCenter, angle: number): Point {
  const cos = Math.cos(arc.rotation);
  const sin = Math.sin(arc.rotation);
  const ax = arc.rx * Math.cos(angle);
  const ay = arc.ry * Math.sin(angle);

  return {
    x: arc.center.x + ax * cos - ay * sin,
    y: arc.center.y + ax * sin + ay * cos,
  };
}
