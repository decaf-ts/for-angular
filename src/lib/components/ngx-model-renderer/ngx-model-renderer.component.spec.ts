import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NgxModelRendererComponent } from './ngx-model-renderer.component';
import { Model } from '@decaf-ts/decorator-validation';

describe('NgxModelRendererComponent', () => {
  let component: NgxModelRendererComponent<Model>;
  let fixture: ComponentFixture<NgxModelRendererComponent<Model>>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxModelRendererComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(NgxModelRendererComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
