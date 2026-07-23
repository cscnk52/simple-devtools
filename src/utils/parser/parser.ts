import { match } from "ts-pattern";

import { arity, BaseCommand, CommandValue, Token } from "./lexer";

export type Mode = "relative" | "absolute";

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

export type Segment =
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

function flag(value: number): 0 | 1 {
  if (value !== 0 && value !== 1) {
    throw new SyntaxError(`arc flag must be 0 or 1, got ${value}`);
  }
  return value;
}

function toSegment(cmd: BaseCommand, mode: Mode, args: readonly number[]): Segment {
  return match(cmd)
    .returnType<Segment>()
    .with("M", () => {
      const [x, y] = args;
      return { type: "moveTo", mode, x, y };
    })
    .with("L", () => {
      const [x, y] = args;
      return { type: "lineTo", mode, x, y };
    })
    .with("H", () => {
      const [x] = args;
      return { type: "horizontalLineTo", mode, x };
    })
    .with("V", () => {
      const [y] = args;
      return { type: "verticalLineTo", mode, y };
    })
    .with("Z", () => {
      return { type: "closePath" };
    })
    .with("C", () => {
      const [x1, y1, x2, y2, x, y] = args;
      return { type: "curveTo", mode, x1, y1, x2, y2, x, y };
    })
    .with("S", () => {
      const [x2, y2, x, y] = args;
      return { type: "smoothCurveTo", mode, x2, y2, x, y };
    })
    .with("Q", () => {
      const [x1, y1, x, y] = args;
      return { type: "quadraticCurveTo", mode, x1, y1, x, y };
    })
    .with("T", () => {
      const [x, y] = args;
      return { type: "smoothQuadraticCurveTo", mode, x, y };
    })
    .with("A", () => {
      const [rx, ry, xAxisRotation, largeArcFlag, sweepFlag, x, y] = args;
      return {
        type: "ellipticalArcTo",
        mode,
        rx,
        ry,
        xAxisRotation,
        largeArcFlag: flag(largeArcFlag),
        sweepFlag: flag(sweepFlag),
        x,
        y,
      };
    })
    .exhaustive();
}

export function parse(token: readonly Token[]): Segment[] {
  const segments: Segment[] = [];
  let i = 0;
  let prev: BaseCommand | undefined;
  let mode: Mode = "absolute";

  while (i < token.length) {
    const t = token[i];
    let cmd: BaseCommand;

    if (t.kind === "command") {
      ({ cmd, mode } = normalize(t.value));
      i++;
    } else if (prev === undefined) {
      throw new SyntaxError("path must start with a command");
    } else if (prev === "Z") {
      throw new SyntaxError(`"Z" takes no arguments`);
    } else {
      // arguments left over after a command repeat it implicitly,
      // except a moveTo, whose extra pairs are lineTo
      cmd = prev === "M" ? "L" : prev;
    }

    const count = arity[cmd];
    const args = Array.from({ length: count }, (_, j) => {
      const arg = token[i + j];
      if (arg?.kind !== "number") {
        throw new SyntaxError(`"${cmd}" expects ${count} arguments`);
      }
      return arg.value;
    });

    segments.push(toSegment(cmd, mode, args));
    prev = cmd;
    i += count;
  }

  return segments;
}
