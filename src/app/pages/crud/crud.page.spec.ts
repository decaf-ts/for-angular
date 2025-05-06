import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CrudPage } from './crud.page';

describe('CrudPage', () => {
  let component: CrudPage;
  let fixture: ComponentFixture<CrudPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(CrudPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
