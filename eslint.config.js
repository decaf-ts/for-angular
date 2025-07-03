const eslint = require("@eslint/js");
const tseslint = require("typescript-eslint");
const angular = require("angular-eslint");

module.exports = tseslint.config(
  {
    files: ["**/*.ts"],
    ignores: ['tests/**', "**/*.spec.*", 'src/tests/**', 'src/stories/**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.stylistic,
      ...angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "no-useless-constructor": "off",
      "@typescript-eslint/no-useless-constructor": "off",
      "@typescript-eslint/no-inferrable-types": "warn",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-empty-function": "warn",
      "@angular-eslint/no-empty-lifecycle-method": "warn",
      "@angular-eslint/prefer-inject": "off",
      "@angular-eslint/component-class-suffix": [
        "error",
        {
          "suffixes": ["Page", "Component"]
        }
      ],
      "@angular-eslint/directive-selector": [
        "error",
        {
          type: "attribute",
          prefix: ["decaf", ""],
          style: "camelCase",
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
