import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BatchesPage } from './batches.page';

describe('BatchesPage', () => {
  let component: BatchesPage;
  let fixture: ComponentFixture<BatchesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(BatchesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
