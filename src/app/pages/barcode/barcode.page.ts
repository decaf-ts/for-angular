import { Component, computed, inject, signal } from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
import { IonContent } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';
import {
  BarcodeTypes,
  type BarcodeType,
  renderBarcodeSvg,
} from '@decaf-ts/for-angular/barcode';
import { HeaderComponent } from 'src/app/components/header/header.component';
import { ContainerComponent } from 'src/lib/components';

interface RenderedBarcode {
  svg: SafeHtml | null;
  error: boolean;
}

const DEFAULT_PAYLOAD = 'DECAF-1234-5678';

/**
 * `/barcode` demo page: renders 1D/2D barcodes through the
 * `@decaf-ts/for-angular/barcode` entry point, with symbology, payload and scale
 * controls plus a reset to the demo defaults.
 *
 * @category Demo Pages
 */
@Component({
  selector: 'app-barcode-page',
  imports: [
    IonContent,
    HeaderComponent,
    ContainerComponent,
    TranslatePipe,
  ],
  templateUrl: './barcode.page.html',
  styleUrl: './barcode.page.scss',
})
export class BarcodePage {
  protected readonly payload = signal(DEFAULT_PAYLOAD);

  protected readonly symbology = signal<BarcodeType>(BarcodeTypes.datamatrix);

  protected readonly scale = signal(4);

  protected readonly symbologies: BarcodeType[] = Object.values(BarcodeTypes);

  private readonly sanitizer: DomSanitizer = inject(DomSanitizer);

  protected readonly rendered = computed<RenderedBarcode>(() => {
    const value = this.payload().trim();
    if (!value) {
      return { svg: null, error: false };
    }
    try {
      const svg = renderBarcodeSvg(value, {
        bcid: this.symbology(),
        options: {
          scale: this.scale(),
        } as never,
      });
      return {
        svg: this.sanitizer.bypassSecurityTrustHtml(svg),
        error: false,
      };
    } catch {
      return { svg: null, error: true };
    }
  });

  protected onPayloadInput(event: Event): void {
    this.payload.set((event.target as HTMLInputElement).value);
  }

  protected onSymbologyChange(event: Event): void {
    this.symbology.set((event.target as HTMLSelectElement).value as BarcodeType);
  }

  protected onScaleInput(event: Event): void {
    this.scale.set(Number((event.target as HTMLInputElement).value) || 1);
  }

  protected reset(): void {
    this.payload.set(DEFAULT_PAYLOAD);
    this.symbology.set(BarcodeTypes.datamatrix);
    this.scale.set(4);
  }
}
