import {
  Component,
  computed,
  effect,
  ElementRef,
  EventEmitter,
  inject,
  input,
  Input,
  Output,
  signal,
  untracked,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import {
  apply,
  DecorationKeys,
  metadata,
  Metadata,
  propMetadata,
  uses,
  type Constructor,
} from "@decaf-ts/decoration";
import { pk } from "@decaf-ts/core";
import { OperationKeys } from "@decaf-ts/db-decorators";
import { Model, ModelBuilder } from "@decaf-ts/decorator-validation";
import {
  hideOn,
  uielement,
  uichild,
  UIKeys,
  uilayout,
  uilayoutprop,
  uilistmodel,
  uilistprop,
  uimodel,
  uiorder,
} from "@decaf-ts/ui-decorators";
import {
  IonAccordion,
  IonAccordionGroup,
  IonButton,
  IonCheckbox,
  IonInput,
  IonItem,
  IonLabel,
  IonSelect,
  IonTextarea,
  IonToolbar,
} from "@ionic/angular/standalone";
import { AddPropertiesComponent } from "../add-properties/add-properties.component";
import { addIcons } from "ionicons";
import {
  removeCircleOutline,
  checkmarkCircleOutline,
  chevronForwardOutline,
  chevronDownOutline,
  folderOpen,
} from "ionicons/icons";
import { IconComponent } from "../icon/icon.component";
import { ModelRendererComponent } from "../model-renderer/model-renderer.component";

type PropType = "string" | "number" | "date" | "boolean" | "model";

export enum ModelBuilderBlacklist {
  UILAYOUT = uilayout.name as unknown as number,
  UILAYOUTPROP = uilayoutprop.name as unknown as number,
  HIDEON = hideOn.name as unknown as number,
  UIELEMENT = uielement.name as unknown as number,
  UILISTMODEL = uilistmodel.name as unknown as number,
  UILISTPROP = uilistprop.name as unknown as number,
  // UIMODEL = uimodel.name as unknown as number,
  UIORDER = uiorder.name as unknown as number,
  UICHILD = uichild.name as unknown as number,
}

type ComponentTag =
  | "ngx-decaf-crud-field"
  | "ngx-decaf-file-upload"
  | "ngx-decaf-searchbar"
  | "ngx-decaf-table"
  | "ngx-decaf-list"
  | "ngx-decaf-fieldset"
  | "app-select-field"
  | "input"
  | "textarea"
  | "custom";

type LayoutCol = 1 | 2 | "half" | "full";
type OrderValue = "first" | "last" | "";
type HideOnOp = "create" | "read" | "update" | "delete";

interface ValidatorConfig {
  required: boolean;
  min: number | null;
  max: number | null;
  minlength: number | null;
  maxlength: number | null;
  pattern: string;
  email: boolean;
  url: boolean;
}

interface UIElementConfig {
  uielement: boolean;
  tag: string;
  customTag: string;
  label: string;
  placeholder: string;
  type: string;
  readonly: boolean;
  translatable: boolean;
  options: string;
  uilistprop?: UiListProp;
  uilistpropExpanded?: boolean;
  uilayoutprop?: UiLayoutProp;
}

interface UILayoutConfig {
  col: LayoutCol;
  row: number;
  order: OrderValue;
  orderNum: number | null;
  hideOn: HideOnOp[];
}

interface PropertyConfig {
  name: string;
  type: PropType;
  modelType?: Constructor;
  uiChild?: UiChildConfig | Record<string, any>;
  primaryKey: boolean;
  validators: ValidatorConfig;
  ui: UIElementConfig;
  layout: UILayoutConfig;
  expanded: boolean;
}

interface ModelConfig {
  name: string;
  description: string;
  renderTag: string;
  layoutTag: string;
  layoutCols: number;
  layoutRows: number;
  listModelTag: string;
  flavour?: string;
  hasUilayout?: boolean | undefined;
}

interface UiChildConfig {
  modelName?: string;
  tag?: string;
  props?: Record<string, unknown>;
  isArray?: boolean;
  serialize?: boolean;
  constructorFN?: Constructor;
  uilistpropExpanded?: boolean;
}

interface UiListProp {
  name?: string;
  props?: Record<string, any>;
}

interface UiLayoutProp {
  props?: UiLayoutPropLayout;
}

interface UiLayoutPropLayout {
  col?: LayoutCol;
  row?: number;
}
interface InnerModelErrors { errors: string[]; modelName: string };

const DEFAULT_UICHILD: Partial<UiChildConfig> = {
  tag: "ngx-decaf-fieldset",
  isArray: false,
  serialize: false,
  uilistpropExpanded: false,
};

const DEFAULT_VALIDATORS: ValidatorConfig = {
  required: false,
  min: null,
  max: null,
  minlength: null,
  maxlength: null,
  pattern: "",
  email: false,
  url: false,
};

const DEFAULT_UI: UIElementConfig = {
  uielement: true,
  tag: "ngx-decaf-crud-field",
  customTag: "",
  label: "",
  placeholder: "",
  type: "text",
  readonly: false,
  translatable: true,
  options: "",
};

const DEFAULT_LAYOUT: UILayoutConfig = {
  col: 1,
  row: 1,
  order: "",
  orderNum: null,
  hideOn: [],
};

const COMPONENT_TAGS: { value: ComponentTag; label: string }[] = [
  {
    value: "ngx-decaf-crud-field",
    label: "CRUD Field (text/number/date/checkbox/select)",
  },
  { value: "ngx-decaf-file-upload", label: "File Upload" },
  { value: "ngx-decaf-searchbar", label: "Search Bar" },
  { value: "ngx-decaf-table", label: "Table" },
  { value: "ngx-decaf-list", label: "List" },
  { value: "ngx-decaf-fieldset", label: "Fieldset (nested group)" },
  { value: "app-select-field", label: "Select Field (custom)" },
  { value: "input", label: "Raw HTML Input" },
  { value: "textarea", label: "Raw HTML Textarea" },
  { value: "custom", label: "Custom (specify tag)" },
];

const INPUT_TYPES = [
  "text",
  "number",
  "date",
  "checkbox",
  "select",
  "textarea",
  "radio",
  "email",
  "password",
  "url",
  "tel",
  "search",
  "color",
  "range",
  "time",
  "week",
  "month",
  "datetime-local",
  "file",
];

const HIDE_ON_OPS: HideOnOp[] = ["create", "read", "update", "delete"];

function clearUiMetadata(decoratorKey: string, metadataLocation?: string) {
  return function clearMetadata(model: any, prop?: any) {
    let targetModel = model;
    targetModel =
      typeof model === "function"
        ? model
        : (model as { constructor?: any }).constructor || model;

    if (!metadataLocation) {
      metadataLocation = Metadata.key(UIKeys.REFLECT);
      if (prop)
        metadataLocation = Metadata.key(
          metadataLocation,
          DecorationKeys.PROPERTIES,
          prop.toString()
        );
    }
    const uiMetadata = Metadata.get(targetModel, metadataLocation);
    if (!uiMetadata || !uiMetadata[decoratorKey]) return;
    console.log(
      `Removing decorator ${decoratorKey} for  ${prop ? "prop:" : "model"} :`,
      prop ? prop : model.name
    );
    delete uiMetadata[decoratorKey];
    if (prop) propMetadata(metadataLocation, uiMetadata)(targetModel, prop);
    else metadata(metadataLocation, uiMetadata)(targetModel);
  };
}

function clearUiDecoratorMetadata(decoratorKey: string, metadataKey?: string) {
  return apply(clearUiMetadata(decoratorKey, metadataKey));
}

// Merge Metadata after a model Modification
/**
 *
 * @param source The updated constructor
 * @param target The initial constructor
 */
function mergeModelMetadata(source: Constructor, target: Constructor): void {
  const merge = (current: any, next: any): any => {
    if (
      !current ||
      !next ||
      typeof current !== "object" ||
      typeof next !== "object" ||
      Array.isArray(current) ||
      Array.isArray(next)
    ) {
      return Array.isArray(next) ? [...next] : next;
    }

    const result = { ...current };
    for (const [key, value] of Object.entries(next)) {
      result[key] =
        value && typeof value === "object" && !Array.isArray(value)
          ? merge(result[key], value)
          : Array.isArray(value)
            ? [...value]
            : value;
    }
    return result;
  };

  // Keep the registered model class (and its repository/database decorators),
  // while bringing across the builder's attributes, validation, and UI config.
  for (const key of ["properties", "validation", "ui"]) {
    const sourceValue = Metadata.get(source, key);
    if (sourceValue === undefined) continue;
    Metadata.set(target, key, merge(Metadata.get(target, key), sourceValue));
  }
}

function makeProperty(name = "", type: PropType = "string"): PropertyConfig {
  return {
    name,
    type,
    primaryKey: false,
    validators: { ...DEFAULT_VALIDATORS },
    ui: { ...DEFAULT_UI, label: name.charAt(0).toUpperCase() + name.slice(1) },
    layout: { ...DEFAULT_LAYOUT },
    expanded: false,
  };
}

function generateUiListProp(
  name?: string,
  props?: any
): UiListProp | undefined {
  if (!name && props) return;
  const returnObject: UiListProp = { props: {} };
  if (name) returnObject.name = name;
  if (props) returnObject.props = props;
  return returnObject;
}

function resolveTag(ui: UIElementConfig): string {
  return ui.tag === "custom" ? ui.customTag || "input" : ui.tag;
}

function resolveInputType(propType: PropType, uiType: string): string {
  if (uiType && uiType !== "text") return uiType;
  switch (propType) {
    case "number":
      return "number";
    case "date":
      return "date";
    case "boolean":
      return "checkbox";
    default:
      return "text";
  }
}

function parseOptions(optionsStr: string): { value: string; label: string }[] {
  if (!optionsStr.trim()) return [];
  return optionsStr.split(",").map((s) => {
    const trimmed = s.trim();
    const parts = trimmed.split(":");
    return { value: parts[0].trim(), label: (parts[1] || parts[0]).trim() };
  });
}

/**
 * @property {Constructor} inputModelConstructor External constructor 
 * @property {Model} inputModel External model instance (Constructor has priority and works better)
 * @property {boolean} preview External constructor 
 * @property {string} flavour External constructor 
 * @property {string[]} blacklist External constructor 
 * @event (modelBuild) The event that will contain the builtModel instance
 * @example
 * In a parent component     
 * <ngx-decaf-model-builder
      [inputModelConstructor]="ModelClass"
      [inputModel]="model"
      [preview]="true"
      [flavour]="'ram'"
      (modelBuild)="updatedModel($event)"
      [blacklist]="['uilayout','uilayoutprop','hideOn']"
    ></ngx-decaf-model-builder>
 */
@Component({
  standalone: true,
  selector: "ngx-decaf-model-builder",
  imports: [
    FormsModule,
    IonButton,
    IconComponent,
    IonInput,
    IonSelect,
    IonLabel,
    IonItem,
    IonCheckbox,
    IonTextarea,
    IonAccordion,
    IonAccordionGroup,
    ModelRendererComponent,
    IonCheckbox,
    AddPropertiesComponent,
    IonToolbar,
  ],
  templateUrl: "./model-builder.component.html",
  styleUrl: "./model-builder.component.scss",
})
export class ModelBuilderComponent {
  @Input() preview = false;
  @Input() flavour!: string;
  @Input() inputModelConstructor: Constructor | undefined;
  @Input() blacklist: ModelBuilderBlacklist[] = [];
  @Output() modelBuild = new EventEmitter<Model | Constructor>();
  @Output() childErrors = new EventEmitter<InnerModelErrors>();
  blackListItems = ModelBuilderBlacklist;
  isChildBuilder = false;
  buildDebounce!: any;

  private elementRef = inject(ElementRef);

  modelConfig = signal<ModelConfig>({
    name: "",
    description: "",
    renderTag: "ngx-decaf-crud-form",
    layoutTag: "ngx-decaf-crud-form",
    layoutCols: 1,
    layoutRows: 1,
    listModelTag: "",
    hasUilayout: false,
  } as ModelConfig);

  inputModel = input<Model | null>();
  properties = signal<PropertyConfig[]>([]);
  builtModel = signal<Model | null>(null);
  buildError = signal<string | null>(null);
  buildInfo = signal<string | null>(null);

  componentTags = COMPONENT_TAGS;
  inputTypes = INPUT_TYPES;
  hideOnOps = HIDE_ON_OPS;

  constructor() {
    addIcons({
      removeCircleOutline,
      checkmarkCircleOutline,
      chevronForwardOutline,
      chevronDownOutline,
      folderOpen,
    });

    effect(() => {
      if (this.inputConstructor()) {
        this.loadInputModel(this.inputModelConstructor!);
      } else {
        const model = this.inputModel();
        // Stops refreshing if it is the same model
        // solves restoring changed model, from input
        if (model === untracked(() => this.builtModel())) return;
        this.builtModel.set(model ?? null);
        if (model) this.loadInputModel(model);
      }
      this.computedBuild();
    });
  }

  hasProperties = computed(() => this.properties().length > 0);
  canBuild = computed(() => {
    return (
      (this.modelConfig().name.trim().length > 0 &&
        this.properties().every((p) => p.name.trim().length > 0) &&
        this.properties().some((p) => p.primaryKey) &&
        this.innerModelErrors()?.length === 0) ||
      !this.innerModelErrors()
    );
  });

  // Used for child model builder, to determine when to build automatically
  computedBuild = computed(() => {
    if (!this.isChildBuilder) return;
    this.modelConfig();
    this.properties();
    this.buildOnDebounce();
  });

  inputConstructor = computed(() => this.inputModelConstructor);

  setInnerBuildErrors(errorsObject: InnerModelErrors) {
    const { errors, modelName } = errorsObject;
    this.innerModelErrors.set([]);
    if (!errors.length) return;
    const errorsString = [
      `Child ${modelName || ""}: [ ${errors.toString()} ] `,
    ];
    this.innerModelErrors.set(errorsString);
  }
  innerModelErrors = signal<string[] | null>([]);

  getErrors = computed(() => {
    const errors: string[] = [];
    if (this.modelConfig().name.trim().length <= 0)
      errors.push("Model needs a name");
    if (!this.properties().every((p) => p.name.trim().length > 0))
      errors.push("Properties need a name");
    if (!this.properties().some((p) => p.primaryKey))
      errors.push("There must be a primary key");
    if (this.isChildBuilder)
      this.childErrors.emit({ errors, modelName: this.modelConfig().name });
    if (this.innerModelErrors()?.length)
      return [...errors, this.innerModelErrors()].toString();
    else return errors.toString();
  });

  ngOnChanges() {
    // Check if this instance is child model builder, called from another model builder
    if (this.isChildBuilder) return;
    const thisTagName = this.elementRef.nativeElement.tagName;
    let parent = this.elementRef.nativeElement.parentElement;
    while (parent) {
      if (parent.tagName === thisTagName) {
        this.isChildBuilder = true;
        break;
      }
      parent = parent.parentElement;
    }
  }

  buildOnDebounce() {
    clearTimeout(this.buildDebounce);
    this.buildDebounce = setTimeout(() => this.buildModel(), 500);
  }

  constructProperty(
    object: object,
    newKey: string | undefined,
    newValue: any
  ): void {
    if (!newKey) return;
    const newproperty = {
      [newKey]: newValue,
    };
    Object.assign(object, newproperty);
    this.properties.set([...this.properties()]);
  }

  modifyProperty(object: object, propName: string, propValue: any) {
    if (!propName) return;
    (object as any)[propName] = propValue;
    this.properties.set([...this.properties()]);
  }

  deleteProperty(object: object, propName: string) {
    if (!propName || !object) return;
    delete object[propName as keyof object];
    this.properties.set([...this.properties()]);
  }

  objectKeys(object: object = {}): string[] {
    return Object.keys({ ...object });
  }

  toggleUilistprop(propIndex: number, event: any): void {
    const isChecked = event.target.checked;
    const prop = this.properties()[propIndex];
    if (!isChecked) {
      prop.ui.uilistpropExpanded = false;
      delete this.properties()[propIndex].ui.uilistprop;
    } else {
      const propName = prop.name.trim();
      prop.ui.uilistprop = generateUiListProp(propName);
    }
    this.properties.set([...this.properties()]);
  }

  uilistpropKeys(propIndex: any): undefined | string[] {
    const props = this.properties()[propIndex].ui.uilistprop?.props;
    if (props) return Object.keys(props);
  }

  setUilistpropKey(i: number, propName: string, propValue: any): void {
    const props = this.properties()[i].ui.uilistprop?.props;
    if (!props) return;
    props[propName] = propValue;
    delete props[""];
    this.properties.set([...this.properties()]);
  }

  deleteUilistProp(i: number, key: string): void {
    const props = this.properties()[i].ui.uilistprop?.props;
    if (!props) return;
    delete props[key];
    this.properties.set([...this.properties()]);
  }

  toggleUilayoutprop(propIndex: number, event: any): void {
    const isChecked = event.target.checked;
    const prop = this.properties()[propIndex];
    if (!isChecked) {
      prop.ui.uilistpropExpanded = false;
      delete this.properties()[propIndex].ui.uilayoutprop;
    } else {
      prop.ui.uilayoutprop = {
        props: { col: DEFAULT_LAYOUT.col, row: DEFAULT_LAYOUT.row },
      };
    }
    this.properties.set([...this.properties()]);
  }

  updateuilistProperties(i: number, object: object) {
    const uilistprop = this.properties()[i].ui.uilistprop;
    if (uilistprop?.props) uilistprop.props = object;
    this.properties.set([...this.properties()]);
  }

  updateuiChildProperties(i: number, object: object) {
    const uiChildprop = this.properties()[i].uiChild;
    if (uiChildprop?.props) uiChildprop.props = object;
    this.properties.set([...this.properties()]);
  }

  addProperty(): void {
    this.properties.update((props) => [...props, makeProperty()]);
  }

  removeProperty(index: number): void {
    this.properties.update((props) => props.filter((_, i) => i !== index));
  }

  moveProperty(index: number, direction: -1 | 1): void {
    const props = [...this.properties()];
    const target = index + direction;
    if (target < 0 || target >= props.length) return;
    [props[index], props[target]] = [props[target], props[index]];
    this.properties.set(props);
  }

  onPropertyTypeChange(index: number, type: PropType): void {
    const props = [...this.properties()];
    props[index] = {
      ...props[index],
      ui:
        type === "model"
          ? { ...props[index].ui, uielement: false }
          : props[index].ui,
      type,
      modelType: undefined,
      uiChild: type === "model" ? DEFAULT_UICHILD : undefined,
    };
    console.log("props:", props);
    this.properties.set(props);
  }

  toggleUilistpropExpanded(index: number): void {
    const props = [...this.properties()];
    props[index].ui.uilistpropExpanded = !props[index].ui.uilistpropExpanded;
    this.properties.set(props);
  }

  toggleExpanded(index: number, element: HTMLElement): void {
    const props = [...this.properties()];
    const current = props[index];
    props[index] = { ...props[index], expanded: !props[index].expanded };
    // there can only be one expanded
    props
      .filter((t) => t.name !== current.name)
      .forEach((t) => (t.expanded = false));
    this.properties.set(props);
    setTimeout(() => {
      element.scrollIntoView({
        block: "start",
        behavior: "smooth",
        inline: "start",
      });
    }, 25);
  }

  onPropertyNameChange(index: number, value: string): void {
    const props = [...this.properties()];
    props[index] = { ...props[index], name: value };
    const autoLabel = value.charAt(0).toUpperCase() + value.slice(1);
    if (
      !props[index].ui.label ||
      props[index].ui.label ===
        makeProperty(props[index].name.replace(value, "")).ui.label
    ) {
      props[index].ui = { ...props[index].ui, label: autoLabel };
    }
    this.properties.set(props);
  }

  toggleHideOn(propIndex: number, op: HideOnOp): void {
    const props = [...this.properties()];
    const current = props[propIndex].layout.hideOn;
    const isSelected = current.includes(op);
    props[propIndex].layout = {
      ...props[propIndex].layout,
      hideOn: isSelected ? current.filter((o) => o !== op) : [...current, op],
    };
    this.properties.set(props);
  }

  deselectPrimaryKeys(propIndex: number) {
    const props = [...this.properties()];
    const current = props[propIndex];
    // there can only be one primary key
    if (current.primaryKey)
      props
        .filter((t) => t.name !== current.name)
        .forEach((t) => (t.primaryKey = false));
  }

  updatedChild(propIndex: number, childModel: Model) {
    const props = [...this.properties()];
    const current = props[propIndex];
    current.uiChild = { ...(current.uiChild || DEFAULT_UICHILD) };
    current.uiChild.constructor = childModel.constructor;
    current.uiChild.modelName = childModel.constructor.name;
  }

  private loadInputModel(model: Model | Constructor): void {
    const modelClass =
      model instanceof Model ? (model.constructor as Constructor) : model;
    const pk = Model.pk(modelClass);
    const uiModel = Metadata.get(modelClass, Metadata.key("ui", "uimodel")) as
      | { tag?: string }
      | undefined;
    const layout = Metadata.get(modelClass, Metadata.key("ui", "uilayout")) as
      | { cols?: number; rows?: number | string[]; tag?: string }
      | undefined;
    const listModel = Metadata.get(
      modelClass,
      Metadata.key("ui", "uilistmodel")
    ) as { item?: { tag?: string } } | undefined;
    const propertyNames = Metadata.getAttributes(
      this.inputModelConstructor || modelClass
    );

    this.modelConfig.set({
      name: Metadata.modelName(modelClass),
      description: Metadata.description(modelClass) ?? "",
      renderTag: uiModel?.tag ?? "ngx-decaf-crud-form",
      layoutTag: layout?.tag ?? "ngx-decaf-crud-form",
      layoutCols: typeof layout?.cols === "number" ? layout.cols : 1,
      layoutRows:
        typeof layout?.rows === "number"
          ? layout.rows
          : Array.isArray(layout?.rows)
            ? layout.rows.length
            : 1,
      listModelTag: listModel?.item?.tag ?? "",
      flavour: this.flavour,
      hasUilayout: layout ? true : false,
    });

    this.properties.set(
      propertyNames.map((name) => {
        const getUiPropertyMetadata = (key: string): unknown =>
          Metadata.get(
            modelClass,
            Metadata.key("ui", DecorationKeys.PROPERTIES, name, key)
          );
        const uielement = getUiPropertyMetadata("uielement") as
          | { tag?: string; props?: Record<string, unknown> }
          | undefined;
        const elementProps = uielement?.props ?? {};
        const layoutProp = getUiPropertyMetadata("uilayoutprop") as
          | { props?: { col?: LayoutCol; row?: number } }
          | undefined;
        const uilistprop = getUiPropertyMetadata("uilistprop") as UiListProp;
        const validation = Metadata.validationFor(modelClass, name as never) as
          | Record<string, Record<string, unknown>>
          | undefined;
        const designType = Metadata.getPropDesignTypes(
          modelClass,
          name as never
        ).designType;
        const uiChildMetadata = getUiPropertyMetadata(uichild.name) as
          | {
              tag?: string;
              serialize?: boolean;
              props?: Record<string, unknown>;
            }
          | undefined;
        const uiChildConstructor = Metadata.get(
          modelClass,
          Metadata.key("properties", name)
        );
        const uiChildModelName = uiChildMetadata?.props?.["name"];
        const modelType =
          typeof designType === "function" &&
          designType.prototype instanceof Model
            ? designType
            : undefined;
        const validationValue = (key: string): unknown =>
          validation?.[key]?.[key];
        const inputType = designType?.name?.toLowerCase();
        const type: PropType = uiChildMetadata
          ? "model"
          : inputType === "number"
            ? "number"
            : inputType === "date"
              ? "date"
              : inputType === "boolean"
                ? "boolean"
                : "string";
        const defaultProp = makeProperty(name, type);
        const options = elementProps["options"];
        const hideOn = getUiPropertyMetadata("hidden");
        const hiddenOperations = Array.isArray(hideOn)
          ? hideOn.filter(
              (operation): operation is HideOnOp =>
                typeof operation === "string" &&
                HIDE_ON_OPS.includes(operation as HideOnOp)
            )
          : [];
        const order = getUiPropertyMetadata("order");

        return {
          ...defaultProp,
          modelType,
          uiChild:
            typeof uiChildModelName === "string" && uiChildMetadata?.tag
              ? {
                  modelName: uiChildModelName,
                  tag: uiChildMetadata.tag,
                  props: uiChildMetadata.props ?? {},
                  isArray:
                    Array.isArray(uiChildMetadata.props?.["customTypes"]) &&
                    uiChildMetadata.props["customTypes"].includes(Array.name),
                  serialize: !!uiChildMetadata.serialize,
                  constructorFN: uiChildConstructor,
                }
              : undefined,
          primaryKey: name === pk,
          validators: {
            required: !!validation?.["required"],
            min:
              typeof validationValue("min") === "number"
                ? (validationValue("min") as number)
                : null,
            max:
              typeof validationValue("max") === "number"
                ? (validationValue("max") as number)
                : null,
            minlength:
              typeof validationValue("minlength") === "number"
                ? (validationValue("minlength") as number)
                : null,
            maxlength:
              typeof validationValue("maxlength") === "number"
                ? (validationValue("maxlength") as number)
                : null,
            pattern:
              validationValue("pattern") instanceof RegExp
                ? (validationValue("pattern") as RegExp).source
                : typeof validationValue("pattern") === "string"
                  ? (validationValue("pattern") as string)
                  : "",
            email: !!validation?.["email"],
            url: !!validation?.["url"],
          },
          ui: {
            ...defaultProp.ui,
            uilistpropExpanded: Object.keys(uilistprop?.props || {}).length
              ? true
              : false,
            uilistprop,
            uilayoutprop: layoutProp,
            uielement: !!uielement,
            tag: uielement?.tag || defaultProp.ui.tag,
            customTag: "",
            label:
              typeof elementProps["label"] === "string"
                ? elementProps["label"]
                : defaultProp.ui.label,
            placeholder:
              typeof elementProps["placeholder"] === "string"
                ? elementProps["placeholder"]
                : "",
            type:
              typeof elementProps["type"] === "string"
                ? elementProps["type"]
                : defaultProp.ui.type,
            readonly: !!elementProps["readonly"],
            translatable:
              typeof elementProps["translatable"] === "boolean"
                ? elementProps["translatable"]
                : true,
            options: Array.isArray(options)
              ? options
                  .map((option: { value?: unknown; label?: unknown }) =>
                    typeof option.value === "string"
                      ? `${option.value}:${String(option.label ?? option.value)}`
                      : ""
                  )
                  .filter(Boolean)
                  .join(",")
              : typeof options === "string"
                ? options
                : "",
          },
          layout: {
            ...defaultProp.layout,
            order: order === "first" || order === "last" ? order : "",
            orderNum: typeof order === "number" ? order : null,
            hideOn: hiddenOperations,
          },
        };
      })
    );
  }

  buildModel(): void {
    if (!this.canBuild()) return;
    this.buildError.set(null);
    this.buildInfo.set(null);
    if (this.isChildBuilder) this.getErrors(); // To refresh any child errors
    try {
      const cfg = this.modelConfig();
      const name = cfg.name.trim();
      if (!name) throw new Error("Model name is required");

      const builder = ModelBuilder.builder<Model & Record<string, unknown>>();
      builder.setName(name);

      builder.decorateClass(uimodel(cfg.renderTag, {}));
      if (cfg.hasUilayout)
        builder.decorateClass(
          uilayout(cfg.layoutTag, cfg.layoutCols, cfg.layoutRows, {})
        );
      else builder.decorateClass(apply(clearUiMetadata(uilayout.name)));
      if (cfg.listModelTag)
        builder.decorateClass(uilistmodel(cfg.listModelTag, {}));
      if (cfg.description) builder.description(cfg.description);

      if (cfg.flavour) builder.decorateClass(uses(cfg.flavour));

      const appliedProps: string[] = [];

      for (let i = 0; i < this.properties().length; i++) {
        const prop = this.properties()[i];
        const propName = prop.name.trim();
        if (!propName) throw new Error(`Property #${i + 1} has no name`);

        let attr;
        switch (prop.type) {
          case "number":
            attr = builder.number(propName as never);
            break;
          case "date":
            attr = builder.date(propName as never);
            break;
          case "boolean":
            attr = builder.instance(Boolean as never, propName as never);
            break;
          case "model":
            attr = builder.instance(
              prop.uiChild!.constructor! as Constructor,
              propName as never
            );
            break;
          default:
            attr = builder.string(propName as never);
            break;
        }
        if (prop.modelType) {
          attr = builder.instance(prop.modelType, propName as never);
        }

        const v = prop.validators;
        if (v.required) attr.required();
        if (v.min !== null) attr.min(v.min);
        if (v.max !== null) attr.max(v.max);
        if (v.minlength !== null) attr.minlength(v.minlength);
        if (v.maxlength !== null) attr.maxlength(v.maxlength);
        if (v.pattern) attr.pattern(v.pattern);
        if (v.email) attr.email();
        if (v.url) attr.url();

        const tag = resolveTag(prop.ui);
        const inputType = resolveInputType(prop.type, prop.ui.type);

        const elementProps: Record<string, unknown> = {
          label: prop.ui.label || propName,
          type: inputType,
        };
        if (prop.ui.placeholder)
          elementProps["placeholder"] = prop.ui.placeholder;
        if (prop.ui.readonly) elementProps["readonly"] = true;
        if (prop.ui.translatable !== undefined)
          elementProps["translatable"] = prop.ui.translatable;

        const options = parseOptions(prop.ui.options);
        if (options.length) elementProps["options"] = options;

        type DecoratorFn = (target: unknown, key?: string | symbol) => unknown;
        const decorators: DecoratorFn[] = [];
        if (prop.uiChild)
          decorators.push(
            uichild(
              prop.uiChild.modelName,
              prop.uiChild.tag,
              prop.uiChild.props,
              prop.uiChild.isArray,
              prop.uiChild.serialize
            ) as DecoratorFn
          );
        else decorators.push(clearUiDecoratorMetadata(uichild.name));
        if (prop.ui.uilistprop)
          decorators.push(
            uilistprop(
              prop.ui.uilistprop.name,
              prop.ui.uilistprop.props
            ) as DecoratorFn
          );
        else decorators.push(clearUiDecoratorMetadata(uilistprop.name));

        if (prop.ui.uielement)
          decorators.push(uielement(tag, elementProps) as DecoratorFn);
        else decorators.push(clearUiDecoratorMetadata(uielement.name));
        if (prop.ui.uilayoutprop)
          decorators.push(
            uilayoutprop(
              prop.ui.uilayoutprop.props?.col as number,
              prop.ui.uilayoutprop.props?.row as number
            ) as DecoratorFn
          );
        else decorators.push(clearUiDecoratorMetadata(uilayoutprop.name));
        if (prop.primaryKey) decorators.push(pk() as DecoratorFn);

        if (prop.layout.order === "first")
          decorators.push(uiorder("first" as never) as DecoratorFn);
        else if (prop.layout.order === "last")
          decorators.push(uiorder("last" as never) as DecoratorFn);
        else if (prop.layout.orderNum !== null)
          decorators.push(
            uiorder(prop.layout.orderNum as never) as DecoratorFn
          );

        if (prop.layout.hideOn.length) {
          const ops = prop.layout.hideOn.map((o) => {
            switch (o) {
              case "create":
                return OperationKeys.CREATE;
              case "read":
                return OperationKeys.READ;
              case "update":
                return OperationKeys.UPDATE;
              case "delete":
                return OperationKeys.DELETE;
              default:
                return o;
            }
          });
          decorators.push(hideOn(...(ops as never[])) as DecoratorFn);
        }
        attr.decorate(...(decorators as never[]));
        appliedProps.push(propName);
      }
      const ConstructedModelClass = builder.build();
      const meta = Metadata.get(ConstructedModelClass);
      console.log(
        "Created model constructor:",
        ConstructedModelClass.name,
        "metadata after build:",
        meta
      );

      const inputModelInstance = untracked(() => this.inputModel()) as Model;
      if (
        this.inputModelConstructor &&
        this.inputModelConstructor.name === ConstructedModelClass.name
      ) {
        mergeModelMetadata(ConstructedModelClass, this.inputModelConstructor);
      } else if (
        inputModelInstance &&
        inputModelInstance.constructor.name === ConstructedModelClass.name
      ) {
        mergeModelMetadata(
          ConstructedModelClass,
          inputModelInstance.constructor as Constructor
        );
      }

      const instance = new ConstructedModelClass() as Model;
      this.builtModel.set(instance);
      this.modelBuild.emit(this.builtModel() as any);
      this.buildInfo.set(
        `Built "${name}" with ${appliedProps.length} propert${appliedProps.length === 1 ? "y" : "ies"}: ${appliedProps.join(", ")}`
      );
    } catch (e: unknown) {
      this.buildError.set(e instanceof Error ? e.message : String(e));
      this.builtModel.set(null);
    }
  }

  reset(): void {
    this.modelConfig.set({
      name: "",
      description: "",
      renderTag: "ngx-decaf-crud-form",
      layoutTag: "ngx-decaf-crud-form",
      layoutCols: 1,
      layoutRows: 1,
      listModelTag: "",
    });
    this.properties.set([]);
    this.builtModel.set(null);
    this.buildError.set(null);
    this.buildInfo.set(null);
    this.innerModelErrors.set([]);
  }

  loadExample(): void {
    this.reset();
    this.modelConfig.set({
      name: "User",
      description: "A user account model with profile fields",
      renderTag: "ngx-decaf-crud-form",
      layoutTag: "ngx-decaf-crud-form",
      layoutCols: 2,
      layoutRows: 1,
      listModelTag: "",
      flavour: this.flavour,
    });
    this.properties.set([
      {
        name: "id",
        type: "number",
        primaryKey: true,
        validators: {
          ...DEFAULT_VALIDATORS,
          required: true,
        },
        ui: {
          ...DEFAULT_UI,
          tag: "ngx-decaf-crud-field",
          label: "Id",
          placeholder: "Enter id",
          type: "number",
        },
        layout: { ...DEFAULT_LAYOUT, col: 1 },
        expanded: false,
      },
      {
        name: "username",
        type: "string",
        primaryKey: false,
        validators: {
          ...DEFAULT_VALIDATORS,
          required: true,
          minlength: 3,
          maxlength: 20,
        },
        ui: {
          ...DEFAULT_UI,
          tag: "ngx-decaf-crud-field",
          label: "Username",
          placeholder: "Enter username",
          type: "text",
        },
        layout: { ...DEFAULT_LAYOUT, col: 1 },
        expanded: false,
      },
      {
        name: "email",
        type: "string",
        primaryKey: false,
        validators: { ...DEFAULT_VALIDATORS, required: true, email: true },
        ui: {
          ...DEFAULT_UI,
          tag: "ngx-decaf-crud-field",
          label: "Email Address",
          placeholder: "user@example.com",
          type: "email",
        },
        layout: { ...DEFAULT_LAYOUT, col: 1 },
        expanded: false,
      },
      {
        name: "age",
        type: "number",
        primaryKey: false,
        validators: { ...DEFAULT_VALIDATORS, min: 0, max: 150 },
        ui: {
          ...DEFAULT_UI,
          tag: "ngx-decaf-crud-field",
          label: "Age",
          type: "number",
        },
        layout: { ...DEFAULT_LAYOUT, col: "half" },
        expanded: false,
      },
      {
        name: "role",
        type: "string",
        primaryKey: false,
        validators: { ...DEFAULT_VALIDATORS, required: true },
        ui: {
          ...DEFAULT_UI,
          tag: "ngx-decaf-crud-field",
          label: "Role",
          type: "select",
          options: "admin:Administrator, user:Regular User, guest:Guest",
        },
        layout: { ...DEFAULT_LAYOUT, col: "half" },
        expanded: false,
      },
      {
        name: "bio",
        type: "string",
        primaryKey: false,
        validators: { ...DEFAULT_VALIDATORS, maxlength: 500 },
        ui: {
          ...DEFAULT_UI,
          tag: "ngx-decaf-crud-field",
          label: "Biography",
          placeholder: "Tell us about yourself",
          type: "textarea",
        },
        layout: { ...DEFAULT_LAYOUT, col: "full" },
        expanded: false,
      },
      {
        name: "avatar",
        type: "string",
        primaryKey: false,
        validators: { ...DEFAULT_VALIDATORS },
        ui: {
          ...DEFAULT_UI,
          tag: "ngx-decaf-file-upload",
          label: "Avatar",
          type: "file",
        },
        layout: { ...DEFAULT_LAYOUT, col: "full" },
        expanded: false,
      },
      {
        name: "createdAt",
        type: "date",
        primaryKey: false,
        validators: { ...DEFAULT_VALIDATORS },
        ui: {
          ...DEFAULT_UI,
          tag: "ngx-decaf-crud-field",
          label: "Created At",
          type: "date",
          readonly: true,
          translatable: false,
        },
        layout: { ...DEFAULT_LAYOUT, col: "half", hideOn: ["create"] },
        expanded: false,
      },
    ]);
  }
}
