import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { AppSelectFieldComponent } from './select-field.component';

describe('AppSelectFieldComponent', () => {
  let component: AppSelectFieldComponent;
  let fixture: ComponentFixture<AppSelectFieldComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [AppSelectFieldComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AppSelectFieldComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
