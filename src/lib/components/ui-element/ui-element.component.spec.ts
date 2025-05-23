import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { ForAngularModule } from 'src/lib/for-angular.module';
import { UiElementComponent } from './ui-element.component';

describe('UiElementComponent', () => {
  let component: UiElementComponent;
  let fixture: ComponentFixture<UiElementComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [ForAngularModule, UiElementComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(UiElementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
