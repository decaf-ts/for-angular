import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModelPage } from './model.page';

describe('ModelPage', () => {
  let component: ModelPage;
  let fixture: ComponentFixture<ModelPage>;

  beforeEach(async () => {
    fixture = TestBed.createComponent(ModelPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
