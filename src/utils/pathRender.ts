import { SVGPathData } from "svg-pathdata";

// ─── types ────────────────────────────────────────────────────────────────────

export interface SegLine {
  type: "L";
  points: number[];
}
export interface SegCurve {
  type: "C" | "Q";
  points: number[];
}
export interface SegArc {
  type: "A";
  points: number[];
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  a0: number;
  a1: number;
}
export type Segment = SegLine | SegCurve | SegArc;

// ─── bezier sampling ──────────────────────────────────────────────────────────

function cubicPts(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  n = 40,
): number[] {
  const p = [x0, y0];
  for (let i = 1; i <= n; i++) {
    const t = i / n,
      u = 1 - t,
      tt = t * t,
      uu = u * u,
      ttt = tt * t,
      uuu = uu * u;
    p.push(
      uuu * x0 + 3 * uu * t * x1 + 3 * u * tt * x2 + ttt * x3,
      uuu * y0 + 3 * uu * t * y1 + 3 * u * tt * y2 + ttt * y3,
    );
  }
  return p;
}
function quadPts(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  n = 30,
): number[] {
  const p = [x0, y0];
  for (let i = 1; i <= n; i++) {
    const t = i / n,
      u = 1 - t;
    p.push(u * u * x0 + 2 * u * t * x1 + t * t * x2, u * u * y0 + 2 * u * t * y1 + t * t * y2);
  }
  return p;
}

// ─── arc centre (svg spec algorithm) ──────────────────────────────────────────

function arcCentre(
  x0: number,
  y0: number,
  rx: number,
  ry: number,
  phi: number,
  fA: boolean,
  fS: boolean,
  x: number,
  y: number,
) {
  const dx = (x0 - x) / 2,
    dy = (y0 - y) / 2;
  const cr = Math.cos(phi),
    sr = Math.sin(phi);
  const x1 = cr * dx + sr * dy,
    y1 = -sr * dx + cr * dy;
  let rx1 = Math.abs(rx),
    ry1 = Math.abs(ry);
  const la = (x1 * x1) / (rx1 * rx1) + (y1 * y1) / (ry1 * ry1);
  if (la > 1) {
    rx1 *= Math.sqrt(la);
    ry1 *= Math.sqrt(la);
  }
  const s =
    (fA !== fS ? 1 : -1) *
    Math.sqrt(
      Math.max(
        0,
        (rx1 * rx1 * ry1 * ry1 - rx1 * rx1 * y1 * y1 - ry1 * ry1 * x1 * x1) /
          (rx1 * rx1 * y1 * y1 + ry1 * ry1 * x1 * x1),
      ),
    );
  const cxp = (s * rx1 * y1) / ry1,
    cyp = (s * -ry1 * x1) / rx1;
  const cx = cr * cxp - sr * cyp + (x0 + x) / 2,
    cy = sr * cxp + cr * cyp + (y0 + y) / 2;
  const angle = (u: number, v: number) => Math.atan2(v, u);
  const th = angle((x1 - cxp) / rx1, (y1 - cyp) / ry1);
  let dt = angle((-x1 - cxp) / rx1, (-y1 - cyp) / ry1) - th;
  if (!fS && dt > 0) dt -= 2 * Math.PI;
  else if (fS && dt < 0) dt += 2 * Math.PI;
  return { cx, cy, rx: rx1, ry: ry1, phi, a0: th, a1: th + dt };
}

function arcPts(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  phi: number,
  a0: number,
  a1: number,
  n = 40,
): number[] {
  const p: number[] = [];
  const m = Math.max(2, Math.round(Math.abs(a1 - a0) / (Math.PI / n)));
  for (let i = 0; i <= m; i++) {
    const a = a0 + ((a1 - a0) * i) / m,
      ca = Math.cos(a),
      sa = Math.sin(a);
    p.push(
      cx + rx * ca * Math.cos(phi) - ry * sa * Math.sin(phi),
      cy + rx * ca * Math.sin(phi) + ry * sa * Math.cos(phi),
    );
  }
  return p;
}

// ─── walk commands → segments ─────────────────────────────────────────────────

export function parseToSegments(d: string): Segment[] {
  if (!d.trim()) return [];
  const segs: Segment[] = [];
  let cx = 0,
    cy = 0,
    sx = 0,
    sy = 0,
    lcpx = 0,
    lcpy = 0,
    lastType = 0;

  const data = new SVGPathData(d);

  for (const cmd of data.commands) {
    const p = cmd as unknown as Record<string, unknown>;
    const rel = (p.relative as boolean) || false;
    const ct = cmd.type;
    const ab = (vx: number, vy: number) => [rel ? cx + vx : vx, rel ? cy + vy : vy] as const;

    if (ct === SVGPathData.MOVE_TO) {
      [cx, cy] = ab(p.x as number, p.y as number);
      sx = cx;
      sy = cy;
      lcpx = cx;
      lcpy = cy;
      lastType = ct;
      segs.push({ type: "L", points: [cx, cy] });
      continue;
    }
    if (
      ct === SVGPathData.LINE_TO ||
      ct === SVGPathData.HORIZ_LINE_TO ||
      ct === SVGPathData.VERT_LINE_TO
    ) {
      const nx =
        ct === SVGPathData.VERT_LINE_TO ? cx : rel ? cx + (p.x as number) : (p.x as number);
      const ny =
        ct === SVGPathData.HORIZ_LINE_TO ? cy : rel ? cy + (p.y as number) : (p.y as number);
      segs.push({ type: "L", points: [cx, cy, nx, ny] });
      cx = nx;
      cy = ny;
      lcpx = cx;
      lcpy = cy;
      lastType = ct;
      continue;
    }
    if (ct === SVGPathData.CURVE_TO) {
      const [x1, y1] = ab(p.x1 as number, p.y1 as number),
        [x2, y2] = ab(p.x2 as number, p.y2 as number),
        [nx, ny] = ab(p.x as number, p.y as number);
      segs.push({ type: "C", points: cubicPts(cx, cy, x1, y1, x2, y2, nx, ny) });
      lcpx = x2;
      lcpy = y2;
      cx = nx;
      cy = ny;
      lastType = ct;
      continue;
    }
    if (ct === SVGPathData.SMOOTH_CURVE_TO) {
      const x1 =
        lastType === SVGPathData.CURVE_TO || lastType === SVGPathData.SMOOTH_CURVE_TO
          ? 2 * cx - lcpx
          : cx;
      const y1 =
        lastType === SVGPathData.CURVE_TO || lastType === SVGPathData.SMOOTH_CURVE_TO
          ? 2 * cy - lcpy
          : cy;
      const [x2, y2] = ab(p.x2 as number, p.y2 as number),
        [nx, ny] = ab(p.x as number, p.y as number);
      segs.push({ type: "C", points: cubicPts(cx, cy, x1, y1, x2, y2, nx, ny) });
      lcpx = x2;
      lcpy = y2;
      cx = nx;
      cy = ny;
      lastType = ct;
      continue;
    }
    if (ct === SVGPathData.QUAD_TO) {
      const [x1, y1] = ab(p.x1 as number, p.y1 as number),
        [nx, ny] = ab(p.x as number, p.y as number);
      segs.push({ type: "Q", points: quadPts(cx, cy, x1, y1, nx, ny) });
      lcpx = x1;
      lcpy = y1;
      cx = nx;
      cy = ny;
      lastType = ct;
      continue;
    }
    if (ct === SVGPathData.SMOOTH_QUAD_TO) {
      const x1 =
        lastType === SVGPathData.QUAD_TO || lastType === SVGPathData.SMOOTH_QUAD_TO
          ? 2 * cx - lcpx
          : cx;
      const y1 =
        lastType === SVGPathData.QUAD_TO || lastType === SVGPathData.SMOOTH_QUAD_TO
          ? 2 * cy - lcpy
          : cy;
      const [nx, ny] = ab(p.x as number, p.y as number);
      segs.push({ type: "Q", points: quadPts(cx, cy, x1, y1, nx, ny) });
      lcpx = x1;
      lcpy = y1;
      cx = nx;
      cy = ny;
      lastType = ct;
      continue;
    }
    if (ct === SVGPathData.ARC) {
      const [nx, ny] = ab(p.x as number, p.y as number);
      const a = arcCentre(
        cx,
        cy,
        p.rX as number,
        p.rY as number,
        ((p.xRot as number) * Math.PI) / 180,
        !!(p.lArcFlag as number),
        !!(p.sweepFlag as number),
        nx,
        ny,
      );
      segs.push({
        type: "A",
        points: arcPts(a.cx, a.cy, a.rx, a.ry, a.phi, a.a0, a.a1),
        cx: a.cx,
        cy: a.cy,
        rx: a.rx,
        ry: a.ry,
        a0: a.a0,
        a1: a.a1,
      });
      cx = nx;
      cy = ny;
      lcpx = cx;
      lcpy = cy;
      lastType = ct;
      continue;
    }
    if (ct === SVGPathData.CLOSE_PATH) {
      if (cx !== sx || cy !== sy) segs.push({ type: "L", points: [cx, cy, sx, sy] });
      cx = sx;
      cy = sy;
      lcpx = cx;
      lcpy = cy;
      lastType = ct;
    }
  }
  return segs;
}
