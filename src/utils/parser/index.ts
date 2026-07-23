import { lexer } from "./lexer";
import { parse, Segment } from "./parser";

export { arity, lexer, type BaseCommand, type CommandValue, type Token } from "./lexer";
export { parse, type CurveSegment, type LinearSegment, type Mode, type Segment } from "./parser";
export { formatNumber, serializePath, serializeSegment } from "./serialize";

// throws SyntaxError on malformed input
export function parsePath(d: string): Segment[] {
  return parse(lexer(d));
}

export type ParseResult = { ok: true; segments: Segment[] } | { ok: false; message: string };

/**
 * Parse without throwing, for input that is being typed and is therefore
 * expected to be invalid part of the time.
 */
export function tryParsePath(d: string): ParseResult {
  try {
    return { ok: true, segments: parsePath(d) };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }
}
