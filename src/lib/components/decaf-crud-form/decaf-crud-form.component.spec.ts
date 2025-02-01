import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { DecafCrudFormComponent } from './decaf-crud-form.component';

describe('FormReactiveComponent', () => {
  let component: DecafCrudFormComponent;
  let fixture: ComponentFixture<DecafCrudFormComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [IonicModule.forRoot(), DecafCrudFormComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DecafCrudFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
