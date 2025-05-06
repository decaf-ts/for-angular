import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { ForAngularModule } from 'src/lib/for-angular.module';
import { ListPaginatedComponent } from './list-paginated.component';

describe('ListPaginatedComponent', () => {
  let component: ListPaginatedComponent;
  let fixture: ComponentFixture<ListPaginatedComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [ForAngularModule, ListPaginatedComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ListPaginatedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
