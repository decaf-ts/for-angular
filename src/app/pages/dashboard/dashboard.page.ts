import { Component, OnInit } from '@angular/core';
import { IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonIcon } from '@ionic/angular/standalone';
import { ForAngularComponentsModule } from 'src/lib/components/for-angular-components.module';
import { ComponentsModule } from 'src/app/components/components.module';
import { addIcons  } from 'ionicons';
import { cardOutline, peopleOutline, documentAttachOutline  } from 'ionicons/icons';
import { DashboardLayout } from 'src/app/layouts/Dashboboard';
import { RendererCustomEvent } from 'src/lib/engine';
@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [ForAngularComponentsModule, IonCard, IonIcon, IonCardHeader, IonCardTitle, IonCardContent, ComponentsModule],
})
export class DashboardPage implements OnInit {

  users!: number;
  incoming!: number;
  tasks!: number;
  lastUsage!: string;
  model!: DashboardLayout;
  constructor() {
    addIcons({
      cardOutline,
      peopleOutline,
      documentAttachOutline,
    });
  }

  ngOnInit() {
    this.getData();
    this.model = new DashboardLayout;
    console.log(this.model);
    console.log(this.model);
  }

  getData() {
    this.users = this.random(120, 580);
    this.incoming = this.random(15000, 58000);
    this.tasks = this.random(3, 20);
    this.lastUsage = new Date().toLocaleString();
  }

  private random(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  handleEvent(event: RendererCustomEvent): void {
    console.log('Event received:', event);
  }

}
