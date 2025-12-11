import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LeafletPage } from './leaflet.page';

describe('LeafletPage', () => {
  let component: LeafletPage;
  let fixture: ComponentFixture<LeafletPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(LeafletPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
