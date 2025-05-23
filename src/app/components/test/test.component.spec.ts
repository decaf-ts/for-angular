import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { ForAngularModule } from 'src/lib/for-angular.module';
import { TestComponent } from './test.component';

describe('TestComponent', () => {
  let component: TestComponent;
  let fixture: ComponentFixture<TestComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [ForAngularModule, TestComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
