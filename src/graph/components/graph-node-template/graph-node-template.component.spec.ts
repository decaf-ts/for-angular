/**
 * Gate-2 P0 #7 (D7) — node face unit contract.
 *
 * The rendered canvas node face (D7/G3-24/25) derives its icon from the
 * manifest icon reference: `catalogue` resolves to a Tabler sprite `<use>` href,
 * `url`/`data:` resolve to an image source, and a manifest without an icon
 * falls back to the readable category letter silhouette — never the title's first
 * character. These pure helpers are the single rendering contract; the
 * `tests/playwright/graph/node-face.spec.ts` suite asserts the same face on the
 * running demo.
 */
import {
  graphIconImageSrcOf,
  graphIconSpriteHrefOf,
  graphNodeCatalogDegradedNoticeOf,
  graphNodeLetterSilhouetteOf,
  graphNodePrimaryOutputPortIdOf,
  GraphNodeTemplateComponent,
} from './graph-node-template.component';
import { ghostNodeStore } from '../../execution/GhostNodeStore';

describe('GraphNodeTemplateComponent — node face helpers (D7/G3-24..25)', () => {
  describe('graphNodeLetterSilhouetteOf', () => {
    it('renders the readable two-token silhouette for a single-token name', () => {
      expect(graphNodeLetterSilhouetteOf('Foreach')).toBe('FE');
    });

    it('splits a camelCase / spaced name into its leading initials', () => {
      expect(graphNodeLetterSilhouetteOf('Split text')).toBe('ST');
      expect(graphNodeLetterSilhouetteOf('Log Results')).toBe('LR');
    });

    it('never reduces to the title first character', () => {
      expect(graphNodeLetterSilhouetteOf('Foreach')).not.toBe('F');
    });

    it('falls back to a placeholder for an empty name', () => {
      expect(graphNodeLetterSilhouetteOf('')).toBe('?');
    });
  });

  describe('graphIconSpriteHrefOf', () => {
    it('resolves a catalogue reference to the Tabler sprite symbol', () => {
      expect(graphIconSpriteHrefOf({ type: 'catalogue', name: 'ti-repeat' })).toBe(
        'assets/tabler-sprite.svg#tabler-repeat'
      );
    });

    it('does not resolve a non-catalogue reference to a sprite href', () => {
      expect(graphIconSpriteHrefOf({ type: 'url', url: 'https://example.test/icon.svg' })).toBeNull();
      expect(graphIconSpriteHrefOf(undefined)).toBeNull();
    });
  });

  describe('graphIconImageSrcOf', () => {
    it('resolves a url reference to its image source', () => {
      expect(graphIconImageSrcOf({ type: 'url', url: 'https://example.test/icon.svg' })).toBe(
        'https://example.test/icon.svg'
      );
    });

    it('resolves a data reference to an inline image source', () => {
      const src = graphIconImageSrcOf({
        type: 'data',
        mediaType: 'image/svg+xml',
        value: '<svg xmlns="http://www.w3.org/2000/svg"/>',
      });
      expect(src).toContain('data:image/svg+xml;utf8,');
      expect(src).toContain(encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg"/>'));
    });

    it('does not resolve a catalogue reference to an image source', () => {
      expect(graphIconImageSrcOf({ type: 'catalogue', name: 'ti-repeat' })).toBeNull();
      expect(graphIconImageSrcOf(undefined)).toBeNull();
    });
  });

  describe('graphNodePrimaryOutputPortIdOf (G3-29)', () => {
    it('prefers the first output port path', () => {
      expect(
        graphNodePrimaryOutputPortIdOf([
          { direction: 'input', property: 'value', path: 'value' } as never,
          { direction: 'output', property: 'result', path: 'out-1' } as never,
        ])
      ).toBe('out-1');
    });

    it('falls back to the output property when no path is set', () => {
      expect(
        graphNodePrimaryOutputPortIdOf([
          { direction: 'output', property: 'result' } as never,
        ])
      ).toBe('result');
    });

    it('falls back to `result` when the node exposes no output port', () => {
      expect(graphNodePrimaryOutputPortIdOf([])).toBe('result');
    });
  });

  describe('graphNodeCatalogDegradedNoticeOf (G3-28)', () => {
    it('renders no notice for a healthy catalogue', () => {
      expect(graphNodeCatalogDegradedNoticeOf('ready', null)).toEqual({
        degraded: false,
        reason: '',
      });
    });

    it('explains a backend outage in the degraded notice', () => {
      const notice = graphNodeCatalogDegradedNoticeOf('degraded', {
        kind: 'backend-down',
        message: 'offline',
      });
      expect(notice.degraded).toBe(true);
      expect(notice.reason).toContain('backend is unavailable');
    });

    it('explains an out-of-contract response in the degraded notice', () => {
      const notice = graphNodeCatalogDegradedNoticeOf('failed', {
        kind: 'malformed-response',
        message: 'out of contract',
      });
      expect(notice.degraded).toBe(true);
      expect(notice.reason).toContain('unexpected response');
    });
  });

  describe('addNodeFromConnector (G3-29)', () => {
    afterEach(() => {
      ghostNodeStore.clear();
    });

    it('records the node and its primary output port as the pending add source', () => {
      const event = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
      } as unknown as Event;
      const context = {
        node: () => ({ id: 'node-a', data: {} }),
        primaryOutputPortId: () => 'result',
      };

      GraphNodeTemplateComponent.prototype.addNodeFromConnector.call(context, event);

      expect(ghostNodeStore.pendingAddSource()).toEqual({
        nodeId: 'node-a',
        portId: 'result',
      });
      expect((event as unknown as { preventDefault: jest.Mock }).preventDefault).toHaveBeenCalled();
      expect((event as unknown as { stopPropagation: jest.Mock }).stopPropagation).toHaveBeenCalled();
    });
  });
});
