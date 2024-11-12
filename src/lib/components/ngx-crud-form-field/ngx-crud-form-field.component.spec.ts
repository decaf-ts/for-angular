import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NgxCrudFormFieldComponent } from './ngx-crud-form-field.component';

describe('NgxCrudFormFieldComponent', () => {
  let component: NgxCrudFormFieldComponent;
  let fixture: ComponentFixture<NgxCrudFormFieldComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxCrudFormFieldComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NgxCrudFormFieldComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
