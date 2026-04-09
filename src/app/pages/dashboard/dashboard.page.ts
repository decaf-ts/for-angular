import { Component, OnInit } from '@angular/core';
import { IonContent } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { cardOutline, documentAttachOutline, peopleOutline } from 'ionicons/icons';
import { ContainerComponent } from 'src/app/components/container/container.component';
import { HeaderComponent } from 'src/app/components/header/header.component';
import { DashboardLayout } from 'src/app/layouts/Dashboboard';
import { CategoryModel } from 'src/app/models/CategoryModel';
import { getNgxModalCrudComponent, LayoutComponent } from 'src/lib/components';
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
    super('DashboardPage', false);
    addIcons({
      cardOutline,
      peopleOutline,
      documentAttachOutline,
    });
  }

  async ngOnInit(): Promise<void> {
    this.getData();
    this.model = new DashboardLayout();
    await super.initialize();
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

  async showFilterModal(): Promise<void> {
    const modal = await getNgxModalCrudComponent(
      new CategoryModel(),
      {
        title: 'dashboard.filter.title',
        fullscreen: true,
      },
      {
        locale: 'dashboard',
        buttons: {
          submit: { text: 'filter.apply' },
        },
      }
    );
    await modal.present();
    const { data, role } = await modal.onDidDismiss();
    if (role === 'confirm') {
      console.log(data);
    }
  }
}
