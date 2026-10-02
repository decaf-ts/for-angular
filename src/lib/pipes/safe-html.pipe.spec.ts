import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import * as pipes from './index';
import { DecafSafeHtmlPipe } from './safe-html.pipe';

@Component({
  standalone: true,
  imports: [DecafSafeHtmlPipe],
  template: `<div [innerHTML]="markup | safeHtml"></div>`,
})
class TestHostComponent {
  markup = '<svg class="trusted"><circle r="5"></circle></svg>';
}

describe('DecafSafeHtmlPipe', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let pipe: DecafSafeHtmlPipe;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent, DecafSafeHtmlPipe],
      providers: [DecafSafeHtmlPipe],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    pipe = TestBed.inject(DecafSafeHtmlPipe);
  });

  it('exports and renders trusted markup', () => {
    expect(pipes.DecafSafeHtmlPipe).toBe(DecafSafeHtmlPipe);

    const markup = '<svg class="trusted"><circle r="5"></circle></svg>';
    const transformed = pipe.transform(markup);
    expect(transformed).toBeDefined();

    fixture.detectChanges();
    const el = fixture.nativeElement.querySelector('div');
    const svg = el?.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(svg?.classList.contains('trusted')).toBe(true);
    expect(el?.querySelector('circle')).toBeTruthy();
  });
});
