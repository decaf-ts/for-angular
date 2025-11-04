import type { StorybookConfig } from '@storybook/angular';

const config: StorybookConfig = {
  "stories": [
    "../src/**/*.mdx",
    "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"
  ],
  "framework": {
    "name": "@storybook/angular",
    "options": {}
  },
  "staticDirs": ["../src/stories/assets"],
  webpackFinal: async (config) => {
    config.performance = {
      maxAssetSize: 512000, // 500 KiB
      hints: false,         // ou 'warning' para manter os avisos
    };
    return config;
  }

};
export default config;
