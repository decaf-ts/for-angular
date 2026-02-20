import type { Preview } from '@storybook/angular'
// .storybook/preview.ts
if (!(globalThis as any).process) {
  (globalThis as any).process = { env: {} };
} else if (!(globalThis as any).process.env) {
  (globalThis as any).process.env = {};
}

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },
  },
};

export default preview;
