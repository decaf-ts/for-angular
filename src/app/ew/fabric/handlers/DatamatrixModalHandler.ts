import { Batch } from '../Batch';
import { NgxEventHandler } from 'src/lib/engine/NgxEventHandler';
import { BarcodeTypes } from '../constants';
import BwipJs, { BwippOptions } from '@bwip-js/browser';
import { presentNgxInlineModal } from 'src/lib/components/modal/modal.component';

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
    const item = (instance._data as Batch[]).find(
      (item) => item[instance.pk as keyof Batch] === uid,
    );
    if (item) {
      const datamatrixElement = DatamatrixModalHandler.getDatamatrixCanvasElement(item);
      if (datamatrixElement) {
        await presentNgxInlineModal(
          datamatrixElement,
          {
            title: 'batch.datamatrix.preview',
            uid: 'dcf-datamatrix-modal',
            headerTransparent: true,
          },
          this.injector,
        );
      }
    }

    // const diffs = (item as Audit)?.diffs || undefined;
    // if (diffs) {
    //   const container = document.createElement('div');
    //   let content = JSON.parse(diffs as unknown as string);
    //   while (typeof content === Primitives.STRING) {
    //     content = JSON.parse(content);
    //   }
    //   container.innerHTML = `<pre>${JSON.stringify(content, null, 2)}</pre>`;
  }

  static getBarcodeData(batch: Batch): string {
    let { batchNumber, productCode, expiryDate } = batch;
    const serialNumber = '';
    const emptySerialNumber = serialNumber === '' || typeof serialNumber === 'undefined';
    const sanitizeBatchNumber = (value: string): string => {
      return value
        .split('')
        .map((char) => {
          if (this.charsMap[char.charCodeAt(0)]) {
            return Number(char.charCodeAt(0)) >= 100
              ? `^${char.charCodeAt(0)}`
              : `^0${char.charCodeAt(0)}`;
          }
          return char;
        })
        .join('');
    };
    //TODO: Remover
    productCode = '00000000000017';
    batchNumber = `bt_${productCode}`;

    return (
      emptySerialNumber
        ? `(01)${productCode}(10)${batchNumber}(17)${expiryDate}`
        : `(01)${productCode}(21)${sanitizeBatchNumber(serialNumber)}(10)${sanitizeBatchNumber(batchNumber)}(17)${expiryDate}`
    ).replace(/"/g, '\\"');
  }

  static getDatamatrixCanvasElement(
    batch: Batch,
    bcid: keyof typeof BarcodeTypes = BarcodeTypes.datamatrix,
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
