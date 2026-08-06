import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
  IonContent,
  IonHeader,
  IonItem,
  IonNote,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';
import { CronSelectorComponent } from 'src/lib/components';

@Component({
  standalone: true,
  selector: 'app-cron-selector-page',
  imports: [CommonModule, IonContent, IonHeader, IonItem, IonNote, IonTitle, IonToolbar, TranslatePipe, CronSelectorComponent],
  templateUrl: './cron-selector.page.html',
  styleUrl: './cron-selector.page.scss',
})
export class CronSelectorPage {
  medicationCron = '0 9 * * *';
}
