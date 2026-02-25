import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { ForAngularCommonModule } from '../../for-angular-common.module';
import { I18nFakeLoader } from '../../i18n';
import { ListComponent } from './list.component';

const imports = [
  ForAngularCommonModule,
  ListComponent,
  TranslateModule.forRoot({
    loader: {
      provide: TranslateLoader,
      useClass: I18nFakeLoader,
    },
  }),
];

describe('ListComponent', () => {
  let component: ListComponent;
  let fixture: ComponentFixture<ListComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports,
    })
      .overrideComponent(ListComponent, {
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
         `,
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(ListComponent);
    component = fixture.componentInstance;
    component.data = [];
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
