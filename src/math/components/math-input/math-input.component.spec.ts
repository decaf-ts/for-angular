import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { MathInputComponent } from './math-input.component';

jest.mock('mathlive', () => ({}));

describe('MathInputComponent', () => {
  let component: MathInputComponent;
  let fixture: ComponentFixture<MathInputComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [MathInputComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MathInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders the MathLive custom element', () => {
    const field = fixture.nativeElement.querySelector('math-field');
    expect(field).toBeTruthy();
  });

  it('emits the LaTeX value on input', () => {
    const values: string[] = [];
    component.value.subscribe((value) => values.push(value));

    component.onInput({ target: { value: '\\frac{1}{2}' } } as unknown as Event);

    expect(component.value()).toBe('\\frac{1}{2}');
    expect(values).toEqual(['\\frac{1}{2}']);
  });

  it('accepts a two-way bound value', () => {
    component.value.set('x^{2}');
    fixture.detectChanges();

    expect(component.value()).toBe('x^{2}');
  });

  it('applies the placeholder and disabled state to the field', () => {
    fixture.componentRef.setInput('placeholder', 'Type here');
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();

    const field = fixture.nativeElement.querySelector('math-field') as {
      placeholder: string;
      readOnly: boolean;
    };
    expect(field.placeholder).toBe('Type here');
    expect(field.readOnly).toBe(true);
  });
});
