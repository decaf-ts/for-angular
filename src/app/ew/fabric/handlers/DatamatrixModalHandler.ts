import { Batch } from '../Batch';
import { NgxEventHandler } from 'src/lib/engine/NgxEventHandler';

export class DatamatrixModalHandler extends NgxEventHandler {
  override async handleClick(instance: NgxEventHandler, event: CustomEvent, uid: string) {
    console.log('DatamatrixModalHandler clicked', instance, event, uid);
    const item = (instance._data as Batch[]).find((item) => item['batchNumber'] === uid) || {};
    console.log(item);
    // const diffs = (item as Audit)?.diffs || undefined;
    // if (diffs) {
    //   const container = document.createElement('div');
    //   let content = JSON.parse(diffs as unknown as string);
    //   while (typeof content === Primitives.STRING) {
    //     content = JSON.parse(content);
    //   }
    //   container.innerHTML = `<pre>${JSON.stringify(content, null, 2)}</pre>`;

    //   await presentNgxInlineModal(
    //     container,
    //     {
    //       title: 'audit.diffs.preview',
    //       // uid: 'leaflet-service-parsed-content',
    //       headerTransparent: true,
    //     },
    //     this.injector,
    //   );
    // }
  }
}
