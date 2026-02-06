import { apply } from '@decaf-ts/decoration';
import {
  innerValidationDecorator,
  validator,
  ValidatorOptions,
} from '@decaf-ts/decorator-validation';
import { UIValidator } from '@decaf-ts/ui-decorators';

const GTIN_VALIDATION_KEY = 'gtin';
export const GTIN_MISSING_DIGITS_ERROR_MESSAGE =
  'Gtin length is 14. you are missing {0} more digits';
export const GTIN_NEXT_DIGIT_ERROR_MESSAGE = 'to be a valid gtin your next digit must be {0}';
export const GTIN_VALIDATION_ERROR_MESSAGE = 'Not a valid Gtin';

export function generateGtin(): string {
  function pad(num: number, width: number, padding: string = '0') {
    const n = num + '';
    return n.length >= width ? n : new Array(width - n.length + 1).join(padding) + n;
  }

  const beforeChecksum = pad(Math.floor(Math.random() * 9999999999999), 13); // has to be 13. the checksum is the 4th digit
  const checksum = calculateGtinCheckSum(beforeChecksum);
  return `${beforeChecksum}${checksum}`;
}

// https://www.gs1.org/services/how-calculate-check-digit-manually
function calculateGtinCheckSum(digits: string): string {
  digits = '' + digits;
  if (digits.length !== 13) throw new Error('needs to received 13 digits');
  const multiplier = [3, 1, 3, 1, 3, 1, 3, 1, 3, 1, 3, 1, 3];
  let sum = 0;
  try {
    // multiply each digit for its multiplier according to the table
    for (let i = 0; i < 13; i++) sum += parseInt(digits.charAt(i)) * multiplier[i];

    // Find the nearest equal or higher multiple of ten
    const remainder = sum % 10;
    let nearest;
    if (remainder === 0) nearest = sum;
    else nearest = sum - remainder + 10;

    return nearest - sum + '';
  } catch (e) {
    throw new Error(`Did this received numbers? ${e}`);
  }
}

type MessageSource = string | string[] | undefined;

@validator(GTIN_VALIDATION_KEY)
export class GtinValidator extends UIValidator {
  constructor(message: string = GTIN_VALIDATION_ERROR_MESSAGE) {
    super(message, 'string', 'number');
  }

  private resolveMessages(message?: MessageSource): [string, string, string] {
    if (Array.isArray(message)) {
      const [missingDigits, nextDigit, fallback] = message;
      return [
        missingDigits ?? GTIN_MISSING_DIGITS_ERROR_MESSAGE,
        nextDigit ?? missingDigits ?? GTIN_NEXT_DIGIT_ERROR_MESSAGE,
        fallback ?? nextDigit ?? missingDigits ?? this.message,
      ];
    }
    if (typeof message === 'string' && message.length > 0) {
      return [message, message, message];
    }
    return [GTIN_MISSING_DIGITS_ERROR_MESSAGE, GTIN_NEXT_DIGIT_ERROR_MESSAGE, this.message];
  }

  hasErrors(value: number | string, options: ValidatorOptions): string | undefined {
    if (value === undefined || value === null) return;
    if (typeof value !== 'string' && typeof value !== 'number') {
      return this.getMessage(this.message);
    }

    const [missingDigitsMessage, checksumMessage, fallbackMessage] = this.resolveMessages(
      options?.message || this.message,
    );

    const gtin = `${value}`.trim();
    if (!gtin) return this.getMessage(fallbackMessage);

    if (!/^\d+$/.test(gtin)) {
      return this.getMessage(fallbackMessage);
    }

    const length = gtin.length;

    if (length < 13) {
      return this.getMessage(missingDigitsMessage, 14 - length);
    }

    if (length === 13) {
      const checksum = calculateGtinCheckSum(gtin);
      return this.getMessage(checksumMessage, checksum);
    }

    if (length > 14) {
      return this.getMessage(fallbackMessage);
    }
    const digits = gtin.slice(0, 13);
    const checksum = calculateGtinCheckSum(digits);
    return checksum === gtin.charAt(13) ? undefined : this.getMessage(fallbackMessage);
  }
}

// hasErrors(value: number | string, options?: ValidatorOptions): string | undefined {
//   if (value === undefined) return;

//   const { message } = options || {};
//   const [digitsError, checkSumError, fallbackError] = message as unknown as string[];
//   const gtin = value + '';

//   let checksum: string;

//   const length = gtin.length;
//   if (length > 14) return this.getMessage(fallbackError);
//   if (length < 13) return this.getMessage(digitsError, length);
//   if (length === 13) {
//     checksum = calculateGtinCheckSum(gtin);
//     return this.getMessage(checkSumError, checksum);
//   }

//   if (!gtin.match(/\d{14}/g)) return this.getMessage(fallbackError || this.message);
//   const digits = gtin.slice(0, 13);
//   checksum = calculateGtinCheckSum(digits);
//   return parseInt(checksum) === parseInt(gtin.charAt(13))
//     ? undefined
//     : this.getMessage(message || this.message);
// }

export const gtin = (
  messages: string[] = [
    GTIN_MISSING_DIGITS_ERROR_MESSAGE,
    GTIN_NEXT_DIGIT_ERROR_MESSAGE,
    GTIN_VALIDATION_ERROR_MESSAGE,
  ],
) => {
  return apply(
    innerValidationDecorator(gtin, GTIN_VALIDATION_KEY, {
      message: messages,
      async: false,
    }),
  );
};
