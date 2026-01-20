import { Component, Input, OnInit } from "@angular/core";
import { KeyValue } from "src/lib/engine/types";
import { IonContent } from "@ionic/angular/standalone";
import { IBaseCustomEvent, ComponentEventNames } from "src/lib/engine";
import { Model } from "@decaf-ts/decorator-validation";
import { HeaderComponent } from "src/app/components/header/header.component";
import { ContainerComponent } from "src/app/components/container/container.component";
import { CardComponent, ListComponent } from "src/lib/components";
import { AIModel, AIVendorModel } from "src/app/models/AIVendorModel";
import { NgxPageDirective } from "src/lib/engine/NgxPageDirective";
@Component({
  selector: "app-list-model",
  templateUrl: "./list-model.page.html",
  styleUrls: ["./list-model.page.css"],
  standalone: true,
  imports: [
    HeaderComponent,
    IonContent,
    ContainerComponent,
    CardComponent,
    ListComponent,
  ],
})
export class ListModelPage extends NgxPageDirective implements OnInit {
  @Input()
  type?: "infinite" | "paginated";

  data!: KeyValue[];

  override model!: AIModel | AIVendorModel;

  constructor() {
    super("ListModelPage");
    this.title = "List Component Example";
  }

  async ngOnInit() {
    await super.initialize();
    if (!this.type) this.type = "infinite";
    this.model =
      this.type === "paginated" ? new AIModel() : new AIVendorModel();
  }

  override async handleEvent(event: IBaseCustomEvent): Promise<void> {
    const { name, data } = event;
    if (name === ComponentEventNames.Refresh)
      return this.handleListRefreshEvent(data as Model[]);
  }

  handleListRefreshEvent(items: Model[]) {
    if (items.length) {
      this.data = items.reduce((accum: Model[], curr) => {
        accum.push(curr);
        return accum;
      }, [] as Model[]);
    }
  }
}
