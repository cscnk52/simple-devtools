import { SVGPathData, type SVGCommand } from "svg-pathdata";

export interface PathCommand {
  type: string;
  params: number[];
  id: string;
}

const TYPE_TO_LETTER: Record<number, string> = {
  [SVGPathData.MOVE_TO]: "M",
  [SVGPathData.LINE_TO]: "L",
  [SVGPathData.HORIZ_LINE_TO]: "H",
  [SVGPathData.VERT_LINE_TO]: "V",
  [SVGPathData.CURVE_TO]: "C",
  [SVGPathData.SMOOTH_CURVE_TO]: "S",
  [SVGPathData.QUAD_TO]: "Q",
  [SVGPathData.SMOOTH_QUAD_TO]: "T",
  [SVGPathData.ARC]: "A",
  [SVGPathData.CLOSE_PATH]: "Z",
};

function getCommandLetter(cmd: SVGCommand): string {
  const base = TYPE_TO_LETTER[cmd.type] ?? "?";

  if (cmd.type === SVGPathData.CLOSE_PATH) return base;

  return (cmd as { relative: boolean }).relative ? base.toLowerCase() : base;
}

function extractParams(cmd: SVGCommand): number[] {
  const p = cmd as unknown as Record<string, unknown>;

  switch (cmd.type) {
    case SVGPathData.CLOSE_PATH:
      return [];
    case SVGPathData.MOVE_TO:
    case SVGPathData.LINE_TO:
      return [p.x as number, p.y as number];
    case SVGPathData.HORIZ_LINE_TO:
      return [p.x as number];
    case SVGPathData.VERT_LINE_TO:
      return [p.y as number];
    case SVGPathData.CURVE_TO:
      return [
        p.x1 as number,
        p.y1 as number,
        p.x2 as number,
        p.y2 as number,
        p.x as number,
        p.y as number,
      ];
    case SVGPathData.SMOOTH_CURVE_TO:
      return [p.x2 as number, p.y2 as number, p.x as number, p.y as number];
    case SVGPathData.QUAD_TO:
      return [p.x1 as number, p.y1 as number, p.x as number, p.y as number];
    case SVGPathData.SMOOTH_QUAD_TO:
      return [p.x as number, p.y as number];
    case SVGPathData.ARC:
      return [
        p.rX as number,
        p.rY as number,
        p.xRot as number,
        p.lArcFlag as number,
        p.sweepFlag as number,
        p.x as number,
        p.y as number,
      ];
    default:
      return [];
  }
}

export function parsePath(d: string): PathCommand[] {
  if (!d.trim()) return [];

  try {
    const data = new SVGPathData(d);
    let idCounter = 0;

    return data.commands.map((cmd) => ({
      type: getCommandLetter(cmd),
      params: extractParams(cmd),
      id: `cmd-${idCounter++}`,
    }));
  } catch {
    return [];
  }
}

export interface ControlPoint {
  x: number;
  y: number;
}

export interface ControlLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface ControlOverlay {
  points: ControlPoint[];
  lines: ControlLine[];
  anchors: ControlPoint[];
}

export function getControlOverlay(d: string): ControlOverlay {
  const result: ControlOverlay = { points: [], lines: [], anchors: [] };
  if (!d.trim()) return result;

  try {
    const data = new SVGPathData(d);
    let cx = 0,
      cy = 0;
    let sx = 0,
      sy = 0;
    let lastCpX = 0,
      lastCpY = 0;
    let lastCmdType = 0;

    for (const cmd of data.commands) {
      const p = cmd as unknown as Record<string, unknown>;
      const isRel = (p.relative as boolean) || false;
      const ct = cmd.type;

      if (ct === SVGPathData.MOVE_TO) {
        cx = isRel ? cx + (p.x as number) : (p.x as number);
        cy = isRel ? cy + (p.y as number) : (p.y as number);
        sx = cx;
        sy = cy;
        lastCpX = cx;
        lastCpY = cy;
        lastCmdType = ct;
        result.anchors.push({ x: cx, y: cy });
      } else if (
        ct === SVGPathData.LINE_TO ||
        ct === SVGPathData.HORIZ_LINE_TO ||
        ct === SVGPathData.VERT_LINE_TO
      ) {
        const nx =
          ct === SVGPathData.VERT_LINE_TO ? cx : isRel ? cx + (p.x as number) : (p.x as number);
        const ny =
          ct === SVGPathData.HORIZ_LINE_TO ? cy : isRel ? cy + (p.y as number) : (p.y as number);
        cx = nx;
        cy = ny;
        lastCpX = cx;
        lastCpY = cy;
        lastCmdType = ct;
        result.anchors.push({ x: cx, y: cy });
      } else if (ct === SVGPathData.CURVE_TO) {
        const x1 = isRel ? cx + (p.x1 as number) : (p.x1 as number);
        const y1 = isRel ? cy + (p.y1 as number) : (p.y1 as number);
        const x2 = isRel ? cx + (p.x2 as number) : (p.x2 as number);
        const y2 = isRel ? cy + (p.y2 as number) : (p.y2 as number);
        const nx = isRel ? cx + (p.x as number) : (p.x as number);
        const ny = isRel ? cy + (p.y as number) : (p.y as number);
        result.points.push({ x: x1, y: y1 }, { x: x2, y: y2 });
        result.lines.push({ x1: cx, y1: cy, x2: x1, y2: y1 }, { x1: nx, y1: ny, x2: x2, y2: y2 });
        cx = nx;
        cy = ny;
        lastCpX = x2;
        lastCpY = y2;
        lastCmdType = ct;
        result.anchors.push({ x: cx, y: cy });
      } else if (ct === SVGPathData.SMOOTH_CURVE_TO) {
        const x1 =
          lastCmdType === SVGPathData.CURVE_TO || lastCmdType === SVGPathData.SMOOTH_CURVE_TO
            ? 2 * cx - lastCpX
            : cx;
        const y1 =
          lastCmdType === SVGPathData.CURVE_TO || lastCmdType === SVGPathData.SMOOTH_CURVE_TO
            ? 2 * cy - lastCpY
            : cy;
        const x2 = isRel ? cx + (p.x2 as number) : (p.x2 as number);
        const y2 = isRel ? cy + (p.y2 as number) : (p.y2 as number);
        const nx = isRel ? cx + (p.x as number) : (p.x as number);
        const ny = isRel ? cy + (p.y as number) : (p.y as number);
        result.points.push({ x: x1, y: y1 }, { x: x2, y: y2 });
        result.lines.push({ x1: cx, y1: cy, x2: x1, y2: y1 }, { x1: nx, y1: ny, x2: x2, y2: y2 });
        cx = nx;
        cy = ny;
        lastCpX = x2;
        lastCpY = y2;
        lastCmdType = ct;
        result.anchors.push({ x: cx, y: cy });
      } else if (ct === SVGPathData.QUAD_TO) {
        const x1 = isRel ? cx + (p.x1 as number) : (p.x1 as number);
        const y1 = isRel ? cy + (p.y1 as number) : (p.y1 as number);
        const nx = isRel ? cx + (p.x as number) : (p.x as number);
        const ny = isRel ? cy + (p.y as number) : (p.y as number);
        result.points.push({ x: x1, y: y1 });
        result.lines.push({ x1: cx, y1: cy, x2: x1, y2: y1 }, { x1: nx, y1: ny, x2: x1, y2: y1 });
        cx = nx;
        cy = ny;
        lastCpX = x1;
        lastCpY = y1;
        lastCmdType = ct;
        result.anchors.push({ x: cx, y: cy });
      } else if (ct === SVGPathData.SMOOTH_QUAD_TO) {
        const x1 =
          lastCmdType === SVGPathData.QUAD_TO || lastCmdType === SVGPathData.SMOOTH_QUAD_TO
            ? 2 * cx - lastCpX
            : cx;
        const y1 =
          lastCmdType === SVGPathData.QUAD_TO || lastCmdType === SVGPathData.SMOOTH_QUAD_TO
            ? 2 * cy - lastCpY
            : cy;
        const nx = isRel ? cx + (p.x as number) : (p.x as number);
        const ny = isRel ? cy + (p.y as number) : (p.y as number);
        result.points.push({ x: x1, y: y1 });
        result.lines.push({ x1: cx, y1: cy, x2: x1, y2: y1 }, { x1: nx, y1: ny, x2: x1, y2: y1 });
        cx = nx;
        cy = ny;
        lastCpX = x1;
        lastCpY = y1;
        lastCmdType = ct;
        result.anchors.push({ x: cx, y: cy });
      } else if (ct === SVGPathData.CLOSE_PATH) {
        cx = sx;
        cy = sy;
        lastCpX = cx;
        lastCpY = cy;
        lastCmdType = ct;
      } else if (ct === SVGPathData.ARC) {
        const nx = isRel ? cx + (p.x as number) : (p.x as number);
        const ny = isRel ? cy + (p.y as number) : (p.y as number);
        cx = nx;
        cy = ny;
        lastCpX = cx;
        lastCpY = cy;
        lastCmdType = ct;
        result.anchors.push({ x: cx, y: cy });
      }
    }
  } catch {}

  return result;
}

const DEFAULT_SAMPLE =
  "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z";

export default DEFAULT_SAMPLE;
