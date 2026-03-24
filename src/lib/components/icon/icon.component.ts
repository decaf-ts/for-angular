import { Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { Color } from '@ionic/core';
import { addIcons } from 'ionicons';
import * as allIcons from 'ionicons/icons';
import { shareReplay, Subject, takeUntil } from 'rxjs';
import { NgxSvgDirective } from '../../directives/svg.directive';
import { Dynamic } from '../../engine/decorators';
import { NgxMediaService } from '../../services/NgxMediaService';

@Dynamic()
@Component({
  selector: 'ngx-decaf-icon',
  templateUrl: './icon.component.html',
  styleUrls: ['./icon.component.scss'],
  imports: [NgxSvgDirective, IonIcon, IonButton],
  standalone: true,
  host: { '[attr.id]': 'uid', '[attr.aria-hidden]': '!button' },
})
export class IconComponent implements OnInit, OnDestroy {
  /** @description Reference to the component's native DOM element.
   * @summary Provides direct access to the native DOM element of the component through Angular's
   * ViewChild decorator. This reference can be used to manipulate the DOM element directly,
   * apply custom styles, or access native element properties and methods. The element is
   * identified by the 'component' template reference variable.
   * @type {ElementRef}
   * @memberOf module:lib/engine/NgxComponentDirective
   */
  @ViewChild('component', { read: ElementRef, static: false })
  component!: ElementRef;

  @Input()
  name?: string;

  @Input()
  color: Color = 'dark';

  @Input()
  slot?: 'start' | 'end' | 'icon-only' = 'icon-only';

  @Input()
  button: boolean = false;

  @Input()
  buttonFill: 'clear' | 'outline' | 'solid' | 'default' = 'clear';

  @Input()
  buttonShape: 'round' | 'default' = 'round';

  @Input()
  width!: string;

  @Input()
  size?: 'large' | 'small' | 'default' = 'default';

  type: 'image' | 'ionic' | 'icon' = 'ionic';

  isSvg: boolean = false;

  initialized: boolean = false;

  @Input()
  inline: boolean = false;

  isDarkMode: boolean = false;

  mediaService: NgxMediaService = new NgxMediaService();

  protected destroySubscriptions$ = new Subject<void>();

  constructor() {
    addIcons(allIcons);
  }

  ngOnInit(): void {
    if (this.button) this.slot = 'icon-only';
    if (this.name?.includes('.')) {
      this.type = 'image';
      this.isSvg = this.name.endsWith('.svg');
    }

    if (this.name?.includes('ti-')) {
      this.type = 'icon';
      this.name = `ti-${this.name.replace(/ti-/g, '')}`;
    }
    this.mediaService
      .isDarkMode()
      .pipe(shareReplay({ bufferSize: 1, refCount: true }), takeUntil(this.destroySubscriptions$))
      .subscribe((isDark) => {
        this.isDarkMode = isDark;
      });
    this.initialized = true;
  }

  /**
   * @description Cleanup lifecycle hook invoked when the directive is destroyed.
   * @summary Ensures any resources allocated by the directive's media service are
   * released (DOM listeners, timers, subscriptions, etc.). Implementations should
   * keep `mediaService.destroy()` idempotent; calling it here prevents leaks when
   * components are torn down.
   * @returns {Promise<void>}
   */
  async ngOnDestroy(): Promise<void> {
    this.mediaService.destroy();
    if (this.destroySubscriptions$) {
      this.destroySubscriptions$.next();
      this.destroySubscriptions$.complete();
    }
  }
}
