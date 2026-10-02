import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { NgxMediaService } from './NgxMediaService';

describe('NgxMediaService', () => {
  let service: NgxMediaService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [NgxMediaService],
    });
    service = TestBed.inject(NgxMediaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('baseline loadSvgObserver injects svg', () => {
    const rawSvg = '<svg><circle r="1"/></svg>';
    const httpMock = {
      get: jest.fn().mockReturnValue(of(rawSvg)),
    } as unknown as HttpClient;

    const target = document.createElement('div');
    service.loadSvgObserver(httpMock, '/test.svg', target);

    const svgEl = target.querySelector('svg');
    expect(svgEl).toBeTruthy();
    const circleEl = target.querySelector('circle');
    expect(circleEl).toBeTruthy();
    expect(circleEl?.getAttribute('r')).toBe('1');
  });

  it('regression svg script and handlers', () => {
    const hostileSvg =
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><circle onload="x()" r="1"/></svg>';
    const httpMock = {
      get: jest.fn().mockReturnValue(of(hostileSvg)),
    } as unknown as HttpClient;

    const target = document.createElement('div');
    service.loadSvgObserver(httpMock, '/hostile.svg', target);

    expect(target.querySelector('svg')).toBeTruthy();
    expect(target.querySelector('circle')).toBeTruthy();
    expect(target.querySelector('script')).toBeNull();
    expect(target.innerHTML).not.toContain('onload');
  });

  it('svg hostile members removed', () => {
    const cases = [
      {
        name: '<script>',
        input: '<svg><circle r="1"/><script>alert(1)</script></svg>',
        verify: (target: HTMLElement) => {
          expect(target.querySelector('circle')).toBeTruthy();
          expect(target.querySelector('script')).toBeNull();
        },
      },
      {
        name: '<foreignObject>',
        input: '<svg><circle r="1"/><foreignObject><div>hostile</div></foreignObject></svg>',
        verify: (target: HTMLElement) => {
          expect(target.querySelector('circle')).toBeTruthy();
          expect(target.querySelector('foreignObject')).toBeNull();
          expect(target.querySelector('foreignobject')).toBeNull();
        },
      },
      {
        name: 'onload= attribute',
        input: '<svg onload="alert(1)"><circle onload="x()" r="1"/></svg>',
        verify: (target: HTMLElement) => {
          expect(target.querySelector('circle')).toBeTruthy();
          expect(target.innerHTML).not.toContain('onload');
        },
      },
      {
        name: 'href="javascript:..."',
        input: '<svg><a href="javascript:alert(1)"><circle r="1"/></a></svg>',
        verify: (target: HTMLElement) => {
          expect(target.querySelector('circle')).toBeTruthy();
          expect(target.innerHTML).not.toContain('javascript:');
        },
      },
      {
        name: 'xlink:href="data:..."',
        input:
          '<svg xmlns:xlink="http://www.w3.org/1999/xlink"><use xlink:href="data:image/svg+xml,..."><circle r="1"/></use></svg>',
        verify: (target: HTMLElement) => {
          expect(target.querySelector('circle')).toBeTruthy();
          expect(target.innerHTML).not.toContain('data:');
        },
      },
    ];

    for (const c of cases) {
      const httpMock = {
        get: jest.fn().mockReturnValue(of(c.input)),
      } as unknown as HttpClient;
      const target = document.createElement('div');
      service.loadSvgObserver(httpMock, '/test.svg', target);
      c.verify(target);
    }
  });

  it('svg sprite shape preserved', () => {
    const spriteSvg =
      '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><symbol id="a" viewBox="0 0 20 20"><path d="M0 0" fill="none" stroke="black"/></symbol></svg>';
    const httpMock = {
      get: jest.fn().mockReturnValue(of(spriteSvg)),
    } as unknown as HttpClient;

    const target = document.createElement('div');
    service.loadSvgObserver(httpMock, '/sprite.svg', target);

    const symbolEl = target.querySelector('symbol');
    const pathEl = target.querySelector('path');
    expect(symbolEl).toBeTruthy();
    expect(symbolEl?.getAttribute('id')).toBe('a');
    expect(pathEl).toBeTruthy();
    expect(pathEl?.getAttribute('d')).toBe('M0 0');

    const inputDoc = new DOMParser().parseFromString(spriteSvg, 'image/svg+xml');
    const inputElements = [inputDoc.documentElement, ...Array.from(inputDoc.documentElement.querySelectorAll('*'))];
    const outputSvg = target.querySelector('svg')!;
    expect(outputSvg).toBeTruthy();
    const outputElements = [outputSvg, ...Array.from(outputSvg.querySelectorAll('*'))];

    expect(outputElements.length).toBe(inputElements.length);
    for (let i = 0; i < inputElements.length; i++) {
      const inEl = inputElements[i];
      const outEl = outputElements[i];
      expect(outEl.tagName.toLowerCase()).toBe(inEl.tagName.toLowerCase());

      const inAttrs = Array.from(inEl.attributes).map((a) => a.name).sort();
      const outAttrs = Array.from(outEl.attributes).map((a) => a.name).sort();
      expect(outAttrs).toEqual(inAttrs);

      for (const attrName of inAttrs) {
        expect(outEl.getAttribute(attrName)).toBe(inEl.getAttribute(attrName));
      }
    }
  });

  const obfuscationCases = [
    {
      name: 'newline entity in href (java&#10;script:)',
      input: '<svg><a href="java&#10;script:alert(1)"><circle r="1"/></a></svg>',
      attr: 'href',
    },
    {
      name: 'leading whitespace and mixed case href (  JaVaScRiPt:)',
      input: '<svg><a href="  JaVaScRiPt:alert(1)"><circle r="1"/></a></svg>',
      attr: 'href',
    },
    {
      name: 'newline entity in xlink:href (java&#10;script:)',
      input:
        '<svg xmlns:xlink="http://www.w3.org/1999/xlink"><use xlink:href="java&#10;script:alert(1)"><circle r="1"/></use></svg>',
      attr: 'xlink:href',
    },
    {
      name: 'leading whitespace and mixed case xlink:href (  JaVaScRiPt:)',
      input:
        '<svg xmlns:xlink="http://www.w3.org/1999/xlink"><use xlink:href="  JaVaScRiPt:alert(1)"><circle r="1"/></use></svg>',
      attr: 'xlink:href',
    },
    {
      name: 'vbscript href (vbscript:)',
      input: '<svg><a href="vbscript:alert(1)"><circle r="1"/></a></svg>',
      attr: 'href',
    },
    {
      name: 'vbscript xlink:href (vbscript:)',
      input:
        '<svg xmlns:xlink="http://www.w3.org/1999/xlink"><use xlink:href="vbscript:alert(1)"><circle r="1"/></use></svg>',
      attr: 'xlink:href',
    },
    {
      name: 'tab entity in data scheme (da&#x09;ta:)',
      input: '<svg><a href="da&#x09;ta:image/svg+xml,..."><circle r="1"/></a></svg>',
      attr: 'href',
    },
  ];

  it.each(obfuscationCases)(
    'svg scheme obfuscation vectors removed: $name',
    ({ input, attr }) => {
      const httpMock = {
        get: jest.fn().mockReturnValue(of(input)),
      } as unknown as HttpClient;
      const target = document.createElement('div');
      service.loadSvgObserver(httpMock, '/test.svg', target);

      expect(target.querySelector('circle')).toBeTruthy();
      const elements = Array.from(target.querySelectorAll('*'));
      for (const el of elements) {
        expect(el.hasAttribute(attr)).toBe(false);
      }
      expect(target.innerHTML).not.toContain('alert(1)');
      expect(target.innerHTML).not.toContain('javascript:');
      expect(target.innerHTML).not.toContain('vbscript:');
    }
  );

  const animationCases = [
    {
      name: '<animate>',
      input: '<svg><circle r="1"/><animate attributeName="href" values="javascript:alert(1)"/></svg>',
      tag: 'animate',
    },
    {
      name: '<set>',
      input: '<svg><circle r="1"/><set attributeName="href" to="javascript:alert(1)"/></svg>',
      tag: 'set',
    },
    {
      name: '<animateTransform>',
      input: '<svg><circle r="1"/><animateTransform attributeName="transform" type="rotate"/></svg>',
      tag: 'animateTransform',
    },
    {
      name: '<animateMotion>',
      input: '<svg><circle r="1"/><animateMotion path="M 0 0 L 10 10"/></svg>',
      tag: 'animateMotion',
    },
  ];

  it.each(animationCases)(
    'svg animation elements removed: $name',
    ({ input, tag }) => {
      const httpMock = {
        get: jest.fn().mockReturnValue(of(input)),
      } as unknown as HttpClient;
      const target = document.createElement('div');
      service.loadSvgObserver(httpMock, '/test.svg', target);

      expect(target.querySelector('circle')).toBeTruthy();
      expect(target.querySelector(tag.toLowerCase())).toBeNull();
      expect(target.innerHTML.toLowerCase()).not.toContain(`<${tag.toLowerCase()}`);
    }
  );

  it('svg unparseable leaves target empty', () => {
    const invalidSvg = 'not <svg';
    const httpMock = {
      get: jest.fn().mockReturnValue(of(invalidSvg)),
    } as unknown as HttpClient;

    const target = document.createElement('div');
    target.innerHTML = '<span>initial</span>';
    expect(() => {
      service.loadSvgObserver(httpMock, '/invalid.svg', target);
    }).not.toThrow();
    expect(target.innerHTML).toBe('');
  });
});

