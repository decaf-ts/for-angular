import { OperationKeys, PrimaryKeyType } from '@decaf-ts/db-decorators';
import { formatDate, isValidDate, Model } from '@decaf-ts/decorator-validation';
import { AppExpiryDateFieldComponent } from 'src/app/components/expiry-date/expiry-date-field.component';
import { TableComponent } from 'src/lib/components/table/table.component';
import { getModelAndRepository } from 'src/lib/engine/helpers';
import { NgxComponentDirective } from 'src/lib/engine/NgxComponentDirective';
import { DecafRepository, KeyValue } from 'src/lib/engine/types';
import { BatchLayout } from '../../layouts/BatchLayout';
import { Batch } from '../Batch';
import { BatchForm } from '../forms/BatchForm';
import { Product } from '../Product';
import { ProductHandler } from './ProductHandler';
const DatePattern = 'yyyy-MM-dd';
const HoursValues = {
  withDaySelection: '00:00:00',
  withoutDaySelection: '11:11:11',
};

const DatePatterns = {
  date: 'yyyy-MM-dd HH:mm:ss',
  month: 'yyyy-MM',
  formattedDate: 'dd/MM/yyyy',
  formatedMonth: 'MM/yyyy',
};

export function getLastDayOfMonth(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  return `${new Date(year, month, day || 0).getDate()}`;
}

export function convertDateToGS1Format(date: string, enableDaySelection: boolean = true, separator = '-'): string {
  const dateArray = date.split(separator);
  if (separator === '/') {
    dateArray.reverse();
  }
  const result = dateArray.map((part, index) => (index === 0 ? part.slice(2) : part)) as string[];
  if (dateArray.length === 2) {
    result.push(getLastDayOfMonth(result.join('-')));
  }
  return result.join(separator).replace(/\D/g, '');
}

export function revertOldGS1ToDateString(date: string, fullDate: boolean = true): string {
  const year = 2000 + Number(date.slice(0, 2));
  const month = Number(date.slice(2, 4));
  if (!fullDate) return `${year}-${month}`;
  let day = Number(date.slice(4, 6));
  day = day === 0 ? Number(getLastDayOfMonth(`${year}-${month}`)) : Number(day);
  return `${year}-${month}-${day}`;
}

function enableExpiryDateDaySelection(value: Date | string): boolean {
  if (typeof value === 'string') {
    const enableDaySelection = !value.includes('00');
    if (!value.includes('-')) {
      value = revertOldGS1ToDateString(value);
    }
    value = parseExpiryDateValue(value, enableDaySelection);
  }
  const timeString = [value.getHours(), value.getMinutes(), value.getSeconds()]
    .map((n) => n.toString().padStart(2, '0'))
    .join(':');
  return timeString === HoursValues.withDaySelection;
}

export function formatExpiryDate(value: string | Date, enableDaySelection: boolean = true): string {
  if (typeof value === 'string') {
    value = parseExpiryDateValue(value, enableDaySelection);
  }
  return formatDate(value, enableDaySelection ? 'dd/MM/yyyy' : 'MM/yyyy');
}

export function parseExpiryDateValue(value: string | Date, enableDaySelection: boolean = true): Date {
  if (isValidDate(value) && typeof value !== 'string') {
    value = formatDate(value, `${DatePattern} HH:mm:ss`).split(' ')[0];
  }
  return new Date(`${value}T${enableDaySelection ? HoursValues.withDaySelection : HoursValues.withoutDaySelection}`);
}

export async function getExpiryDateDiffValue(value: string | Date, instance: NgxComponentDirective): Promise<string> {
  const enableDaySelection = enableExpiryDateDaySelection(value);
  const formatted = formatExpiryDate(value, enableDaySelection);
  return await instance.translate('batch.diffs.expiryDate', [
    formatted,
    convertDateToGS1Format(formatted, enableDaySelection, '/'),
  ]);
}

export class BatchHandler extends ProductHandler<Batch> {
  static uiOnlyProps = ['inventedName', 'nameMedicinalProduct', 'enableDaySelection', 'dataMatrix'] as string[];

  static override skip = [
    'id',
    'owner',
    'updatedAt',
    'updatedBy',
    'version',
    'createdBy',
    'createdAt',
    ...BatchHandler.uiOnlyProps,
  ] as string[];

  static _data?: Batch;

  static parseBatchData<M extends Model>(model: M): M {
    const { expiryDate, enableDaySelection } = model as M & BatchForm;
    const date = parseExpiryDateValue(expiryDate, enableDaySelection);
    const result = Model.build({ ...model, expiryDate: date }, Batch.name) as KeyValue;
    for (const prop of BatchHandler.uiOnlyProps) {
      if (prop in model) {
        delete result[prop];
      }
    }
    return result as M;
  }

  override async render(instance: TableComponent | AppExpiryDateFieldComponent, prop: string): Promise<string | void> {
    const query = instance._query as Product[];
    const model = instance.model as BatchLayout;
    const operation = instance.operation;
    if (!query?.length) {
      const context = getModelAndRepository(Product.name);
      if (context) {
        const { repository } = context;
        const query = await repository.select().execute();
        if (query?.length) {
          instance._query = query;
        }
      }
    }
    if (model) {
      BatchHandler._data = model.batch as Batch;
    }
    if (prop) {
      if (['inventedName', 'nameMedicinalProduct'].includes(prop)) {
        return await BatchHandler.getValueOnProductData(instance as TableComponent, prop as keyof Product);
      }
      if (
        ['enableDaySelection', 'expiryDate'].includes(prop) &&
        BatchHandler._data &&
        operation !== OperationKeys.CREATE
      ) {
        const { expiryDate } = BatchHandler._data;
        const component = instance as AppExpiryDateFieldComponent;
        const enableDaySelection = enableExpiryDateDaySelection(expiryDate);
        const date = parseExpiryDateValue(expiryDate, enableDaySelection);
        component.enableDaySelection = component.checked = enableDaySelection;
        component.calendarInputValue = formatDate(
          date,
          component.enableDaySelection ? DatePatterns.date : DatePatterns.month
        );
        component.expiryDate = convertDateToGS1Format(`${expiryDate}`, enableDaySelection, '-');
      }
    }
  }

  override async beforeUpdate<M extends Model>(
    data: M,
    repository: DecafRepository<M>,
    modelId: PrimaryKeyType
  ): Promise<M | boolean> {
    data = BatchHandler.parseBatchData(data);
    return ProductHandler.endTransaction(data, repository, modelId);
    // if (ProductHandler.deleteEvents?.length) {
    //   for (const event of ProductHandler.deleteEvents) {
    //     const { context } = event;
    //     if (context) {
    //       const { repository, pk } = context;
    //       await this.submit(event as ICrudFormEvent, false, context.repository);
    //       ProductHandler.deleteEvents = [];
    //     }
    //   }
    // }
  }

  override async beforeCreate<M extends Model>(model: M): Promise<M> {
    return BatchHandler.parseBatchData(model);
  }

  private static async getValueOnProductData(instance: TableComponent, prop: keyof Product) {
    const query = instance._query as Product[];
    if (query && instance.model) {
      const product = query.find((p) => p?.productCode === (instance.model as Batch).productCode) as Product;
      if (product && product?.[prop]) {
        return product[prop as keyof typeof product] as string;
      }
    }
    return '';
  }
}
