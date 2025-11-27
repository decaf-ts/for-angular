import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, Output, ViewChild, OnInit,  OnDestroy } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import {
  IonItem, IonLabel, IonList,
  IonButton,
  IonText
 } from '@ionic/angular/standalone';
 import { TranslatePipe } from '@ngx-translate/core';
import { HTML5InputTypes, UIFunctionLike } from '@decaf-ts/ui-decorators';
import { Dynamic } from '../../engine/decorators';
import { NgxFormFieldDirective } from '../../engine/NgxFormFieldDirective';
import { ElementSize, FlexPosition, KeyValue, PossibleInputTypes } from '../../engine/types';
import { ElementSizes, ComponentEventNames } from '../../engine/constants';
import { IBaseCustomEvent, IFileUploadError } from '../../engine/interfaces';
import { presentNgxLightBoxModal } from '../modal/modal.component';
import { CardComponent } from '../card/card.component';
import { IconComponent } from '../icon/icon.component';
import { Primitives } from '@decaf-ts/decorator-validation';
import { NgxEventHandler } from 'src/lib/engine/NgxEventHandler';
import { Constructor } from '@decaf-ts/decoration';


const FileErrors = {
  notAllowed: 'not_allowed',
  maxSize: 'max_size',
} as const;

/**
 * @description File upload component for Angular applications.
 * @summary This component provides a user interface for uploading files with support for drag-and-drop,
 * file validation, and preview functionality. It integrates seamlessly with Angular reactive forms
 * and supports multiple file uploads, directory mode, and custom file size limits.
 *
 * @class FileUploadComponent
 * @example
 * ```typescript
 * <ngx-decaf-file-upload [formGroup]="formGroup" [name]="'fileInput'" [multiple]="true"></ngx-decaf-file-upload>
 * ```
 * @mermaid
 * sequenceDiagram
 *   participant User
 *   participant FileUploadComponent
 *   User->>FileUploadComponent: Select or drag files
 *   FileUploadComponent->>FileUploadComponent: Validate files
 *   FileUploadComponent->>FileUploadComponent: Emit change event
 *   User->>FileUploadComponent: Remove file
 *   FileUploadComponent->>FileUploadComponent: Update file list
 */
@Dynamic()
@Component({
  selector: 'ngx-decaf-file-upload',
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CardComponent, IonText, IconComponent, IonList, IonLabel, IonItem, TranslatePipe,  IonButton],
})
export class FileUploadComponent extends NgxFormFieldDirective implements OnInit, OnDestroy {

  @ViewChild('component', { static: true })
  override component!: ElementRef<HTMLInputElement>;

  /**
   * @description Parent form group.
   * @summary References the parent form group to which this field belongs.
   * This is necessary for integrating the field with Angular's reactive forms.
   *
   * @type {FormGroup}
   */
  @Input()
  override formGroup: FormGroup | undefined;

  /**
   * @summary The flat field name used as the form control identifier in immediate parent FormGroup.
   * @description Specifies the name of the field, which is used as the FormControl identifier in immediate parent FormGroup.
   * This value must be unique within the immediate parent FormGroup context and should not contain dots or nesting.
   *
   * @type {string}
   */
  @Input()
  override name!: string;

  /**
   * @description Angular FormControl instance for this field.
   * @summary The specific FormControl instance that manages this field's state, validation,
   * and value. This provides direct access to Angular's reactive forms functionality
   * for this individual field within the broader form structure.
   *
   * @type {FormControl}
   */
  @Input()
  override formControl!: FormControl;

  /**
   * @description Whether the field is required.
   * @summary When true, the field must have a value for the form to be valid.
   * Required fields are typically marked with an indicator in the UI.
   *
   * @type {boolean}
   */
  @Input()
  override required?: boolean;

  /**
   * @description Allows multiple file selection.
   * @summary When true, the user can select multiple files for upload.
   *
   * @type {boolean}
   * @default false
   */
  @Input()
  override multiple: boolean = false;

  /**
   * @description Specifies the input type for the file upload field.
   * @summary Defines the type of input element used for file uploads, such as file or directory.
   *
   * @type {PossibleInputTypes}
   * @default HTML5InputTypes.FILE
   */
  @Input()
  override type: PossibleInputTypes = HTML5InputTypes.FILE;

  /**
   * @description Label for the file upload field.
   * @summary Provides a user-friendly label for the file upload input.
   *
   * @type {string | undefined}
   */
  @Input()
  label?: string;

  /**
   * @description Label for the upload button.
   * @summary Specifies the text displayed on the file upload button.
   *
   * @type {string | undefined}
   */
  @Input()
  buttonLabel?: string;

  /**
   * @description Size of the file upload component.
   * @summary Determines the visual size of the file upload component, such as large, small, or default.
   *
   * @type {Extract<ElementSize, 'large' | 'small' | 'default'>}
   * @default ElementSizes.large
   */
  @Input()
  size: Extract<ElementSize, 'large' | 'small' | 'default'> = ElementSizes.large;

  /**
   * @description Flex positioning of the container's content.
   * @summary Controls how child elements are positioned within the container when flex layout
   * is enabled. Options include 'center', 'top', 'bottom', 'left', 'right', and combinations
   * like 'top-left'. This property is only applied when the flex property is true.
   *
   * @type {FlexPosition}
   * @default 'center'
   */
  @Input()
  position: FlexPosition = 'center';


  /**
   * @description Accepted file types for upload.
   * @summary Specifies the file types that are allowed for upload, such as images or documents.
   *
   * @type {string | string[]}
   * @default ['image/*']
   */
  @Input()
  accept: string | string[] = ['image/*'];

  /**
   * @description Whether to show an icon in the file upload field.
   * @summary When true, an icon is displayed alongside the file upload input.
   *
   * @type {boolean}
   * @default true
   */
  @Input()
  showIcon: boolean = true;

  /**
   * @description Enables directory mode for file uploads.
   * @summary When true, the user can upload entire directories instead of individual files.
   *
   * @type {boolean}
   * @default false
   */
  @Input()
  enableDirectoryMode: boolean = false;

  @Input()
  previewHandler?: unknown;

  /**
   * @description Maximum file size allowed for upload.
   * @summary Specifies the maximum size (in MB) for files that can be uploaded.
   *
   * @type {number}
   * @default 1
   */
  @Input()
  maxFileSize: number = 1;

  /**
   * @description Event emitted when the file upload field changes.
   * @summary Emits an event containing details about the change in the file upload field.
   *
   * @type {EventEmitter<IBaseCustomEvent>}
   */
  @Output()
  changeEvent: EventEmitter<IBaseCustomEvent> = new EventEmitter<IBaseCustomEvent>();

  /**
   * @description Preview of the first file in the upload list.
   * @summary Stores the data URL of the first file in the upload list for preview purposes.
   * This is typically used to display a thumbnail or preview image.
   *
   * @type {string | undefined}
   */
  previewFile: string | undefined = undefined;

  /**
   * @description List of files selected for upload.
   * @summary Contains the files selected by the user for upload. This array is updated
   * whenever files are added or removed from the upload list.
   *
   * @type {File[]}
   */
  files: File[] | KeyValue[] = [];

  /**
   * @description List of errors encountered during file validation.
   * @summary Stores validation errors for files that do not meet the specified criteria,
   * such as file type or size restrictions. Each error includes the file name, size, and error message.
   *
   * @type {IFileUploadError[]}
   */
  errors: IFileUploadError[] = [];

  /**
   * @description Indicates whether a drag operation is in progress.
   * @summary This flag is set to true when a file is being dragged over the upload area.
   * It is used to provide visual feedback to the user during drag-and-drop operations.
   *
   * @type {boolean}
   * @default false
   */
  dragging: boolean = false;

  /**
   * @description Counter for drag events.
   * @summary Tracks the number of drag events to ensure proper handling of drag-and-drop
   * operations. The counter is incremented on drag enter and decremented on drag leave.
   *
   * @type {number}
   * @default 0
   */
  private dragCounter: number = 0;

  constructor() {
    super("FileUploadComponent");
  }

  /**
   * @description Lifecycle hook that is called after Angular has initialized all data-bound properties of a directive.
   * @summary Sets up the component by enabling directory mode if specified, formatting the accepted file types,
   * and converting the maximum file size from megabytes to bytes.
   *
   * @returns {void}
   */
  ngOnInit(): void {
    if (this.enableDirectoryMode) {
      this.multiple = true;
    }
    if (Array.isArray(this.accept)) {
      this.accept = this.accept.join(',');
    }
    // Convert maxFileSize from MB to bytes
    this.maxFileSize = this.maxFileSize * 1024 * 1024;
    this.initialize();
  }

  override async initialize(): Promise<void> {
    if(this.value && typeof this.value === Primitives.STRING) {
      try {
        const files = JSON.parse(this.value as string) as string[];
        this.files = files.map(file => {
          const mime = this.getFileMime(file)?.split('/') || [];
          const type = mime?.[0] === 'text' ?  mime?.[1] : mime?.[0];
          return {
            name: mime?.[0] || 'file',
            type: `${type}` || 'image/*',
            source: file as string
          } as KeyValue
        })
        this.getPreview();
      } catch (error: unknown) {
       this.log.for(this.initialize).error(`Error parsing file list: ${(error as Error).message || error}`);
      }
    }
    this.initialized = true;
  }

  /**
   * @description Lifecycle hook that is called when a directive, pipe, or service is destroyed.
   * @summary Cleans up the component by calling the parent ngOnDestroy method and clearing the file upload state.
   *
   * @returns {Promise<void> | void}
   */
  override ngOnDestroy(): Promise<void> | void {
    super.ngOnDestroy();
    this.handleClear();
  }

  /**
   * @description Handles the click event to trigger file selection.
   * @summary Simulates a click on the hidden file input element to open the file selection dialog.
   * This method is used to allow users to select files programmatically.
   *
   * @returns {void}
   */
  handleClickToSelect(): void {
    const element = this.component.nativeElement;
    if (element)
      (element.querySelector('#dcf-file-input') as HTMLButtonElement)?.click();
  }

  /**
   * @description Handles the file selection event.
   * @summary Processes the files selected by the user, validates them, and updates the file list.
   * This method is triggered when the user selects files using the file input element.
   *
   * @param {Event} event - The file selection event.
   * @returns {void}
   */
  handleSelection(event: Event): void {
    this.clearErrors();
    const input = event.target as HTMLInputElement;
    if (input.files) {
      const fileList = Array.from(input.files);
      this.handleSelectionConfirm(fileList);
      input.value = '';
    }
  }

  /**
   * @description Handles the drop event for drag-and-drop file uploads.
   * @summary Processes the files dropped by the user, validates them, and updates the file list.
   * This method is triggered when the user drops files onto the upload area.
   *
   * @param {DragEvent} event - The drag-and-drop event.
   * @returns {void}
   */
  handleDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragCounter = 0;
    this.dragging = false;
    this.clearErrors();
    if (!event.dataTransfer) return;
    const fileList = Array.from(event.dataTransfer.files);
    this.handleSelectionConfirm(fileList);
  }

  /**
   * @description Handles the drag over event for drag-and-drop file uploads.
   * @summary Sets the dragging flag to true to provide visual feedback during drag-and-drop operations.
   * This method is triggered when the user drags files over the upload area.
   *
   * @param {DragEvent} event - The drag over event.
   * @returns {void}
   */
  handleDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragging = true;
  }

  /**
   * @description Handles the drag leave event for drag-and-drop file uploads.
   * @summary Decrements the drag counter and clears the dragging flag when the counter reaches zero.
   * This method is triggered when the user drags files out of the upload area.
   *
   * @param {DragEvent} event - The drag leave event.
   * @returns {void}
   */
  handleDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragCounter = Math.max(0, this.dragCounter - 1);
    if (this.dragCounter === 0) {
      this.dragging = false;
    }
  }

  /**
   * @description Clears the file list and validation errors.
   * @summary Resets the file upload component by clearing the selected files, preview, and errors.
   * This method is used to reset the component state.
   *
   * @returns {void}
   */
  handleClear(): void {
    this.clearErrors();
    this.previewFile = undefined;
    this.files = [];
  }

  /**
   * @description Confirms the file selection and updates the component state.
   * @summary Validates each file in the selection, updates the file list, and emits
   * the change event. If multiple or directory mode is enabled, adds files to the existing list.
   * Otherwise, replaces the existing files with the new selection.
   *
   * @param {File[]} files - The array of files selected by the user.
   * @returns {Promise<void>}
   */
  private async handleSelectionConfirm(files: File[]): Promise<void> {
    const validFiles: File[] = [];
    for (const file of files) {
      const isValid = this.validateFile(file);
      if (isValid === true) {
        validFiles.push(file);
      } else {
        this.errors.push({
          name: file.name,
          error: isValid,
          size: file.size
        });
      }
    }
    if (this.multiple || this.enableDirectoryMode) {
      this.files = this.files.concat(validFiles);
    } else {
      this.files = [validFiles[0]];
    }
    if(this.files.length) {
      const dataValues = await this.getDataURLs(this.files as File[])
      this.setValue(JSON.stringify(dataValues));
    }

    await this.getPreview();
    this.changeEventEmit();
  }

  /**
   * @description Validates a single file against the component's constraints.
   * @summary Checks the file type and size against the accepted values and limits.
   * Returns true if the file is valid, or an error code if it is not.
   *
   * @param {File} file - The file to be validated.
   * @returns {true | string} - Returns true if valid, error code otherwise.
   */
  private validateFile(file: File): true | string {
    if (this.accept && this.accept !== '*') {
      const acceptedExtensions = Array.isArray(this.accept) ?
        this.accept : this.accept.split(',').map(ext => ext.trim());
      const accept = acceptedExtensions.some(ext => {
        if (ext === '*')
          return true;
        if (ext.endsWith('/*'))
          return file.type.startsWith(ext.replace(/\/\*$/, ''));
        const fileExtension = file.type.split('/').pop() || '';
        return file.type === ext || fileExtension === ext || file.name.toLowerCase().endsWith(ext.replace('.', ''));
      });
      if (!accept)
        return FileErrors.notAllowed;
    }
    if (this.maxFileSize && file.size > this.maxFileSize)
      return FileErrors.maxSize;
    return true;
  }

  /**
   * @description Displays a preview of the selected file in a lightbox.
   * @summary If the file is an image, its data URL is retrieved and displayed in a modal lightbox.
   * The lightbox shows the image at its natural size, constrained to the viewport dimensions.
   *
   * @param {File | string} [file] - The file to be previewed. If not provided, the current preview file is used.
   * @returns {Promise<void>}
   */
  async preview(file: File | string, fileExtension: string = 'image/'): Promise<void|UIFunctionLike> {
    this.log.for(this).info(`Previewing file of type: ${fileExtension}`);
    let content:  string | undefined;
    if(file instanceof File) {
      const dataUrl = await this.getDataURLs(file) as string[];
      if(dataUrl && dataUrl.length)
        file = dataUrl[0];
    }
    if(fileExtension.includes('image'))
      content = '<img src="' + file + '" style="max-width: 100%; height: auto;" />';

    if(fileExtension.includes('xml')) {
      const parseXml = (xmlString: string): string | undefined => {
        try {
          xmlString = (xmlString as string).replace(/^data:[^;]+;base64,/, '').replace(/\s+/g, '')
          const decodedString = atob(xmlString);
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(decodedString, "text/xml");

          // const encoder = new TextEncoder(); // gera bytes UTF-8
          // const utf8Bytes = encoder.encode(xmlDoc.documentElement.outerHTML);
          // return new TextDecoder("utf-8").decode(utf8Bytes);

          return xmlDoc.documentElement.innerHTML;

        } catch (error: unknown) {
          this.log.error((error as Error)?.message);
          return undefined;
        }
      }

      if(this.previewHandler && typeof this.previewHandler === 'function') {
        const clazz = new (this.previewHandler as Constructor<NgxEventHandler>)();
        const previewFn = clazz.handle.bind(this);
        return previewFn(file);
      } else {
        content = parseXml(file as string);
        content = `<div class="dfc-padding">${content}</div>`;
      }
    }

    await presentNgxLightBoxModal(content || "");
  }

  /**
   * @description Checks if a file is an image based on its MIME type.
   * @summary Determines if the file can be accepted as an image by checking
   * if its type starts with 'image/'.
   *
   * @param {File} file - The file to be checked.
   * @returns {boolean} - True if the file is an image, false otherwise.
   */
  isImageFile(file: File): boolean {
    return file && file.type.startsWith('image/');
  }

  getFileMime(base64: string): string {
    const match = base64.match(/^data:(.*?);base64,/);
    return match ? match[1] : "";
  }

  /**
   * @description Removes a file from the selection.
   * @summary Updates the file list to exclude the file at the specified index.
   * Emits the change event and updates the preview if necessary.
   *
   * @param {number} index - The index of the file to be removed.
   * @returns {Promise<void>}
   */
  async removeFile(index: number): Promise<void> {
    if (index <= this.files.length)
      this.files = [...this.files.filter((_, i) => i !== index)];
    await this.getPreview();
    this.changeEventEmit();
  }

  /**
   * @description Retrieves the preview image for the selected files.
   * @summary If the first selected file is an image, its data URL is retrieved and set as the preview.
   * If the file is not an image, the preview is cleared.
   *
   * @returns {Promise<void>}
   */
  private async getPreview(): Promise<void> {
    this.previewFile = undefined;
    const file = this.files && this.files.length ? this.files[0] : null;
    if (file instanceof File) {
      const dataUrl = await this.getDataURLs(file as File) as string[];
      if(dataUrl && dataUrl.length)
        this.previewFile = dataUrl[0];
    } else {
      this.previewFile = (file as KeyValue)?.['source'] as string;
    }
  }

  /**
   * @description Emits the change event for the file upload field.
   * @summary Triggers the change event, notifying any listeners that the value has changed.
   * The event contains the updated value, component name, and event type.
   *
   * @returns {void}
   */
  private changeEventEmit(): void {
   this.changeEvent.emit({
      data: this.value,
      component: this.componentName,
      name: ComponentEventNames.CHANGE,
   });
  }

  /**
   * @description Retrieves the data URLs for the selected files.
   * @summary Converts the selected image files to data URLs using FileReader.
   * The resulting data URLs can be used for previewing images in the browser.
   *
   * @param {File[] | File} [files] - The files for which to generate data URLs.
   * If not provided, the currently selected files are used.
   *
   * @returns {Promise<string[] | undefined>} - A promise that resolves to an array of data URLs, or undefined if an error occurs.
   */
  private async getDataURLs(files?: File[] | File): Promise<string[] | undefined> {
    if(!files)
      files = this.files as File[];
    if(!Array.isArray(files))
      files = [files];
    // files = files.filter(f => f.type && f.type.startsWith('image/'));
    return this.readFile(files).then(urls => {
      // validate generated DataURLs
      const invalid = urls.some(u => !this.isValidDataURL(u));
      if (invalid)
        return undefined;
      if (this.multiple || this.enableDirectoryMode)
        return urls;
      return urls.length ? [urls[0]] : undefined;
    }).catch(() => {
      return undefined;
    });
  }

  /**
   * @description Validates the format of a data URL.
   * @summary Checks if the data URL is a non-empty string and matches the expected pattern
   * for base64-encoded image data URLs. Uses a regular expression to validate the format.
   *
   * @param {string | undefined} dataURL - The data URL to be validated.
   * @returns {boolean} - True if the data URL is valid, false otherwise.
   */
  private isValidDataURL(dataURL: string | undefined): boolean {
    if (!dataURL || typeof dataURL !== 'string') {
      return false;
    }

    // Regex para qualquer MIME type seguido de ;base64
    const match = dataURL.match(/^data:([a-zA-Z0-9.+-\\/]+);base64,([A-Za-z0-9+/=\s]+)$/);
    if (!match)
      return false;

    const payload = match[2];
    try {
      if (typeof atob === 'function') {
        // remove espaços e tenta decodificar
        atob(payload.replace(/\s+/g, ''));
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * @description Clears all error messages from the component.
   * @summary Resets the error state, removing all error messages from the display.
   *
   * @returns {void}
   */
  private clearErrors(): void {
    this.errors = [];
  }

  /**
   * @description Reads the selected files as data URLs.
   * @summary Uses the FileReader API to read each file as a data URL.
   * Returns a promise that resolves to an array of data URLs.
   *
   * @param {File[]} files - The files to be read.
   * @returns {Promise<string[]>} - A promise that resolves to an array of data URLs.
   */
  private readFile(files: File[]): Promise<string[]> {
    return Promise.all(files.map(file => new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error);
      reader.onload = ()  => resolve(String(reader.result || ''));
      reader.readAsDataURL(file);
    })));
  }

}
