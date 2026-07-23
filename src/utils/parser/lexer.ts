export type CommandValue = BothCase<BaseCommand>;

export type BaseCommand = "A" | "C" | "H" | "L" | "M" | "Q" | "S" | "T" | "V" | "Z";

type BothCase<T extends string> = Uppercase<T> | Lowercase<T>;

export type Token = { kind: "command"; value: CommandValue } | { kind: "number"; value: number };

// arguments one repetition of each command consumes
export const arity: Record<BaseCommand, number> = {
  A: 7,
  C: 6,
  H: 1,
  L: 2,
  M: 2,
  Q: 4,
  S: 4,
  T: 2,
  V: 1,
  Z: 0,
};

// large-arc-flag and sweep-flag, by position inside one "A" repetition
const arcFlags = [3, 4];

const cmdRe = /^[AaCcHhLlMmQqSsTtVvZz]$/;
const sepRe = /[\s,]*/y;
const numRe = /[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?/y;
// flags are a single digit, so they may run into the next number: "a1 1 0 011 1"
const flagRe = /[01]/y;

function isCommand(value: string): value is CommandValue {
  return cmdRe.test(value);
}

export function lexer(d: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let cmd: BaseCommand | undefined;
  let argIndex = 0;

  // consume a sticky match at the cursor, advancing it on success
  const eat = (re: RegExp): string | undefined => {
    re.lastIndex = i;
    const m = re.exec(d);
    if (!m) return undefined;
    i = re.lastIndex;
    return m[0];
  };

  while (i < d.length) {
    eat(sepRe);
    if (i >= d.length) break;

    const char = d[i];

    if (isCommand(char)) {
      tokens.push({ kind: "command", value: char });
      cmd = char.toUpperCase() as BaseCommand;
      argIndex = 0;
      i++;
      continue;
    }

    if (cmd === undefined) {
      throw new SyntaxError(`path must start with a command, got "${char}" at index ${i}`);
    }

    const value = eat(cmd === "A" && arcFlags.includes(argIndex % arity.A) ? flagRe : numRe);

    if (value === undefined) {
      throw new SyntaxError(`unexpected "${char}" at index ${i}`);
    }

    tokens.push({ kind: "number", value: Number(value) });
    argIndex++;
  }

  return tokens;
}
