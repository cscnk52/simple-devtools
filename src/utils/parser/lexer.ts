export type Token = { kind: "command"; value: string } | { kind: "number"; value: number };

export function lexer(d: string): Token[] {
  const tokens: Token[] = [];

  const re =
    /[AaCcHhLlMmQqSsTtVvZz]|[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?/g;

  for (const [value] of d.matchAll(re)) {
    tokens.push(
      /[AaCcHhLlMmQqSsTtVvZz]/.test(value)
        ? { kind: "command", value }
        : { kind: "number", value: Number(value) },
    );
  }

  return tokens;
}
