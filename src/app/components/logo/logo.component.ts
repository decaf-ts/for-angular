import { Component, Input, OnInit  } from '@angular/core';
import { IonImg } from '@ionic/angular/standalone';
import { getWindow } from 'src/lib/helpers';


@Component({
  selector: 'app-logo',
  templateUrl: './logo.component.html',
  styleUrls: ['./logo.component.scss'],
  imports: [IonImg],
  standalone: true,

})
export class LogoComponent implements OnInit {

  @Input()
  showAngularLogo = true;

  @Input()
  logo = '/assets/images/decaf-logo.svg';

  @Input()
  logoContrast = '/assets/images/decaf-logo-lw.svg';

  @Input()
  width: number | string = 180;

  activeLogo!: string;

  /**
   * Lifecycle hook that is called after data-bound properties of a directive are initialized.
   * This method is part of Angular's component lifecycle and is used for any additional initialization tasks.
   *
   * @returns {void} This method does not return a value.
   */
  ngOnInit(): void {
    const win = getWindow() as Window;
    const colorSchemePreference = win.matchMedia('(prefers-color-scheme: dark)');
    this.activeLogo = colorSchemePreference.matches ? this.logoContrast : this.logo;
      this.width = `${this.width}`.replace('px','');
    colorSchemePreference.addEventListener('change', () => {
      this.activeLogo = colorSchemePreference.matches ? this.logoContrast : this.logo;
    });

  }

}
