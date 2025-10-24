import { Component, OnInit } from '@angular/core';
import { IonContent } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { cardOutline, peopleOutline, documentAttachOutline  } from 'ionicons/icons';
import { DashboardLayout } from 'src/app/layouts/Dashboboard';
import { HeaderComponent } from 'src/app/components/header/header.component';
import { ContainerComponent } from 'src/app/components/container/container.component';
import { LayoutComponent } from 'src/lib/components';
import { NgxPageDirective } from 'src/lib/engine';
@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
   imports: [HeaderComponent, ContainerComponent, IonContent, LayoutComponent],
})
export class DashboardPage extends NgxPageDirective implements OnInit {

  users!: number;
  incoming!: number;
  tasks!: number;
  lastUsage!: string;

  constructor() {
    super("DashboardPage", true);
    addIcons({
      cardOutline,
      peopleOutline,
      documentAttachOutline,
    });
  }

  ngOnInit() {
    this.getData();
    this.model = new DashboardLayout;
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

}
