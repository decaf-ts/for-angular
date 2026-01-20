import { Component, OnInit } from "@angular/core";
import { IonContent } from "@ionic/angular/standalone";
import { TranslatePipe } from "@ngx-translate/core";
import { HeaderComponent } from "src/app/components/header/header.component";
import { ContainerComponent } from "src/app/components/container/container.component";
import { NgxModelPageDirective } from "src/lib/engine";
import { IBaseCustomEvent } from "src/lib/engine/interfaces";
import { AppCardTitleComponent } from "src/app/components/card-title/card-title.component";
import { TableComponent } from "src/lib/components/table/table.component";
import { Subscription } from "rxjs";
import { Audit } from "src/app/ew/fabric/Audit";

@Component({
  selector: "app-audit",
  templateUrl: "./audit.page.html",
  styleUrls: ["./audit.page.scss"],
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
  /**
   * @description Subscription for timer-based operations.
   * @summary Manages the timer subscription used for asynchronous operations
   * like updating active children after page transitions. This subscription
   * is cleaned up in ngOnDestroy to prevent memory leaks.
   *
   * @private
   * @type {Subscription}
   */
  protected changeSubscription!: Subscription;

  constructor() {
    super("Audit", false);
    this.title = `${this.locale}.title`;
  }

  async ngOnInit(): Promise<void> {
    await super.initialize();
    this.model = new Audit();
    this.operations = [];
    this.title = `${this.locale}.title`;
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

  override async ngOnDestroy(): Promise<void> {
    await super.ngOnDestroy();
    if (this.changeSubscription) this.changeSubscription.unsubscribe();
  }

  override async handleEvent(event: IBaseCustomEvent): Promise<void> {}
}
