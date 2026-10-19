import { Component, Input, OnInit } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { AppSwitcherComponent } from '../switcher/switcher.component';
import { ITabItem } from 'src/app/ew/utils/interfaces';
import { NgxComponentDirective } from 'src/lib/engine/NgxComponentDirective';
import { OperationKeys } from '@decaf-ts/db-decorators';

@Component({
  selector: 'app-card-title',
  templateUrl: './card-title.component.html',
  styleUrls: ['./card-title.component.scss'],
  standalone: true,
  imports: [TranslatePipe, AppSwitcherComponent],
})
export class AppCardTitleComponent extends NgxComponentDirective implements OnInit {
  @Input({ required: true })
  title?: string = '';

  @Input()
  subtitle?: string = '';

  @Input()
  allowCreate: boolean = false;

  /**
   * Disables the create button in place (SAA-707) when the selected engine's
   * capability manifest blocks creating a workflow, keeping the affordance visible
   * for discoverability instead of hiding it.
   */
  @Input()
  createDisabled: boolean = false;

  /**
   * Hides the create button entirely (SAA-722) when the selected engine's
   * capability manifest does not advertise authoring. Distinct from
   * {@link createDisabled}, which keeps the affordance visible but inert; a
   * read-only engine must not render a create action at all.
   */
  @Input()
  hideCreate: boolean = false;

  /** Optional tooltip explaining why the create button is disabled. */
  @Input()
  createTitle: string = '';

  @Input()
  tabs: ITabItem[] = [];

  @Input()
  override borders: boolean = true;

  @Input()
  override operation: OperationKeys | undefined = undefined;

  @Input()
  createButton = {
    text: 'create',
    color: 'primary',
    handle: async () => await this.handleRedirect(),
  };

  constructor() {
    super('AppCardTitleComponent');
  }

  async ngOnInit(): Promise<void> {
    // await this.initProps(this.props);
    if (!this.allowCreate)
      this.allowCreate = this.isAllowed(this.operation || OperationKeys.CREATE);
  }

  async handleRedirect(): Promise<void> {
    await this.router.navigateByUrl(`${this.route}/create`);
  }
}
