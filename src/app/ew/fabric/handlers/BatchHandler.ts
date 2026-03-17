import { OperationKeys, PrimaryKeyType } from '@decaf-ts/db-decorators';
import { formatDate, isValidDate, Model } from '@decaf-ts/decorator-validation';
import { CrudOperationKeys } from '@decaf-ts/ui-decorators';
import { FieldsetComponent, ICrudFormEvent } from 'dist/lib';
import { AppExpiryDateFieldComponent } from 'src/app/components/expiry-date/expiry-date-field.component';
import { getNgxToastComponent } from 'src/app/utils/NgxToastComponent';
import { TableComponent } from 'src/lib/components/table/table.component';
import { NgxComponentDirective } from 'src/lib/engine/NgxComponentDirective';
import { DecafRepository, KeyValue } from 'src/lib/engine/types';
import { BatchLayout } from '../../layouts/BatchLayout';
import { Batch, ManufacturerAddress } from '../Batch';
import { DatePattern } from '../constants';
import { BatchForm } from '../forms/BatchForm';
import { Product } from '../Product';
import { ProductHandler } from './ProductHandler';

const HoursValues = {
  withDaySelection: '00:00:00',
  withoutDaySelection: '11:11:11',
};

const DatePatterns = {
  date: 'yyyy-MM-dd',
  month: 'yyyy-MM',
  formattedDate: 'dd/MM/yyyy',
  formatedMonth: 'MM/yyyy',
};

function getLastDayOfMonth(date: string, separator = '-') {
  const dateArray = date.split(separator);
  if (separator === '/') {
    dateArray.reverse();
  }
  const [year, month] = dateArray.map(Number);
  return `${new Date(year, month, 0).getDate()}`;
}

function parseLegacyGS1DateToString(date: string, fullDate = true) {
  const year = 2000 + Number(date.slice(0, 2));
  const month = Number(date.slice(2, 4));
  if (!fullDate) return `${year}-${month}`;
  let day = Number(date.slice(4, 6));
  day = day === 0 ? Number(getLastDayOfMonth(`${year}-${month}`)) : Number(day);
  return `${year}-${month}-${day}`;
}

export function convertDateToGS1Format(date: string, separator = '-') {
  const dateArray = date.split(' ')[0].split(separator);
  if (separator === '/') {
    dateArray.reverse();
  }
  const result = dateArray.map((part, index) => (index === 0 ? part.slice(2) : part));
  if (dateArray.length === 2) {
    result.push(getLastDayOfMonth(result.join('-')));
  }
  return result.join(separator).replace(/\D/g, '');
}

export function enableExpiryDateDaySelection(value: Date | string): boolean {
  if (typeof value === 'string') {
    const enableDaySelection = !value.includes('00');
    if (!value.includes('-')) {
      value = parseLegacyGS1DateToString(value);
    }
    value = parseExpiryDateValue(value, enableDaySelection) as Date;
  }
  const timeString = [value.getHours(), value.getMinutes(), value.getSeconds()]
    .map((n) => n.toString().padStart(2, '0'))
    .join(':');
  return timeString === HoursValues.withDaySelection;
}

export function formatExpiryDate(value: string | Date, enableDaySelection: boolean = true): string {
  if (typeof value === 'string') {
    value = parseExpiryDateValue(value, enableDaySelection) as Date;
  }
  return formatDate(value, enableDaySelection ? DatePatterns.formattedDate : DatePatterns.formatedMonth);
}

export function parseExpiryDateValue(
  value: string | Date,
  enableDaySelection: boolean = true,
  toString: boolean = false
): Date | string {
  if (isValidDate(value) && typeof value !== 'string') {
    value = formatDate(value, `${DatePattern} HH:mm:ss`);
  }
  value = (value as string).split(' ')[0];
  if (toString) {
    if (!enableDaySelection) {
      const dateArray = value.split('-');
      dateArray.pop();
      if (dateArray?.length) {
        value = dateArray.join('-');
      }
    }
    return value;
  }
  return new Date(`${value}T${enableDaySelection ? HoursValues.withDaySelection : HoursValues.withoutDaySelection}`);
}

export async function getExpiryDateDiffValue(value: string | Date, instance: NgxComponentDirective): Promise<string> {
  const enableDaySelection = enableExpiryDateDaySelection(value);
  const formatted = formatExpiryDate(value, enableDaySelection);
  return await instance.translate('batch.diffs.expiryDate', [formatted, convertDateToGS1Format(formatted, '/')]);
}

export class BatchHandler extends ProductHandler<Batch> {
  static uiOnlyProps = ['inventedName', 'nameMedicinalProduct', 'enableDaySelection', 'dataMatrix'] as string[];
  static products: Product[];
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

  override async render(instance: NgxComponentDirective, prop: string): Promise<string | void> {
    const model = instance.model as BatchLayout;
    const operation = instance.operation;
    if (model) {
      BatchHandler._data = model.batch as Batch;
    }
    if (prop) {
      if (['inventedName', 'nameMedicinalProduct', 'batchNumber'].includes(prop)) {
        const value = await BatchHandler.getValueOnProductData(instance as TableComponent, prop as keyof Product);
        if (!this.operation) {
          return value;
        }
        if (!this.value) {
          this.value = value;
        }
      }
      if (prop === 'ManufacturerAddress' && instance.operation) {
        if ((instance._data as Batch)?.manufacturerAddress) {
          instance._data = (instance._data as Batch).manufacturerAddress;
          (instance as unknown as FieldsetComponent).refresh(instance.operation as CrudOperationKeys);
        }
      }
      if (
        ['enableDaySelection', 'expiryDate'].includes(prop) &&
        BatchHandler._data &&
        operation !== OperationKeys.CREATE
      ) {
        const { expiryDate } = BatchHandler._data;
        const component = instance as AppExpiryDateFieldComponent;
        const enableDaySelection = enableExpiryDateDaySelection(expiryDate);
        const date = parseExpiryDateValue(expiryDate, enableDaySelection) as Date;
        component.enableDaySelection = enableDaySelection;
        component.calendarInputValue = formatDate(
          date,
          component.enableDaySelection ? DatePatterns.date : DatePatterns.month
        );
        component.expiryDate = convertDateToGS1Format(`${parseExpiryDateValue(date, enableDaySelection, true)}`, '-');
      }
    }
  }

  override async handle(event: ICrudFormEvent): Promise<void> {
    const { role } = event;
    let result = false;
    let submited = false;
    ProductHandler.loadingMessage = await this.translate(ProductHandler.loadingMessage, { '0': '' });
    switch (role) {
      case OperationKeys.CREATE:
      case OperationKeys.UPDATE: {
        BatchHandler.instance = this as unknown as NgxComponentDirective;
        await BatchHandler.showLoading();
        const batch = (event.data as BatchLayout).batch as BatchForm;
        const { address } = batch;
        if (address) {
          delete batch.address;
          const addressArray = Object.values(address).flatMap((item) => (Array.isArray(item) ? item : [item]));
          event.data = {
            batch: {
              ...batch,
              manufacturerAddress: addressArray,
            },
          };
        }
        const { success, aborted } = await this.submit(event, false);
        submited = !aborted;
        result = success;
        break;
      }
      case OperationKeys.DELETE: {
        const { context, data } = event;
        if (!context) {
          const { success, aborted } = await this.submit({ ...event, data }, false);
          submited = !aborted;
          result = success;
        }
      }
    }

    if (submited) {
      if (result) {
        await BatchHandler.instance?.router.navigateByUrl(`batches`, {
          replaceUrl: true,
          onSameUrlNavigation: 'reload',
        });
      }
      const toast = getNgxToastComponent();
      await toast.show({
        color: result ? 'dark' : 'danger',
        message: await this.translate(`operations.multiple.${result ? 'success' : 'error'}`),
      });
      if (BatchHandler.loading.isVisible()) {
        await BatchHandler.loading.remove();
      }
      BatchHandler.data = undefined;
    }
  }

  override async beforeCreate<M extends Model>(model: M): Promise<M> {
    return BatchHandler.parseBatchData(model);
  }

  override async beforeUpdate<M extends Model>(
    data: M,
    repository: DecafRepository<M>,
    modelId: PrimaryKeyType
  ): Promise<boolean | M> {
    data = BatchHandler.parseBatchData(data);
    return BatchHandler.showModalDiffs(data, repository, modelId);
    // if (BatchHandler.deleteEvents?.length) {
    //   for (const event of BatchHandler.deleteEvents) {
    //     const { context } = event;
    //     if (context) {
    //       const { repository, pk } = context ;
    //       await this.submit(event as ICrudFormEvent, false, context.repository);
    //       BatchHandler.deleteEvents = [];
    //     }p
    //   }
    // }
  }

  static parseBatchData<M extends Model>(model: M): M {
    const { expiryDate, enableDaySelection } = model as M & BatchForm;
    const date = parseExpiryDateValue(expiryDate, enableDaySelection);
    const result = Model.build({ ...model, expiryDate: date }, Batch.name) as KeyValue;
    for (const prop of BatchHandler.uiOnlyProps) {
      if (prop === 'address') {
        const eventData = BatchHandler.model as BatchForm;
        if (eventData) {
          const value = eventData[prop];
          const entries = Object.entries(value as ManufacturerAddress) || undefined;
          const address: ManufacturerAddress[] = [];
          if (entries.length) {
            for (const [, v] of entries) {
              if (v.address !== '') {
                const item: ManufacturerAddress = Model.build(v, ManufacturerAddress.name);
                address.push(item);
              }
            }
            result['manufacturerAddress'] = address;
          }
        }
        delete result[prop];
      }
      if (prop in model) {
        delete result[prop];
      }
    }
    result['manufacturerAddress'] = result['manufacturerAddress'] ?? [];
    return result as M;
  }

  static async getValueOnProductData(instance: TableComponent, prop: string) {
    if (!instance._query?.length) {
      instance._query = (await this.queryModelData(Product.name)) as Product[];
    }
    if (!instance.model) {
      instance.model = BatchHandler._data;
    }
    BatchHandler._data = instance.model as Batch;
    const query = instance._query as Product[];
    if (prop === 'batchNumber') {
      return (instance.model as Batch)?.batchNumber || '';
    }
    if (query && instance.model) {
      const product = query.find((p) => p?.productCode === (instance.model as Batch).productCode) as Product;
      if (product && product?.[prop as keyof Product]) {
        return product[prop as keyof typeof product] as string;
      }
    }
    return '';
  }
}
