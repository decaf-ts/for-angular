import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { AppProductItemComponent } from './product-item.component';

describe('AppProductItemComponent', () => {
  let component: AppProductItemComponent;
  let fixture: ComponentFixture<AppProductItemComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [AppProductItemComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AppProductItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
