import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { IonContent } from '@ionic/angular/standalone';
import { AppName } from 'src/app/app.config';
import { HeaderComponent } from 'src/app/components/header/header.component';
import { CardComponent } from 'src/lib/components/card/card.component';
import { NgxPageDirective } from 'src/lib/engine/NgxPageDirective';
import { KeyValue } from 'src/lib/engine/types';
import { ContainerComponent } from '../../components/container/container.component';

@Component({
  selector: 'app-account',
  templateUrl: './account.page.html',
  styleUrls: ['./account.page.scss'],
  standalone: true,
  imports: [CommonModule, HeaderComponent, IonContent, ContainerComponent, CardComponent],
})
export class AccountPage extends NgxPageDirective implements OnInit {
  account!: KeyValue;

  constructor() {
    super('Account');
  }

  async ngOnInit(): Promise<void> {
    await super.initialize();
    this.account = {
      appName: AppName,
      vault: 'server',
      agent: 'browser',
      system: 'any',
      browser: 'any',
      mode: 'dev-secure',
      vaultDomain: 'vault',
      didDomain: 'vault',
      epiDomain: 'local.epi',
      epiSubdomain: 'local.epi',
      enclaveType: 'WalletDBEnclave',
      disabledFeatures: '02, 04, 05, 06, 07, 08, 09',
      lockFeatures: false,
      epiProtocolVersion: 1,
    };
  }
}
