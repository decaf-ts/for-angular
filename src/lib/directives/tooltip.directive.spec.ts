import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DecafTooltipDirective } from './tooltip.directive';
import { ITooltipConfig } from '../engine/interfaces';

@Component({
  template: `<span [ngx-decaf-tooltip]="options">Initial</span>`,
  standalone: true,
  imports: [DecafTooltipDirective],
})
class TestHostComponent {
  options: string | ITooltipConfig = '';
}

describe('DecafTooltipDirective', () => {
  let fixture: ComponentFixture<TestHostComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TestHostComponent],
    });
    fixture = TestBed.createComponent(TestHostComponent);
  });

  it('baseline truncate and tooltip text', () => {
    fixture.componentInstance.options = {
      text: '<b>Hello</b> World this is a very long text that exceeds limit',
      truncate: true,
      limit: 15,
      trail: '...',
    };
    fixture.detectChanges();

    const hostSpan = fixture.nativeElement.querySelector('span');
    expect(hostSpan).toBeTruthy();
    expect(hostSpan.classList.contains('dcf-tooltip-parent')).toBe(true);

    const tooltipSpan = hostSpan.querySelector('span.dcf-tooltip');
    expect(tooltipSpan).toBeTruthy();

    // Tooltip span text has tags stripped
    expect(tooltipSpan.textContent).toBe('Hello World this is a very long text that exceeds limit');
    expect(tooltipSpan.innerHTML).not.toContain('<b>');

    // Host visible text has tags stripped and is truncated
    expect(hostSpan.textContent).toContain('Hello World thi...');
    expect(hostSpan.innerHTML).not.toContain('<b>');
  });
});
