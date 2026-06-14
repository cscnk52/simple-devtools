import { match } from "ts-pattern";

import { BaseCommand, CommandValue, Token } from "./lexer";

type Mode = "relative" | "absolute";

// M x y
// m x y
type MoveTo = {
  type: "moveTo";
  mode: Mode;
  x: number;
  y: number;
};

// L x y
// l dx dy
type LineTo = {
  type: "lineTo";
  mode: Mode;
  x: number;
  y: number;
};

// H x
// h dx
type HorizontalLineTo = {
  type: "horizontalLineTo";
  mode: Mode;
  x: number;
};

// V y
// v dy
type VerticalLineTo = {
  type: "verticalLineTo";
  mode: Mode;
  y: number;
};

// Z
type ClosePath = {
  type: "closePath";
};

// C x1 y1, x2 y2,x y
// c dx1 dy1, dx2 dy2, dx dy
type CurveTo = {
  type: "curveTo";
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
  type: "smoothCurveTo";
  mode: Mode;
  x2: number;
  y2: number;
  x: number;
  y: number;
};

// Q x1 y1, x y
// q dx1 dy1, dx dy
type QuadraticCurveTo = {
  type: "quadraticCurveTo";
  mode: Mode;
  x1: number;
  y1: number;
  x: number;
  y: number;
};

// T x y
// t dx dy
type SmoothQuadraticCurveTo = {
  type: "smoothQuadraticCurveTo";
  mode: Mode;
  x: number;
  y: number;
};

// A rx ry x-axis-rotation large-arc-flag sweep-flag x y
// a rx ry x-axis-rotation large-arc-flag sweep-flag dx dy
type EllipticalArcTo = {
  type: "ellipticalArcTo";
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
      .returnType<Segment>()
      .with("M", () => {
        const [x, y] = take(2);
        return { type: "moveTo", mode, x, y };
      })
      .with("L", () => {
        const [x, y] = take(2);
        return { type: "lineTo", mode, x, y };
      })
      .with("H", () => {
        const [x] = take(1);
        return { type: "horizontalLineTo", mode, x };
      })
      .with("V", () => {
        const [y] = take(1);
        return { type: "verticalLineTo", mode, y };
      })
      .with("Z", () => {
        return { type: "closePath" };
      })
      .with("C", () => {
        const [x1, y1, x2, y2, x, y] = take(6);
        return { type: "curveTo", mode, x1, y1, x2, y2, x, y };
      })
      .with("S", () => {
        const [x2, y2, x, y] = take(4);
        return { type: "smoothCurveTo", mode, x2, y2, x, y };
      })
      .with("Q", () => {
        const [x1, y1, x, y] = take(4);
        return { type: "quadraticCurveTo", mode, x1, y1, x, y };
      })
      .with("T", () => {
        const [x, y] = take(2);
        return { type: "smoothQuadraticCurveTo", mode, x, y };
      })
      .with("A", () => {
        const [rx, ry, xAxisRotation, largeArcFlag, sweepFlag, x, y] = take(7);
        return {
          type: "ellipticalArcTo",
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
