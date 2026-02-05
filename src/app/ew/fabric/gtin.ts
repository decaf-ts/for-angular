import {
  innerValidationDecorator,
  Validator,
  validator,
  ValidatorOptions,
} from '@decaf-ts/decorator-validation';
import { apply } from '@decaf-ts/decoration';

const GTIN_VALIDATION_KEY = 'gtin';
export const GTIN_MISSING_DIGITS_ERROR_MESSAGE =
  'Gtin length is 14. you are missing {1} more digits';
export const GTIN_NEXT_DIGIT_ERROR_MESSAGE = 'to be a valid gtin your next digit must be {1}';
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

@validator(GTIN_VALIDATION_KEY)
export class GtinValidator extends Validator {
  constructor(message: string = GTIN_VALIDATION_ERROR_MESSAGE) {
    super(message, 'string', 'number');
  }

  protected parseMessage(
    message: string,
    options: ValidatorOptions & { customMessage?: boolean },
    ...args: any[]
  ): string | undefined {
    const { customMessage } = options || false;
    if (!customMessage) return this.getMessage(message, ...args);
    return message + `${args ? '|' + args.join('|') : ''}`;
  }

  hasErrors(value: number | string, options: ValidatorOptions = {}): string | undefined {
    if (value === undefined) return;

    const { message } = options;
    const [digitsError, checkSumError, fallbackError] = message as unknown as string[];
    const gtin = value + '';

    let checksum: string;

    const length = gtin.length;
    if (length > 13) return this.parseMessage(fallbackError, options);
    if (length < 13) return this.parseMessage(digitsError, options, 14 - length);
    if (length === 13) {
      checksum = calculateGtinCheckSum(gtin);
      return this.parseMessage(checkSumError, options, checksum);
    }

    if (!gtin.match(/\d{14}/g)) return this.parseMessage(fallbackError || this.message, options);

    const digits = gtin.slice(0, 13);
    checksum = calculateGtinCheckSum(digits);
    return parseInt(checksum) === parseInt(gtin.charAt(13))
      ? undefined
      : this.parseMessage(message || this.message, options);
  }
}

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
