import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

/**
 * Backend-specific ESLint 9 flat config. The API is TypeScript/Node only, so it
 * deliberately does not inherit browser/React globals or rules from the web apps.
 * TypeScript compilation remains the type-aware correctness gate; lint focuses on
 * unsafe/basic source patterns without turning Phase 2 into a strictness rewrite.
 */
export default tseslint.config(
  { ignores: ["dist", "node_modules"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.ts"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.node,
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
);
