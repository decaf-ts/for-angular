import { Component, OnInit } from '@angular/core';
import { IonContent } from '@ionic/angular/standalone';
import { ModelRendererComponent } from 'src/lib/components/model-renderer/model-renderer.component';
import { HeaderComponent } from 'src/app/components/header/header.component';
import { ContainerComponent } from 'src/app/components/container/container.component';
import { ListComponent } from 'src/lib/components/list/list.component';
import { NgxModelPageDirective } from 'src/lib/engine/NgxModelPageDirective';
import { EmptyStateComponent } from 'src/lib/components';
import { TranslatePipe } from '@ngx-translate/core';
import { ICrudFormEvent, ITabItem } from 'src/lib/engine/interfaces';
import { ProductLayout } from 'src/app/ew/layouts/ProductLayout';
import { Product } from 'src/app/ew/fabric/Product';
import { CardComponent } from 'src/lib/components/card/card.component';
import { ProductHandler } from 'src/app/ew/fabric/handlers/ProductHandler';
import { AppModalDiffsComponent } from 'src/app/components/modal-diffs/modal-diffs.component';
import { EpiTabs } from 'src/app/ew/utils/constants';
import { OperationKeys } from '@decaf-ts/db-decorators';
import { Model } from '@decaf-ts/decorator-validation';
import { AppProductItemComponent } from 'src/app/components/product-item/product-item.component';
import { AppCardTitleComponent } from 'src/app/components/card-title/card-title.component';
import { KeyValue } from 'src/lib/engine/types';
import { ProductStrength } from 'src/app/ew/fabric';
import { getModelAndRepository } from 'src/lib/engine';
import { Condition } from '@decaf-ts/core';

/**
 * @description Angular component page for CRUD operations on dynamic model entities.
 * @summary The ModelPage component provides a comprehensive interface for performing Create, Read, Update,
 * and Delete operations on any registered model entity within the Decaf framework. This component dynamically
 * adapts to different model types and operations, providing a unified interface for data manipulation. It
 * integrates with the repository pattern for data access, supports real-time data refresh, and provides user
 * feedback through toast notifications and navigation management.
 *
 * Key features include:
 * - Dynamic model resolution based on model name
 * - Support for all CRUD operations with operation-specific UI adaptation
 * - Automatic repository instantiation and management
 * - Integration with Angular routing for navigation flow
 * - Error handling with comprehensive logging
 * - Real-time data refresh and cache management
 * - Toast notifications for user feedback
 * - Responsive layout with Ionic components
 *
 * @param {OperationKeys} operation - The CRUD operation to perform (CREATE, READ, UPDATE, DELETE)
 * @param {string} modelName - The name of the model class to operate on
 * @param {string} modelId - The unique identifier of the model instance for read/update/delete operations
 *
 * @class ModelPage
 * @example
 * ```typescript
 * // Usage in routing configuration
 * {
 *   path: 'user/:modelId',
 *   component: ModelPage,
 *   data: {
 *     modelName: 'User',
 *     operation: OperationKeys.READ
 *   }
 * }
 *
 * // Direct component usage
 * <app-model
 *   modelName="Product"
 *   [operation]="OperationKeys.CREATE"
 *   (submit)="handleSubmit($event)">
 * </app-model>
 * ```
 *
 * @mermaid
 * sequenceDiagram
 *   participant U as User
 *   participant MP as ModelPage
 *   participant R as Repository
 *   participant RS as RouterService
 *   participant T as ToastComponent
 *   participant L as Logger
 *
 *   U->>MP: Navigate to page
 *   MP->>MP: ngOnInit()
 *   MP->>L: Initialize logger
 *
 *   MP->>MP: ionViewWillEnter()
 *   MP->>MP: Set allowed operations
 *   MP->>MP: refresh(modelId)
 *
 *   alt Operation is READ/UPDATE/DELETE
 *     MP->>R: handleGet(modelId)
 *     R->>R: read(modelId)
 *     R-->>MP: Return model data
 *     MP->>MP: Set model
 *   end
 *
 *   U->>MP: Submit form
 *   MP->>MP: handleEvent(submitEvent)
 *   MP->>MP: handleSubmit(event)
 *   MP->>MP: parseData(event.data)
 *
 *   alt Operation is CREATE
 *     MP->>R: create(data)
 *   else Operation is UPDATE
 *     MP->>R: update(data)
 *   else Operation is DELETE
 *     MP->>R: delete(data)
 *   end
 *
 *   R-->>MP: Return operation result
 *   MP->>R: refresh(modelName, operation, modelId)
 *   MP->>RS: backToLastPage()
 *   MP->>T: inform(success message)
 *
 *   alt Error occurs
 *     MP->>L: error(error)
 *     MP->>MP: throw Error
 *   end
 */
@Component({
  standalone: true,
  selector: 'app-products',
  templateUrl: './products.page.html',
  providers: [AppModalDiffsComponent, AppProductItemComponent],
  imports: [
    IonContent,
    AppCardTitleComponent,
    ModelRendererComponent,
    TranslatePipe,
    ListComponent,
    HeaderComponent,
    ContainerComponent,
    EmptyStateComponent,
  ],
  styleUrls: ['./products.page.scss'],
})
export class ProductsPage extends NgxModelPageDirective implements OnInit {
  tabs: ITabItem[] = EpiTabs;

  constructor() {
    super('product');
  }

  async ngOnInit(): Promise<void> {
    this.model = !this.operation ? new Product() : new ProductLayout();
    this.enableCrudOperations([OperationKeys.DELETE]);
    // keep init after model selection
    this.locale = 'product';
    this.title = `${this.locale}.title`;
    this.route = 'products';

    await this.initialize();

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

    // function generateGtin(): string {
    //   function pad(num: number, width: number, padding: string = '0') {
    //     const n = num + '';
    //     return n.length >= width ? n : new Array(width - n.length + 1).join(padding) + n;
    //   }

    //   const beforeChecksum = pad(Math.floor(Math.random() * 9999999999999), 13); // has to be 13. the checksum is the 4th digit
    //   const checksum = calculateGtinCheckSum(beforeChecksum);
    //   return `${beforeChecksum}${checksum}`;
    // }
    // if (this.operation === OperationKeys.CREATE) {
    //   console.log(generateGtin());
    // }

    // if (this.modelId) {
    //   const strengths = getModelAndRepository('ProductStrength');
    //   if (strengths) {
    //     const { repository } = strengths;
    //     const query = await repository
    //       .select()
    //       .where(Condition.attr('productCode' as keyof Model).eq(this.modelId))
    //       .execute();

    //     console.log(query);
    //   }
    // }

    // console.log(this.model);

    // const images = getModelAndRepository('ProductImage');
    // if (images) {
    //   const { repository } = images;
    //   const query = await repository
    //     .select()
    //     .where(Condition.attr('productCode' as keyof Model).eq('00000000000013'))
    //     .execute();
    //   console.log('images', query);
    // }
    // console.log(this.model);
  }
}
