import { Component, OnInit } from '@angular/core';
import { IonContent } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';
import { ComponentEventNames } from '@decaf-ts/ui-decorators';
import { HeaderComponent } from 'src/app/components/header/header.component';
import { ContainerComponent } from 'src/app/components/container/container.component';
import { NgxModelPageDirective } from 'src/lib/engine';
import { IBaseCustomEvent } from 'src/lib/engine/interfaces';
import { AppCardTitleComponent } from 'src/app/components/card-title/card-title.component';
import { TableComponent } from 'src/lib/components/table/table.component';
import { Audit } from 'src/app/ew/fabric/Audit';
import { downloadAsCsv } from 'src/app/ew/fabric/handlers/AuditHandler';

@Component({
  selector: 'app-audit',
  templateUrl: './audit.page.html',
  styleUrls: ['./audit.page.scss'],
  standalone: true,
  imports: [
    TranslatePipe,
    HeaderComponent,
    AppCardTitleComponent,
    IonContent,
    TableComponent,
    ContainerComponent,
  ],
})
export class AuditPage extends NgxModelPageDirective implements OnInit {
  override _data: Audit[] = [];

  constructor() {
    super('Audit', false);
    this.title = `${this.locale}.title`;
  }

  async ngOnInit(): Promise<void> {
    this.model = new Audit();
    this.operations = [];
    this.title = `${this.locale}.title`;
    await super.initialize();
  }

  override async handleEvent(event: IBaseCustomEvent): Promise<void> {
    const { name, data } = event;
    if (name === ComponentEventNames.Refresh) {
      this._data = data as Audit[];
    }
  }

  async exportCsvFile(): Promise<void> {
    downloadAsCsv(this._data as Audit[], `${Date.now()}`, [
      'User',
      'Group',
      'Table',
      'Transaction',
      'Action',
    ]);
  }

  // async handleTabChangeEvent(event: IBaseCustomEvent): Promise<void> {
  //   const { data } = event;
  //   this.model = undefined;
  //   this.changeSubscription = timer(10).pipe(takeUntil(this.destroySubscriptions$), shareReplay(1)).subscribe(() => {
  //     if ('access' === data) {
  //       this.model = new Audit();
  //     } else {
  //       this.model = new ActionLog();
  //     }
  //     this.changeSubscription.unsubscribe();
  //   });
  // }
}
