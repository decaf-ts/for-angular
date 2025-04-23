import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { ForAngularModule } from 'src/lib/for-angular.module';
import { ListInfiniteComponent } from './list-infinite.component';

describe('ListInfiniteComponent', () => {
  let component: ListInfiniteComponent;
  let fixture: ComponentFixture<ListInfiniteComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [ForAngularModule, ListInfiniteComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ListInfiniteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
