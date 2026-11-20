// import 'jest-preset-angular/setup-jest'; // deprecated
import { TextDecoder, TextEncoder } from 'util';
import { ReadableStream, TransformStream, WritableStream } from 'stream/web';
import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone';

setupZoneTestEnv();

// Jest + Ionic
// `writable`/`configurable` so Storybook's preview runtime can re-assign `window.CSS`
Object.defineProperty(window, 'CSS', { value: null, writable: true, configurable: true });

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

class MockIntersectionObserver {
  readonly root = null;
  readonly rootMargin = '';
  readonly thresholds: number[] = [];

  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

class MockResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

(global as Record<string, unknown>)['IntersectionObserver'] = MockIntersectionObserver;
(global as Record<string, unknown>)['ResizeObserver'] = MockResizeObserver;

// JSDOM does not expose the Web Streams globals the @ai-sdk chat transport
// stack (eventsource-parser, ai) constructs at module load.
if (typeof (global as Record<string, unknown>)['ReadableStream'] === 'undefined') {
  (global as Record<string, unknown>)['ReadableStream'] = ReadableStream;
}
if (typeof (global as Record<string, unknown>)['WritableStream'] === 'undefined') {
  (global as Record<string, unknown>)['WritableStream'] = WritableStream;
}
if (typeof (global as Record<string, unknown>)['TransformStream'] === 'undefined') {
  (global as Record<string, unknown>)['TransformStream'] = TransformStream;
}
