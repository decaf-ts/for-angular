import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NgxModelRendererComponent } from './ngx-model-renderer.component';

describe('NgxModelRendererComponent', () => {
  let component: NgxModelRendererComponent;
  let fixture: ComponentFixture<NgxModelRendererComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxModelRendererComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NgxModelRendererComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
