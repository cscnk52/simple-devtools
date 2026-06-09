import { defineConfig } from "oxlint";

export default defineConfig({
  plugins: [
    "eslint",
    "typescript",
    "unicorn",
    "react",
    "react-perf",
    "oxc",
    "import",
    "jsdoc",
    "jsx-a11y",
    "node",
    "promise",
    "vitest",
  ],
  options: {
    typeAware: true,
    typeCheck: true,
  },
});
