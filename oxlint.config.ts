import { defineConfig } from "oxlint";

export default defineConfig({
  plugins: [
    "eslint",
    "typescript",
    "unicorn",
    "import",
    "node",
    "promise",
    "vitest",
    "react",
    "react-perf",
  ],
  options: {
    typeAware: true,
    typeCheck: true,
  },
});
