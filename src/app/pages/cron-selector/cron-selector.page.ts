import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { IonContent } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';
import { HeaderComponent } from 'src/app/components/header/header.component';
import { ContainerComponent, CronSelectorComponent } from 'src/lib/components';

@Component({
  standalone: true,
  selector: 'app-cron-selector-page',
  imports: [CommonModule, ContainerComponent, IonContent, HeaderComponent, TranslatePipe, CronSelectorComponent],
  templateUrl: './cron-selector.page.html',
  styleUrl: './cron-selector.page.scss',
})
export class CronSelectorPage {
  medicationCron = '0 9 * * *';

  onCronChange(cron: string): void {
    console.log('[cron-selector] changed:', cron);
  }
}
