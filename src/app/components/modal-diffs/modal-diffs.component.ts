import { Component, Input, OnInit } from '@angular/core';
import { IonButton } from '@ionic/angular/standalone';
import { ModalComponent } from 'src/lib/components';
import { Dynamic } from 'src/lib/engine/decorators';
import { KeyValue } from 'src/lib/engine/types';
import { ForAngularCommonModule } from 'src/lib/for-angular-common.module';
import { ActionRoles } from 'src/lib/engine/constants';
import { CrudOperations, OperationKeys } from '@decaf-ts/db-decorators';

@Dynamic()
@Component({
  selector: 'app-modal-diffs',
  templateUrl: './modal-diffs.component.html',
  styleUrls: ['./modal-diffs.component.scss'],
  imports: [ForAngularCommonModule, IonButton],
  standalone: true,
})
export class AppModalDiffsComponent extends ModalComponent implements OnInit {
  @Input()
  diffs: Record<string, KeyValue> = {};

  @Input()
  override locale?: string;

  @Input()
  override operation: CrudOperations = OperationKeys.CREATE;

  @Input()
  confirmButton = {
    text: 'confirm',
    handle: () => this.handleAction('confirm'),
  };

  override async ngOnInit(): Promise<void> {
    await super.ngOnInit();
  }

  async handleAction(role: 'cancel' | 'confirm' = 'confirm'): Promise<void> {
    if (role === ActionRoles.cancel) {
      return await this.cancel();
    }
    return await this.confirm();
  }
}
