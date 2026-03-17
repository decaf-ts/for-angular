import { EnvironmentInjector } from '@angular/core';
import BwipJs, { BwippOptions } from '@bwip-js/browser';
import { CrudFieldComponent, getModelAndRepository } from 'dist/lib';
import { presentNgxInlineModal } from 'src/lib/components/modal/modal.component';
import { NgxEventHandler } from 'src/lib/engine/NgxEventHandler';
import { Batch } from '../Batch';
import { convertDateToGS1Format } from './BatchHandler';

export async function createOnClickShowBarcodeModal(instance: CrudFieldComponent) {
  if (!instance.value) {
    instance.value = `<span class="ti ti-qrcode"></span> ${await instance.translate('batch.dataMatrix.view')}`;
  }
  const element = instance.component?.nativeElement as HTMLIonItemElement;
  if (element) {
    if (!Object.keys(instance._data as Batch).length) {
      const repository = getModelAndRepository(Batch.name)?.repository;
      instance._data = (await repository?.read(instance.modelId)) as Batch;
    }
    element.classList.add('dcf-has-action');
    element.onclick = () => {
      DatamatrixModalHandler.showBarcodeModal(instance._data as Batch);
    };
  }
}

export const BarcodeTypes = {
  gs1datamatrix: 'gs1datamatrix',
  datamatrix: 'datamatrix',
  qrcode: 'qrcode',
} as const;

export class DatamatrixModalHandler extends NgxEventHandler {
  private static readonly charsMap: Record<string, string> = {
    '33': '!',
    '34': '"',
    '35': '#',
    '36': '$',
    '37': '%',
    '38': '&',
    '39': "'",
    '40': '(',
    '41': ')',
    '42': '*',
    '43': '+',
    '45': '-',
    '46': '.',
    '47': '/',
    '58': ':',
    '59': ';',
    '60': '<',
    '61': '=',
    '62': '>',
    '63': '?',
    '64': '@',
    '91': '[',
    '92': '\\',
    '93': ']',
    '94': '^',
    '95': '_',
    '96': '`',
    '123': '{',
    '124': '|',
    '125': '}',
    '126': '~',
  };

  private static readonly barcodeOptions = {
    text: '',
    includeBarcodeText: true,
    scale: 4,
    height: 16,
    textxalign: 'center',
    textyalign: 'center',
    backgroundcolor: 'ffffff',
    paddingwidth: 4,
    paddingheight: 4,
  } as BwippOptions;

  override async handleClick(instance: NgxEventHandler, event: CustomEvent, uid: string) {
    const item = (instance._data as Batch[]).find((item) => item[instance.pk as keyof Batch] === uid);
    if (item) {
      DatamatrixModalHandler.showBarcodeModal(item, this.injector);
    }
  }

  static async showBarcodeModal(item: Batch, injector?: EnvironmentInjector): Promise<void> {
    const datamatrixElement = DatamatrixModalHandler.getDatamatrixCanvasElement(item);
    //TODO: Create logic to make button copy value with correct lwa url to clipboard
    if (datamatrixElement) {
      await presentNgxInlineModal(
        datamatrixElement,
        {
          title: 'batch.dataMatrix.preview',
          uid: 'dcf-datamatrix-modal',
          headerTransparent: true,
        },
        injector
        // this.injector
      );
    }
  }

  static getBarcodeData(batch: Batch & { serialNumber?: string }): string {
    const { batchNumber, productCode, expiryDate, serialNumber } = batch || {};
    // TODO: Add serial number to batch and use it in datamatrix if exists (when added to model)
    const emptySerialNumber = serialNumber === '' || typeof serialNumber === 'undefined';
    const sanitizeBatchNumber = (value: string): string => {
      return value
        .split('')
        .map((char) => {
          if (this.charsMap[char.charCodeAt(0)]) {
            return Number(char.charCodeAt(0)) >= 100 ? `^${char.charCodeAt(0)}` : `^0${char.charCodeAt(0)}`;
          }
          return char;
        })
        .join('');
    };

    const gs1ExpiryDate = convertDateToGS1Format(`${expiryDate}`);
    const res = (
      emptySerialNumber
        ? `(01)${productCode}(10)${batchNumber}(17)${gs1ExpiryDate}`
        : `(01)${productCode}(21)${sanitizeBatchNumber(serialNumber)}(10)${sanitizeBatchNumber(batchNumber)}(17)${gs1ExpiryDate}`
    ).replace(/"/g, '\\"');
    return res;
  }

  static getDatamatrixCanvasElement(
    batch: Batch,
    bcid: keyof typeof BarcodeTypes = BarcodeTypes.datamatrix
  ): HTMLElement | undefined {
    const barcodeData = this.getBarcodeData(batch);
    const container = document.createElement('div');
    container.setAttribute('style', 'width: 280px; height: 280px;');

    const options = {
      ...this.barcodeOptions,
      text: barcodeData,
      bcid,
    };

    try {
      const image = BwipJs.toSVG(options);
      container.innerHTML = image;
    } catch (error) {
      console.error('Invalid barcode data supplied:', error);
    }

    return container;
  }
}
