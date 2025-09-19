// import 'jest-preset-angular/setup-jest'; // deprecated
import { TextDecoder, TextEncoder } from 'util';
import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone';

setupZoneTestEnv();

// Jest + Ionic
Object.defineProperty(window, 'CSS', { value: null });

// Mocking window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // obsoleto
    removeListener: jest.fn(), // obsoleto
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

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

(global as Record<string, unknown>)['TextEncoder'] = TextEncoder;
(global as Record<string, unknown>)['TextDecoder'] = TextDecoder;
