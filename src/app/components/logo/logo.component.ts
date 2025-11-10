import { Component, inject, Input, OnInit  } from '@angular/core';
import { IonImg } from '@ionic/angular/standalone';
import { NgxMediaService } from 'src/lib/services/NgxMediaService';


@Component({
  selector: 'app-logo',
  templateUrl: './logo.component.html',
  styleUrls: ['./logo.component.scss'],
  imports: [IonImg],
  standalone: true,

})
export class LogoComponent implements OnInit {

  @Input()
  showAngularLogo = false;

  @Input()
  logo = '/assets/images/decaf-logo.svg';

  @Input()
  logoContrast = '/assets/images/decaf-logo-contrast.svg';

  @Input()
  width: number | string = 180;

  mediaService = inject(NgxMediaService);

  activeLogo!: string;

  /**
   * Lifecycle hook that is called after data-bound properties of a directive are initialized.
   * This method is part of Angular's component lifecycle and is used for any additional initialization tasks.
   *
   * @returns {void} This method does not return a value.
   */
  async ngOnInit(): Promise<void> {
    this.mediaService.isDarkMode().subscribe(isDark => {
      this.activeLogo = (isDark ? this.logoContrast : this.logo ) as string;
    });
  }

}
