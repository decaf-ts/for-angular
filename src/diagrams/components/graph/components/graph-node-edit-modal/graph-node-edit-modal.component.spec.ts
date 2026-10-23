/**
 * @module for-angular/graph/components/graph-node-edit-modal/graph-node-edit-modal.component.spec
 * @summary PR-H degraded-catalogue feedback contract (DECAF-50 §4.23 G3-28).
 * @description Proves the node CRUD modal surfaces an explicit degraded notice
 * when the catalogue is degraded, so backend-down never silently empties the
 * dynamic parameter options:
 *
 * - `degraded` renders the notice with the supplied reason;
 * - a healthy catalogue renders no notice;
 * - an empty reason falls back to the generic degraded wording.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModalController } from '@ionic/angular/standalone';

import { GraphNodeEditModalComponent } from './graph-node-edit-modal.component';

/** Renders the modal with the given degraded inputs. */
function render(
  degraded: boolean,
  degradedReason: string,
): ComponentFixture<GraphNodeEditModalComponent> {
  TestBed.configureTestingModule({
    providers: [{ provide: ModalController, useValue: {} }],
  });
  const fixture = TestBed.createComponent(GraphNodeEditModalComponent);
  fixture.componentRef.setInput('degraded', degraded);
  fixture.componentRef.setInput('degradedReason', degradedReason);
  fixture.detectChanges();
  return fixture;
}

describe('GraphNodeEditModalComponent — degraded catalogue notice (G3-28)', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('renders the degraded notice with the supplied reason', () => {
    const fixture = render(true, 'The node catalogue backend is unavailable.');

    const notice = fixture.nativeElement.querySelector(
      '.graph-node-edit-modal__degraded',
    ) as HTMLElement;

    expect(notice).not.toBeNull();
    expect(notice.getAttribute('role')).toBe('status');
    expect(notice.textContent).toContain('Catalogue degraded');
    expect(notice.textContent).toContain('The node catalogue backend is unavailable.');
  });

  it('falls back to the generic wording when no reason is supplied', () => {
    const fixture = render(true, '');

    const notice = fixture.nativeElement.querySelector(
      '.graph-node-edit-modal__degraded',
    ) as HTMLElement;

    expect(notice.textContent).toContain('some dynamic parameter options may be missing');
  });

  it('renders no notice for a healthy catalogue', () => {
    const fixture = render(false, '');

    expect(
      fixture.nativeElement.querySelector('.graph-node-edit-modal__degraded'),
    ).toBeNull();
  });
});
