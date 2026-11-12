import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IconComponent } from './icon.component';

describe('IconComponent', () => {
  let component: IconComponent;
  let fixture: ComponentFixture<IconComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [IconComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(IconComponent);
    component = fixture.componentInstance;
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('baseline icon button and hidden', () => {
    component.button = false;
    fixture.detectChanges();

    const host = fixture.nativeElement;
    expect(host.getAttribute('aria-hidden')).toBe('true');
    expect(host.querySelector('ion-button')).toBeNull();

    component.button = true;
    component.ngOnInit();
    fixture.detectChanges();

    expect(host.getAttribute('aria-hidden')).toBe('false');
    expect(host.querySelector('ion-button')).not.toBeNull();
  });

  it('regression icon aria label', () => {
    component.button = true;
    (component as any).ariaLabel = 'Edit';
    component.ngOnInit();
    fixture.detectChanges();

    const ionButton = fixture.nativeElement.querySelector('ion-button');
    expect(ionButton).not.toBeNull();
    expect(ionButton.getAttribute('aria-label')).toBe('Edit');
  });

  it('icon aria label on inner button', () => {
    component.button = true;
    (component as any).ariaLabel = 'Save';
    component.ngOnInit();
    fixture.detectChanges();

    const ionButton = fixture.nativeElement.querySelector('ion-button');
    expect(ionButton).not.toBeNull();
    expect(ionButton.getAttribute('aria-label')).toBe('Save');
  });

  it('icon decorative no label', () => {
    component.button = false;
    (component as any).ariaLabel = 'Hidden';
    component.ngOnInit();
    fixture.detectChanges();

    const host = fixture.nativeElement;
    expect(host.getAttribute('aria-hidden')).toBe('true');
    expect(host.querySelector('[aria-label]')).toBeNull();
  });
});
