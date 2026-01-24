import { NgxEventHandler } from 'src/lib/engine/NgxEventHandler';
import { Audit } from '../Audit';
import { Model, Primitives } from '@decaf-ts/decorator-validation';
import { getNgxModalComponent } from 'src/lib/components';
import { OperationKeys } from '@decaf-ts/db-decorators';
import { AppModalDiffsComponent } from 'src/app/components/modal-diffs/modal-diffs.component';
import { KeyValue } from 'src/lib/engine/types';
import { getLogger } from 'src/lib/engine';
import { he } from '@faker-js/faker/.';

async function downLoadFile(
  content: string,
  extension: 'csv' | 'json',
  filename: string = 'download',
): Promise<void> {
  try {
    const url = URL.createObjectURL(
      new Blob([content], {
        type: extension === 'csv' ? 'text/csv;charset=utf-8;' : 'application/json;charset=utf-8;',
      }),
    );
    const link = document.createElement('a');

    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      filename.endsWith(`.${extension}`) ? filename : `${filename}.${extension}`,
    );
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  } catch (error: unknown) {
    getLogger(downLoadFile).error(
      `Error downloading ${filename} as ${extension}: ${(error as Error)?.message}`,
    );
  }
}

export async function downloadAsCsv(
  data: Audit[],
  filename: string = 'download',
  headers: string[] = [],
  delimiter: string = ',',
): Promise<void> {
  const arrayData = Array.isArray(data) ? data : [data];
  const cols = Object.keys(arrayData[0]);
  if (!headers.length) {
    headers = cols;
  }
  const headerRow = headers.map((header) => `"${header}"`).join(delimiter);
  const rows = await Promise.all(
    arrayData.map(async (row: KeyValue) => {
      const values = await Promise.all(
        cols.map(async (col, index: number) => {
          if (index <= headers.length - 1) {
            let value = row[col];
            if (value === null || value === undefined) {
              return '""';
            }
            if (value instanceof Promise) {
              value = await value;
            }
            return `"${String(value).replace(/"/g, '""')}"`;
          }
        }),
      );
      return values.join(delimiter);
    }),
  );

  const content = [headerRow, ...rows].join('\n');

  return await downLoadFile(content, 'csv', filename);
}

export async function downloadAsJson(
  data: Audit,
  filename: string = 'download',
  format: boolean = true,
): Promise<void> {
  return await downLoadFile(
    format ? JSON.stringify(data, null, 2) : JSON.stringify(data),
    'json',
    filename,
  );
}

export class AuditHandler extends NgxEventHandler {
  override async handleClick(instance: NgxEventHandler, event: CustomEvent, uid: string) {
    const item = (instance._data as Audit[]).find((item) => item[Model.pk(Audit)] === uid) as Audit;
    const diffs = (item as Audit)?.diffs || undefined;
    if (item && diffs) {
      let content = JSON.parse(diffs as unknown as string);
      while (typeof content === Primitives.STRING) {
        content = JSON.parse(content);
      }
      const locale = instance.locale as string;
      const modal = await getNgxModalComponent(
        {
          tag: 'app-modal-diffs',
          expandable: true,
          title: `${locale.toLowerCase()}.diffs.title`,
          //  headerTransparent: true,
          globals: {
            diffs: content,
            locale: item.table.toLowerCase(),
            confirmButton: {
              text: 'audit.button.download',
              handle: async () => {
                await downloadAsJson(content, item.transaction);
              },
            },
          } as AppModalDiffsComponent,
        },
        {},
        instance.injector,
      );
      await modal.present();
      // const container = document.createElement('div');
      // let content = JSON.parse(diffs as unknown as string);
      // while (typeof content === Primitives.STRING) {
      //   content = JSON.parse(content);
      // }
      // container.innerHTML = `<pre>${JSON.stringify(content, null, 2)}</pre>`;

      // await presentNgxInlineModal(
      //   container,
      //   {
      //     title: 'audit.diffs.preview',
      //     headerTransparent: true,
      //   },
      //   this.injector,
      // );
    }
  }
}
