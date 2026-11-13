import { Component, EventEmitter, Input, Output } from "@angular/core";
import { FormsModule } from "@angular/forms";
import {
  IonButton,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
} from "@ionic/angular/standalone";

@Component({
  selector: "ngx-decaf-add-properties",
  templateUrl: "./add-properties.component.html",
  styleUrls: ["./add-properties.component.scss"],
  standalone: true,
  imports: [IonInput, IonItem, IonLabel, IonButton, IonIcon, FormsModule],
})
export class AddPropertiesComponent {
  @Input() classNames!: string;
  @Input() inputObject: object = {};
  @Input() readonlyProperties: string[] = [];
  @Output() objectBuild = new EventEmitter<object>();

  newKey!: string | undefined;
  newValue: any;
  builtObject: object = {};

  constructor() {}

  constructObject(newKey: string | undefined, newValue: any): void {
    let newproperty = {};
    if (newKey)
      newproperty = {
        [newKey]: newValue,
      };
    this.builtObject = Object.assign(
      {},
      this.inputObject,
      this.builtObject,
      newproperty
    );
    this.newKey = undefined;
    this.newValue = undefined;
  }

  ngOnChanges() {
    this.constructObject(this.newKey, this.newValue);
  }

  modifyProperty(propName: string, propValue: any) {
    if (!propName) return;
    (this.builtObject as any)[propName] = propValue;
    this.buildObject();
  }

  deleteProperty(propName: string) {
    if (!propName) return;
    delete this.builtObject[propName as keyof object];
    this.objectBuild.emit(this.builtObject);
  }

  objectKeys(): string[] {
    return Object.keys({ ...this.inputObject, ...this.builtObject });
  }

  buildObject() {
    this.constructObject(this.newKey, this.newValue);
    console.log("buildObject:", this.builtObject);
    this.objectBuild.emit(this.builtObject);
  }
}
