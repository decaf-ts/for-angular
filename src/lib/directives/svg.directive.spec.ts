import { Component, ElementRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { NgxSvgDirective } from './svg.directive';
import { NgxMediaService } from '../services/NgxMediaService';

@Component({
  template: `<div [ngx-decaf-svg]="path" [attr.src]="src"></div>`,
  standalone: true,
  imports: [NgxSvgDirective],
})
class TestHostComponent {
  path: string = '';
  src: string | null = null;
}

describe('NgxSvgDirective', () => {
  let mediaService: NgxMediaService;
  let httpMock: Partial<HttpClient>;

  beforeEach(() => {
    httpMock = {
      get: jest.fn().mockReturnValue(of('<svg></svg>')),
    };

    TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [
        NgxMediaService,
        { provide: HttpClient, useValue: httpMock },
      ],
    });

    mediaService = TestBed.inject(NgxMediaService);
  });

  it('baseline path and src fallback', () => {
    const spy = jest.spyOn(mediaService, 'loadSvgObserver').mockImplementation(() => {});

    // 1. Trimmed path when path is provided
    const fixture1 = TestBed.createComponent(TestHostComponent);
    fixture1.componentInstance.path = '   /assets/icon.svg   ';
    fixture1.detectChanges();

    const hostEl1 = fixture1.nativeElement.querySelector('div');
    expect(spy).toHaveBeenCalledWith(expect.anything(), '/assets/icon.svg', hostEl1);

    spy.mockClear();

    // 2. Fallback to src attribute when path is empty
    const fixture2 = TestBed.createComponent(TestHostComponent);
    fixture2.componentInstance.path = '';
    fixture2.componentInstance.src = '   /assets/fallback.svg   ';
    fixture2.detectChanges();

    const hostEl2 = fixture2.nativeElement.querySelector('div');
    expect(spy).toHaveBeenCalledWith(expect.anything(), '/assets/fallback.svg', hostEl2);
  });
});
