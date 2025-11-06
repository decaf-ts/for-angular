import { Directive, Inject, NgZone, OnDestroy, OnInit, inject } from '@angular/core';
import { fromEvent, Subject, Observable, firstValueFrom, BehaviorSubject, merge, of } from 'rxjs';
import { distinctUntilChanged, map, shareReplay, takeUntil, tap } from 'rxjs/operators';
import { NgxComponentDirective } from './NgxComponentDirective';
import { CPTKN } from '../for-angular-common.module';
import { IWindowResizeEvent } from './interfaces';
import { WindowColorScheme } from './types';



@Directive()
export abstract class NgxMediaDirective extends NgxComponentDirective implements OnInit, OnDestroy {

  private resizeSubject = new BehaviorSubject<IWindowResizeEvent>({
    width: window.innerWidth,
    height: window.innerHeight
  });

  resize$: Observable<IWindowResizeEvent> = this.resizeSubject.asObservable();

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
  }

  async ngOnInit(): Promise<void> {
    this.colorScheme$.subscribe();
  }

  async isDarkMode(): Promise<boolean> {
    return await firstValueFrom(
      this.colorScheme$.pipe(map(scheme => scheme === 'dark'))
    );
  }

  ngOnDestroy(): void {
     console.log(this.destroy$);
    this.destroy$.next();
    this.destroy$.complete();
    console.log(this.destroy$);
  }
}
