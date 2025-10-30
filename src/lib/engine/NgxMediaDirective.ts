import { Directive, Inject, NgZone, OnDestroy, inject } from '@angular/core';
import { fromEvent, Subject, Observable, firstValueFrom, BehaviorSubject } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
import { NgxComponentDirective } from './NgxComponentDirective';
import { CPTKN } from '../for-angular-common.module';
import { IWindowResizeEvent } from './interfaces';
import { WindowColorScheme } from './types';



@Directive()
export abstract class NgxMediaDirective extends NgxComponentDirective implements OnDestroy {

  private destroy$ = new Subject<void>();

  private resizeSubject = new BehaviorSubject<IWindowResizeEvent>({
    width: window.innerWidth,
    height: window.innerHeight
  });

  resize$: Observable<IWindowResizeEvent> = this.resizeSubject.asObservable();

  colorScheme$: Observable<WindowColorScheme>;

  protected zone: NgZone = inject(NgZone);

  // eslint-disable-next-line @angular-eslint/prefer-inject
  constructor(@Inject(CPTKN) localeRoot: string = "NgxPageDirective",) {
    super(localeRoot);

    // listen to window resize events outside Angular zone
    this.zone.runOutsideAngular(() => {
      fromEvent(window, 'resize')
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          const dimensions: IWindowResizeEvent = {
            width: window.innerWidth,
            height: window.innerHeight
          };

          // update within the zone to reflect in Angular
          this.zone.run(() => this.resizeSubject.next(dimensions));
        });
    });

    // listen for color scheme changes
    this.colorScheme$ = new Observable<WindowColorScheme>(observer => {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const emit = () => observer.next(mediaQuery.matches ? 'dark' : 'light');

      emit(); // valor inicial
      mediaQuery.addEventListener('change', emit);

      return () => mediaQuery.removeEventListener('change', emit);
    }).pipe(takeUntil(this.destroy$));
  }

  async isDarkMode(): Promise<boolean> {
    return await firstValueFrom(
      this.colorScheme$.pipe(map(scheme => scheme === 'dark'))
    );
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
