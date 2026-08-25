import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  globalIgnores([
    "**/.next/**",
    "**/out/**",
    "**/build/**",
    "**/dist/**",
    "**/coverage/**",
    "**/node_modules/**",
    "**/next-env.d.ts",
  ]),

  ...nextVitals,
  ...nextTs,

  {
    name: "readrep/boundaries",
    rules: {
      // App Router only; this Pages Router rule cannot resolve in a monorepo.
      "@next/next/no-html-link-for-pages": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      eqeqeq: ["error", "always", { null: "ignore" }],
      "no-console": ["error", { allow: ["warn", "error"] }],
    },
  },

  {
    // Packages and services are shared libraries. They must never reach back
    // into the web application, and they must never import a video/AI runtime
    // into code that a web route can pull in. See CLAUDE.md §5.
    name: "readrep/packages-must-not-import-app",
    files: ["packages/**/*.ts", "services/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@readrep/web", "@readrep/web/*", "**/apps/web/**"],
              message:
                "Shared packages must not depend on apps/web. Dependencies point one way: apps/web -> packages.",
            },
            {
              group: ["next", "next/*", "react", "react-dom", "server-only"],
              message:
                "Shared packages must stay framework-agnostic. Keep Next.js and React usage inside apps/web.",
            },
          ],
        },
      ],
    },
  },

  {
    // Only the data-access layer may read process.env or talk to storage.
    name: "readrep/env-access-confined-to-dal",
    files: ["apps/web/src/app/**/*.ts", "apps/web/src/app/**/*.tsx"],
    rules: {
      "no-restricted-properties": [
        "error",
        {
          object: "process",
          property: "env",
          message:
            "Read configuration through src/server/config.ts. Only the data-access layer touches process.env (CLAUDE.md §6).",
        },
      ],
    },
  },

  {
    name: "readrep/tests",
    files: ["**/*.test.ts", "**/*.test.tsx", "**/scripts/**/*.ts", "**/tests/**/*.mjs"],
    rules: {
      "no-console": "off",
    },
  },
]);
