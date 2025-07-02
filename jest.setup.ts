// import 'jest-preset-angular/setup-jest'; // deprecated
import { TextDecoder, TextEncoder } from 'util';
import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone';

setupZoneTestEnv();

// Jest + Ionic
Object.defineProperty(window, 'CSS', { value: null });

// JSDOM: https://thymikee.github.io/jest-preset-angular/docs/getting-started/installation/#customizing
Object.defineProperty(document, 'doctype', {
  value: '<!DOCTYPE html>',
});

Object.defineProperty(window, 'getComputedStyle', {
  value: () => ({
    display: 'none',
    appearance: ['-webkit-appearance'],
  }),
});

/**
 * Workaround for JSDOM missing transform property
 */
Object.defineProperty(document.body.style, 'transform', {
  value: () => {
    return {
      enumerable: true,
      configurable: true,
    };
  },
});

// node 18+ polyfills
global.TextEncoder = TextEncoder;
// @ts-expect-error
global.TextDecoder = TextDecoder;
