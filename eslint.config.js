const eslint = require("@eslint/js");
const tseslint = require("typescript-eslint");
const angular = require("angular-eslint");

module.exports = tseslint.config(
  {
    files: ["**/*.ts"],
    ignores: [
      "tests/**",
      "**/*.spec.*",
      "**/cli-module.*",
      "src/tests/**",
      "src/stories/**/*.ts",
      "src/polyfills.ts",
      "src/zone-flags.ts",
    ],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.stylistic,
      ...angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "no-useless-constructor": "off", // Rule disabled but warning kept for TypeScript rule compatibility (line below)
      "@typescript-eslint/no-useless-constructor": "warn",
      "@typescript-eslint/no-inferrable-types": "off", // disabled for compatibility with JSDoc
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-empty-function": "warn",
      "@angular-eslint/no-empty-lifecycle-method": "warn",
      "@angular-eslint/prefer-inject": "warn",
      "@angular-eslint/component-class-suffix": [
        "error",
        {
          suffixes: ["Page", "Component"],
        },
      ],
      "@angular-eslint/directive-selector": [
        "error",
        {
          type: "attribute",
          prefix: ["ngx-decaf", ""],
          style: "kebab-case",
        },
      ],
      "@angular-eslint/component-selector": [
        "error",
        {
          type: "element",
          prefix: ["app", "for-angular", "decaf", "ngx-decaf"], // changed to accept for-angular prefix, default "app"
          style: "kebab-case",
        },
      ],
    },
  },
  {
    files: ["**/*.html"],
    extends: [
      ...angular.configs.templateRecommended,
      ...angular.configs.templateAccessibility,
    ],
    rules: {},
  }
);
