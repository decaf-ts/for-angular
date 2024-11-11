import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";

export default [
  {files: ["**/*.{js,mjs,cjs,ts}",],},
  {ignores: [
    "lib",
    "dist",
    "docs",
    "workdocs",
    "!src/**/*",
    "!tests/**/*",
    "tests/bundling/**/*",
  ],},
  {languageOptions: { globals: globals.browser, },},
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {rules: {
    // '@typescript-eslint/interface-name-prefix': 'off',
    // '@typescript-eslint/explicit-function-return-type': 'off',
    // '@typescript-eslint/explicit-module-boundary-types': 'off',
    // '@typescript-eslint/no-explicit-any': 'off',
    "indent": ["error", 2,],
    "semi": ["error", "always",],
    "quotes": ["error", "double",],
    "max-len": ["error", {
      tabWidth: 2,
      code: 100,
      ignoreComments: true,
      ignoreTrailingComments: true,
    },],
  },
  },
];