/**
 * @module for-angular/app/components/card-title/card-title.component.spec
 * @summary SAA-722 capability-gated create affordance.
 * @description Proves the card title renders its create button only when the
 * selected engine advertises authoring: `hideCreate=true` removes the create
 * affordance entirely (a read-only engine must not render it), while
 * `hideCreate=false` keeps it for a create-allowed page.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { I18nFakeLoader } from 'src/lib/i18n';

import { AppCardTitleComponent } from './card-title.component';

/** Mounts the card title with the given create-gate inputs. */
async function render(inputs: {
  allowCreate?: boolean;
  hideCreate?: boolean;
}): Promise<ComponentFixture<AppCardTitleComponent>> {
  TestBed.configureTestingModule({
    imports: [
      AppCardTitleComponent,
      TranslateModule.forRoot({
        loader: { provide: TranslateLoader, useClass: I18nFakeLoader },
      }),
    ],
    providers: [provideRouter([])],
  });

  const fixture = TestBed.createComponent(AppCardTitleComponent);
  fixture.componentRef.setInput('title', 'Workflows');
  // Keep the switcher out of the way so the create affordance is isolated.
  fixture.componentRef.setInput('tabs', null as never);
  fixture.componentRef.setInput('allowCreate', inputs.allowCreate ?? false);
  fixture.componentRef.setInput('hideCreate', inputs.hideCreate ?? false);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture;
}

describe('AppCardTitleComponent', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('should create', async () => {
    const fixture = await render({});
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders the create button when create is allowed and not hidden (SAA-722)', async () => {
    const fixture = await render({ allowCreate: true, hideCreate: false });

    expect(fixture.nativeElement.querySelector('ion-button')).not.toBeNull();
  });

  it('renders no create button when hideCreate is true even with allowCreate (SAA-722)', async () => {
    const fixture = await render({ allowCreate: true, hideCreate: true });

    expect(fixture.nativeElement.querySelector('ion-button')).toBeNull();
  });

  it('renders no create button when create is not allowed', async () => {
    const fixture = await render({ allowCreate: false, hideCreate: false });

    expect(fixture.nativeElement.querySelector('ion-button')).toBeNull();
  });
});
