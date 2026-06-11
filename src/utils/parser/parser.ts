import { match } from "ts-pattern";

import { BaseCommand, CommandValue, Token } from "./lexer";

type Mode = "relative" | "absolute";

// M x y
// m x y
type MoveTo = {
  kind: "moveTo";
  mode: Mode;
  x: number;
  y: number;
};

// L x y
// l dx dy
type LineTo = {
  kind: "lineTo";
  mode: Mode;
  x: number;
  y: number;
};

// H x
// h dx
type HorizontalLineTo = {
  kind: "horizontalLineTo";
  mode: Mode;
  x: number;
};

// V y
// v dy
type VerticalLineTo = {
  kind: "verticalLineTo";
  mode: Mode;
  y: number;
};

// Z
type ClosePath = {
  kind: "closePath";
};

// C x1 y1, x2 y2,x y
// c dx1 dy1, dx2 dy2, dx dy
type CurveTo = {
  kind: "curveTo";
  mode: Mode;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  x: number;
  y: number;
};

// S x2 y2, x y
// s dx2 dy2, dx dy
type SmoothCurveTo = {
  kind: "smoothCurveTo";
  mode: Mode;
  x2: number;
  y2: number;
  x: number;
  y: number;
};

// Q x1 y1, x y
// q dx1 dy1, dx dy
type QuadraticCurveTo = {
  kind: "quadraticCurveTo";
  mode: Mode;
  x1: number;
  y1: number;
  x: number;
  y: number;
};

// T x y
// t dx dy
type SmoothQuadraticCurveTo = {
  kind: "smoothQuadraticCurveTo";
  mode: Mode;
  x: number;
  y: number;
};

// A rx ry x-axis-rotation large-arc-flag sweep-flag x y
// a rx ry x-axis-rotation large-arc-flag sweep-flag dx dy
type EllipticalArcTo = {
  kind: "ellipticalArcTo";
  mode: Mode;
  rx: number;
  ry: number;
  xAxisRotation: number;
  largeArcFlag: 0 | 1;
  sweepFlag: 0 | 1;
  x: number;
  y: number;
};

export type LinearSegment = MoveTo | LineTo | HorizontalLineTo | VerticalLineTo | ClosePath;

export type CurveSegment =
  | CurveTo
  | SmoothCurveTo
  | QuadraticCurveTo
  | SmoothQuadraticCurveTo
  | EllipticalArcTo;

type Segment =
  | MoveTo
  | LineTo
  | HorizontalLineTo
  | VerticalLineTo
  | ClosePath
  | CurveTo
  | SmoothCurveTo
  | QuadraticCurveTo
  | SmoothQuadraticCurveTo
  | EllipticalArcTo;

function normalize(v: CommandValue): { cmd: BaseCommand; mode: Mode } {
  const upper = v.toUpperCase();
  return { cmd: upper as BaseCommand, mode: v === upper ? "absolute" : "relative" };
}

const span: Record<BaseCommand, number> = {
  A: 8,
  C: 7,
  H: 2,
  L: 3,
  M: 3,
  Q: 5,
  S: 5,
  T: 3,
  V: 2,
  Z: 1,
};

export function parse(token: readonly Token[]): Segment[] {
  const segments: Segment[] = [];
  let i = 0;

  while (i < token.length) {
    const t = token[i];
    if (t.kind !== "command") {
      i++;
      continue;
    }

    const { cmd, mode } = normalize(t.value);

    const take = (count: number): number[] =>
      Array.from({ length: count }, (_, j) => {
        const next = token[i + j + 1];
        return next?.kind === "number" ? next.value : 0;
      });

    const seg = match(cmd)
      .with("M", (): Segment => {
        const [x, y] = take(2);
        return { kind: "moveTo", mode, x, y };
      })
      .with("L", (): Segment => {
        const [x, y] = take(2);
        return { kind: "lineTo", mode, x, y };
      })
      .with("H", (): Segment => {
        const [x] = take(1);
        return { kind: "horizontalLineTo", mode, x };
      })
      .with("V", (): Segment => {
        const [y] = take(1);
        return { kind: "verticalLineTo", mode, y };
      })
      .with("Z", (): Segment => {
        return { kind: "closePath" };
      })
      .with("C", (): Segment => {
        const [x1, y1, x2, y2, x, y] = take(6);
        return { kind: "curveTo", mode, x1, y1, x2, y2, x, y };
      })
      .with("S", (): Segment => {
        const [x2, y2, x, y] = take(4);
        return { kind: "smoothCurveTo", mode, x2, y2, x, y };
      })
      .with("Q", (): Segment => {
        const [x1, y1, x, y] = take(4);
        return { kind: "quadraticCurveTo", mode, x1, y1, x, y };
      })
      .with("T", (): Segment => {
        const [x, y] = take(2);
        return { kind: "smoothQuadraticCurveTo", mode, x, y };
      })
      .with("A", (): Segment => {
        const [rx, ry, xAxisRotation, largeArcFlag, sweepFlag, x, y] = take(7);
        return {
          kind: "ellipticalArcTo",
          mode,
          rx,
          ry,
          xAxisRotation,
          largeArcFlag: largeArcFlag as 0 | 1,
          sweepFlag: sweepFlag as 0 | 1,
          x,
          y,
        };
      })
      .exhaustive();

    segments.push(seg);
    i += span[cmd];
  }

  return segments;
}
