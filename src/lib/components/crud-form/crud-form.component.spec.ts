import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { CrudFormComponent } from './crud-form.component';

describe('FormReactiveComponent', () => {
  let component: CrudFormComponent;
  let fixture: ComponentFixture<CrudFormComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), CrudFormComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CrudFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
