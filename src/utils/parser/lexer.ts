export type CommandValue = BothCase<BaseCommand>;

export type BaseCommand = "A" | "C" | "H" | "L" | "M" | "Q" | "S" | "T" | "V" | "Z";

type BothCase<T extends string> = Uppercase<T> | Lowercase<T>;

export type Token = { kind: "command"; value: CommandValue } | { kind: "number"; value: number };

const cmdRe = /^[AaCcHhLlMmQqSsTtVvZz]$/;

function isCommand(value: string): value is CommandValue {
  return cmdRe.test(value);
}

export function lexer(d: string): Token[] {
  const tokens: Token[] = [];

  const re = /[AaCcHhLlMmQqSsTtVvZz]|[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?/g;

  for (const [value] of d.matchAll(re)) {
    tokens.push(
      isCommand(value) ? { kind: "command", value } : { kind: "number", value: Number(value) },
    );
  }

  return tokens;
}
