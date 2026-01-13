import { Directive, ElementRef, inject, Input, OnInit } from '@angular/core';
import { NgxMediaService } from '../services/NgxMediaService';
import { HttpClient } from '@angular/common/http';

@Directive({
  selector: '[ngx-decaf-svg]',
  standalone: true
})
export class NgxSvgDirective implements OnInit {

  @Input('ngx-decaf-svg')
  path!: string;

  mediaService: NgxMediaService = inject(NgxMediaService);
  element: ElementRef = inject(ElementRef);

  http: HttpClient = inject(HttpClient);

  ngOnInit(): void {
    this.path = this.path?.trim() || this.element?.nativeElement?.getAttribute('src')?.trim() || '';
    if (this.path) {
      this.mediaService.loadSvgObserver(this.http, this.path, this.element.nativeElement);
    }

  }
}
