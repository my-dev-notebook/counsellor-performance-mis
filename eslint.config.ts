import { globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

// Note: eslint-plugin-neverthrow's `must-use-result` rule reads the
// pre-v8 `context.parserServices` API, which typescript-eslint v8 no
// longer populates (services now live on `context.sourceCode.parserServices`).
// The rule throws on every file under this toolchain, so it is omitted here;
// `Result` handling discipline (always .match/.unwrapOr/safeUnwrap) is
// enforced by code review instead.
const eslintConfig = tseslint.config(
  ...nextVitals,
  ...nextTs,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    files: ["src/**/*.ts", "src/**/*.tsx", "test/**/*.ts"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/switch-exhaustiveness-check": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
    },
  },
  {
    files: ["**/*.js", "**/*.mjs", "**/*.cjs", "*.config.ts", "*.config.mts", "eslint.config.ts"],
    extends: [tseslint.configs.disableTypeChecked],
  },
  prettier,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    ".open-next/**",
    "next-env.d.ts",
    "cloudflare-env.d.ts",
    "worker-configuration.d.ts",
    "node_modules/**",
    "coverage/**",
  ]),
);

export default eslintConfig;
