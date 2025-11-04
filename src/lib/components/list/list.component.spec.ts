import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { ForAngularCommonModule } from '../../for-angular-common.module';
import { ListComponent } from './list.component';
import { NgxRenderingEngine } from '../../engine';
import { Model, ModelBuilderFunction } from '@decaf-ts/decorator-validation';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { I18nFakeLoader } from '../../i18n';

try {
  new NgxRenderingEngine();
} catch (e) {
  // Component already registered
}

const imports = [
  ForAngularCommonModule,
  ListComponent,
  TranslateModule.forRoot({
    loader: {
      provide: TranslateLoader,
      useClass: I18nFakeLoader
    }
  })
];

describe('ListComponent', () => {
  let component: ListComponent;
  let fixture: ComponentFixture<ListComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports,
    }).overrideComponent(ListComponent, {
      add: {
         template: `
          <ion-content>
            <ion-list [inset]="inset" [lines]="lines" #component>
              <ng-content></ng-content>
            </ion-list>

             <ion-infinite-scroll
              [position]="scrollPosition"
              [threshold]="scrollThreshold"
              (ionInfinite)="handleRefresh($event)">
              <ion-infinite-scroll-content [loadingSpinner]="loadingSpinner" [loadingText]="loadingText" />
            </ion-infinite-scroll>
          </ion-content>
         `
      }
   }).compileComponents();


    fixture = TestBed.createComponent(ListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
