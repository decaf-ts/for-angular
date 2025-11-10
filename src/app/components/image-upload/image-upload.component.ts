import { Component, ElementRef, EventEmitter, Input, Output, ViewChild, OnInit } from '@angular/core';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonIcon,
  IonText
 } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';
import { Dynamic } from 'src/lib/engine/decorators';
import { NgxFormFieldDirective } from 'src/lib/engine/NgxFormFieldDirective';
import { PossibleInputTypes } from 'src/lib/engine/types';


@Dynamic()
@Component({
  selector: 'app-image-upload',
  templateUrl: './image-upload.component.html',
  styleUrls: ['./image-upload.component.scss'],
  standalone: true,
  imports: [IonCard, IonCardContent, IonText, TranslatePipe,  IonIcon, IonButton],
})
export class ImageUploadComponent extends NgxFormFieldDirective implements OnInit {

  /** accepted MIME types for the input element */
  @Input()
  accept = 'image/*';

  @Input()
  override multiple = false;


  override type: PossibleInputTypes | 'file' = 'file';

  @Input()
  maxFileSize: number = 1;

  @Output()
  fileChange = new EventEmitter<File | File[] | undefined>();

  @Output()
  base64Change = new EventEmitter<string | string[] | undefined>();

  @ViewChild('component', { static: true })
  override component!: ElementRef<HTMLInputElement>;

  // preview for first image
  preview: string | undefined = undefined;

  files: File[] = [];
  errors: string[] = [];
  dragging = false;
  private _dragCounter = 0;

  constructor() {
    super("ImageUploadComponent");
  }

  ngOnInit(): void {
    // convert maxFileSize from MB to bytes
    this.maxFileSize = this.maxFileSize * 1024 * 1024;
    if(!this.className?.length)
      this.className = 'dcf-card-default';
  }

  // no constructor needed

  handleClickToSelect(): void {
    this.component.nativeElement.click();
  }

  handleFileSelect(event: Event): void {
    this.clearErrors();
    const input = event.target as HTMLInputElement;
    if (input.files) {
      const fileList = Array.from(input.files);
      this.handleNewFiles(fileList);
      input.value = '';
    }
  }

  handleClear(): void {
    this.clearErrors();
    this.preview = undefined;
    this.files = [];
  }

  handleDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this._dragCounter = 0;
    this.dragging = false;
    this.clearErrors();
    if (!event.dataTransfer) return;
    const fileList = Array.from(event.dataTransfer.files);
    this.handleNewFiles(fileList);
  }

  handleDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    console.log('Drag over', event);
    this.dragging = true;
  }

  handleDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    // decrement counter and only clear when reaches 0 to avoid flicker
    this._dragCounter = Math.max(0, this._dragCounter - 1);
    if (this._dragCounter === 0) {
      this.dragging = false;
    }
  }

  // onDragEnter(event: DragEvent): void {
  //   event.preventDefault();
  //   event.stopPropagation();
  //   this._dragCounter++;
  //   this.dragging = true;
  //   console.log('Drag enter', event);
  // }

  private handleNewFiles(fileList: File[]): void {
    const validFiles: File[] = [];
    for (const f of fileList) {
      const validation = this.validateFile(f);
      if (validation === true) {
        validFiles.push(f);
      } else {
        this.errors.push(validation as string);
      }
    }

    if (validFiles.length === 0) {
      this.emitIfNeeded();
      return;
    }

    if (this.multiple) {
      this.files = this.files.concat(validFiles);
    } else {
      // keep only the first valid file
      this.files = [validFiles[0]];
    }

    // read preview from first file
    this.updatePreview();
    this.emitIfNeeded();
  }

  private validateFile(file: File): true | string {
    if (this.accept && this.accept !== '*') {
      // simple MIME type check: accept can be like 'image/*' or 'image/png'
      const accepts = this.accept.split(',').map(a => a.trim());
      const ok = accepts.some(a => {
        if (a === '*') return true;
        if (a.endsWith('/*')) {
          const base = a.replace(/\/\*$/, '');
          return file.type.startsWith(base);
        }
        return file.type === a || file.name.toLowerCase().endsWith(a.replace('.', ''));
      });
      if (!ok) return `Tipo de arquivo não permitido: ${file.name}`;
    }

    if (this.maxFileSize && file.size > this.maxFileSize) {
      return `Arquivo muito grande: ${file.name} (máx ${(this.maxFileSize / 1024 / 1024).toFixed(1)} MB)`;
    }

    return true;
  }

  removeFile(index: number): void {
    if (index < 0 || index >= this.files.length) return;
    this.files.splice(index, 1);
    this.updatePreview();
    this.emitIfNeeded();
  }

  clear(): void {
    this.files = [];
    this.preview = undefined;
    this.clearErrors();
    this.emitIfNeeded();
  }

  private updatePreview(): void {
    this.preview = undefined;
    const f = this.files && this.files.length ? this.files[0] : null;
    if (!f) return;
    if (!f.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      this.preview = String(reader.result || undefined);
    };
    reader.readAsDataURL(f);
  }

  private emitIfNeeded(): void {
    if (this.multiple) {
      this.fileChange.emit(this.files.slice());
    } else {
      // emit undefined when no file is present to match EventEmitter<File | File[] | undefined>
      this.fileChange.emit(this.files.length ? this.files[0] : undefined);
    }
    // emit base64 DataURLs for image files (if any)
    const imageFiles = this.files.filter(f => f.type && f.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      this.base64Change.emit(undefined);
      return;
    }
    this.filesToDataUrls(imageFiles).then(urls => {
      // validate generated DataURLs
      const invalid = urls.some(u => !this.isValidImageDataUrl(u));
      if (invalid) {
        console.log('Imagem invalida para base64');
        this.base64Change.emit(undefined);
        return;
      }
      // log base64 values to console as requested
      if (this.multiple) {
        console.log('image-upload: base64 images ->', urls);
        this.base64Change.emit(urls);
      } else {
        console.log('image-upload: base64 image ->', urls.length ? urls[0] : undefined);
        this.base64Change.emit(urls.length ? urls[0] : undefined);
      }
    }).catch(() => {
      this.base64Change.emit(undefined);
    });
  }

  private isValidImageDataUrl(dataUrl: string | undefined): boolean {
    if (!dataUrl || typeof dataUrl !== 'string') return false;
    // basic pattern: data:image/<subtype>;base64,<payload>
    const m = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/);
    if (!m) return false;
    const payload = m[2];
    try {
      // atob will throw if invalid base64
      if (typeof atob === 'function') {
        atob(payload.replace(/\s+/g, ''));
      }
      return true;
    } catch {
      return false;
    }
  }

  private filesToDataUrls(files: File[]): Promise<string[]> {
    const readers = files.map(f => new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onerror = () => reject(r.error);
      r.onload = () => resolve(String(r.result || ''));
      r.readAsDataURL(f);
    }));
    return Promise.all(readers);
  }

  private clearErrors(): void {
    this.errors = [];
  }

}
