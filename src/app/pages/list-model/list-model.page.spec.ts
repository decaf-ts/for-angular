import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ListModelPage } from './list-model.page';

describe('ListModelPage', () => {
  let component: ListModelPage;
  let fixture: ComponentFixture<ListModelPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ListModelPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
