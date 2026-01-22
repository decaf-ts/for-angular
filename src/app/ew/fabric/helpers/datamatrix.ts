import * as bwipjs from 'bwip-js';
import { Batch } from '../Batch';

function sanitizeCode(code: string): string {
  return code.replace(/"/g, '\\"');
}

function bwipjsEscape(data: string): string {
  return data
    .split('')
    .map((char) => {
      if (charsMap[char.charCodeAt(0)]) {
        return Number(char.charCodeAt(0)) >= 100
          ? `^${char.charCodeAt(0)}`
          : `^0${char.charCodeAt(0)}`;
      }
      return char;
    })
    .join('');
}

const BarcodeTypes = {
  gs1datamatrix: 'gs1datamatrix',
  datamatrix: 'datamatrix',
  qrcode: 'qrcode',
} as const;

interface IBarcodeModel {
  barcodeData: string;
  barcodeType?: keyof typeof BarcodeTypes;
  barcodeSize?: number;
  includeBarcodeText?: boolean;
}

const TWO_D_BARCODES = [...Object.values(BarcodeTypes)];
const BarcodeModel = {
  barcodeData: '',
  barcodeType: BarcodeTypes.gs1datamatrix,
  barcodeSize: 32,
  includeBarcodeText: false,
};

function generateSerializationForBatch(batch: Batch, serialNumber: string) {
  let barcodeData;
  if (serialNumber === '' || typeof serialNumber === 'undefined') {
    barcodeData = `(01)${batch.productCode}(10)${batch.batchNumber}(17)${batch.expiryDate}`;
  } else {
    barcodeData = `(01)${batch.productCode}(21)${bwipjsEscape(serialNumber)}(10)${bwipjsEscape(batch.batchNumber)}(17)${batch.expiryDate}`;
  }
  drawQRCodeCanvas({
    ...BarcodeModel,
    barcodeData: sanitizeCode(barcodeData),
  });
}
function drawQRCodeCanvas(model: IBarcodeModel): void {
  if (!model.barcodeData?.length) return;

  const canvas = document.createElement('canvas');

  try {
    const options: Record<string, string | number | boolean> = {
      bcid: model.barcodeType ?? BarcodeTypes.qrcode,
      text: model.barcodeData,
      scale: 4,
      height: 32,
      textxalign: 'center',
    };

    bwipjs.toCanvas(canvas as HTMLCanvasElement, options, (err?: Error) => {
      if (err) console.error('Barcode generation failed:', err);
    });
  } catch (error) {
    console.error('Invalid barcode data supplied:', error);
  }
}

const charsMap: Record<string, string> = {
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
} as const;
