import { Component} from '@angular/core';
import { IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonContent } from '@ionic/angular/standalone';
import { ModelRendererComponent } from 'src/lib/components/model-renderer/model-renderer.component';
import { HeaderComponent } from 'src/app/components/header/header.component';
import { ContainerComponent } from 'src/app/components/container/container.component';
import { ListComponent } from 'src/lib/components/list/list.component';
import { NgxModelPageDirective } from 'src/lib/engine/NgxModelPageDirective';
import { EmptyStateComponent } from 'src/lib/components';
import { TranslatePipe } from '@ngx-translate/core';
import { getNgxToastComponent } from 'src/app/utils/NgxToastComponent';
import { IBaseCustomEvent, IModelPageCustomEvent } from 'src/lib/engine/interfaces';

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
  selector: 'app-model',
  templateUrl: './model.page.html',
  imports: [ModelRendererComponent, TranslatePipe, ListComponent, HeaderComponent, ContainerComponent, EmptyStateComponent, IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent],
  styleUrls: ['./model.page.scss'],
})
export class ModelPage extends NgxModelPageDirective {
  // constructor() {
  //   super(true, getNgxToastComponent() as unknown as ToastController);
  // }

  override async ionViewWillEnter(): Promise<void> {
   await super.ionViewWillEnter();
  }

  override async handleEvent(event: IBaseCustomEvent): Promise<void> {
    const {success, message} = await super.handleSubmit(event) as IModelPageCustomEvent;
    const toast = getNgxToastComponent({
      color: success ? 'dark' : 'danger',
      message,
    });
    await toast.show();
  }
}
