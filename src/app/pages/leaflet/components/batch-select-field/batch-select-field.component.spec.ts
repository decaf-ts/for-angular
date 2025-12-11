import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { BatchSelectFieldComponent } from './batch-select-field.component';

describe('BatchSelectFieldComponent', () => {
  let component: BatchSelectFieldComponent;
  let fixture: ComponentFixture<BatchSelectFieldComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [BatchSelectFieldComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BatchSelectFieldComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
