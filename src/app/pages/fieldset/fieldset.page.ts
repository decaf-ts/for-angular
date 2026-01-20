import { Component, OnInit } from "@angular/core";
import { IonContent } from "@ionic/angular/standalone";
import { FieldSetForm } from "src/app/forms/FieldsetForm";
import { OperationKeys } from "@decaf-ts/db-decorators";
import { IBaseCustomEvent, NgxPageDirective } from "src/lib/engine";
import { HeaderComponent } from "src/app/components/header/header.component";
import { ContainerComponent } from "src/app/components/container/container.component";
import { CardComponent, ModelRendererComponent } from "src/lib/components";

@Component({
  standalone: true,
  selector: "app-fieldset",
  templateUrl: "./fieldset.page.html",
  styleUrls: ["./fieldset.page.scss"],
  imports: [
    HeaderComponent,
    IonContent,
    ContainerComponent,
    CardComponent,
    ModelRendererComponent,
  ],
})
export class FieldsetPage extends NgxPageDirective implements OnInit {
  constructor() {
    super("FieldsetPage");
  }

  async ngOnInit(): Promise<void> {
    await super.initialize();
    this.globals = { operation: OperationKeys.CREATE };
    this.model = new FieldSetForm();
  }

  handleSubmit(event: IBaseCustomEvent): void {
    this.log
      .for(this.handleSubmit)
      .info(`Submit event: ${JSON.stringify(event)}`);
  }
}
