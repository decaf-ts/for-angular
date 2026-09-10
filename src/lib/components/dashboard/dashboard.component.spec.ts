/**
 * @module module:lib/components/dashboard/dashboard.component.spec
 * @description Component spec for the editable dashboard.
 */

import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { OperationKeys } from '@decaf-ts/db-decorators';
import { dashcomponent, dashComponentDefinitionOf } from '@decaf-ts/ui-decorators';
import { NavController } from '@ionic/angular/standalone';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { ForAngularCommonModule } from '../../for-angular-common.module';
import { I18nFakeLoader } from '../../i18n';
import { DashComponentCatalogService } from './dashboard-catalog.service';
import type { DashPaletteEntry } from './dashboard.types';
import { DashboardComponent } from './dashboard.component';

@dashcomponent('test-widget', {
  label: 'test.widget',
  defaultSize: { cols: 2, rows: 1 },
})
class TestWidget {}

function testEntry(): DashPaletteEntry {
  const def = dashComponentDefinitionOf(TestWidget);
  return { ...def, ctor: TestWidget };
}

const navControllerMock = {
  navigateRoot: jest.fn(),
  navigateForward: jest.fn(),
  navigateBack: jest.fn(),
};

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        ForAngularCommonModule,
        DashboardComponent,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: I18nFakeLoader },
        }),
      ],
      providers: [provideRouter([]), { provide: NavController, useValue: navControllerMock }],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('exposes editing affordances only in create/update mode', () => {
    component.operation = OperationKeys.CREATE;
    expect(component.isEditing).toBe(true);
    expect(component.isRead).toBe(false);
    component.operation = OperationKeys.READ;
    expect(component.isEditing).toBe(false);
    expect(component.isRead).toBe(true);
  });

  it('adds a palette entry at the first free grid cell', () => {
    component.cols = 4;
    component.rows = 4;
    component.items = [];
    component.addFromPalette(testEntry());
    expect(component.items.length).toBe(1);
    expect(component.items[0].cols).toBe(2);
    expect(component.items[0].rows).toBe(1);
    expect(component.items[0].col).toBe(1);
    expect(component.items[0].row).toBe(1);
  });

  it('rejects a placement that does not fit in the grid', () => {
    component.cols = 2;
    component.rows = 1;
    component.items = [];
    const big = { ...testEntry(), defaultSize: { cols: 4, rows: 2 } };
    component.addFromPalette(big);
    expect(component.items.length).toBe(0);
  });

  it('removes a placement after delete confirmation', () => {
    component.cols = 4;
    component.rows = 4;
    component.items = [];
    component.addFromPalette(testEntry());
    const item = component.items[0];
    component.requestDelete(item);
    expect(component.pendingDelete).toBe(item);
    component.confirmDelete();
    expect(component.pendingDelete).toBeNull();
    expect(component.items.length).toBe(0);
  });

  it('cancels deletion and keeps the placement', () => {
    component.cols = 4;
    component.rows = 4;
    component.items = [];
    component.addFromPalette(testEntry());
    component.requestDelete(component.items[0]);
    component.cancelDelete();
    expect(component.pendingDelete).toBeNull();
    expect(component.items.length).toBe(1);
  });

  it('builds a read model in read mode', () => {
    component.operation = OperationKeys.READ;
    component.cols = 4;
    component.rows = 4;
    component.items = [];
    component.addFromPalette(testEntry());
    component['afterItemsChanged']();
    expect(component.isRead).toBe(true);
    expect(component.readModel).toBeTruthy();
  });

  it('exposes the palette bounded by the @dashcomponent() registry', () => {
    const catalog = TestBed.inject(DashComponentCatalogService);
    const entries = catalog.palette();
    expect(entries.some((e) => e.tag === 'test-widget')).toBe(true);
  });
});
