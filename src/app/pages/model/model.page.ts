import { Component, inject, Inject, Input, OnInit } from '@angular/core';
import {
  CrudOperations,
  InternalError,
  IRepository,
  OperationKeys,
} from '@decaf-ts/db-decorators';
import { Repository } from '@decaf-ts/core';
import { Model } from '@decaf-ts/decorator-validation';
import { ComponentsModule } from 'src/app/components/components.module';
import { IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonSearchbar } from '@ionic/angular/standalone';
import { BaseCustomEvent, EventConstants } from 'src/lib/engine';
import { FormReactiveSubmitEvent } from 'src/lib/components/crud-form/types';
import { RouterService } from 'src/app/services/router.service';
import { getNgxToastComponent } from 'src/app/utils/NgxToastComponent';
import { DecafRepository } from 'src/lib/components/list/constants';
import { DefaultLoggingConfig, Logger, MiniLogger } from '@decaf-ts/logging';

@Component({
  standalone: true,
  selector: 'app-model',
  templateUrl: './model.page.html',
  imports: [ComponentsModule, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonSearchbar],
  styleUrls: ['./model.page.scss'],
})
export class ModelPage implements OnInit {
  @Input()
  operation:
    | OperationKeys.CREATE
    | OperationKeys.READ
    | OperationKeys.UPDATE
    | OperationKeys.DELETE = OperationKeys.READ;

  @Input()
  modelName!: string;

  @Input()
  uid!: string;

  model!: Model | undefined;

  logger!: Logger;

  private _repository?: IRepository<Model>;
  private routerService: RouterService = inject(RouterService);

  private get repository() {
    if (!this._repository) {
      const constructor = Model.get(this.modelName);
      if (!constructor)
        throw new InternalError(
          'Cannot find model. was it registered with @model?',
        );
      this._repository = Repository.forModel(constructor);
      this.model = new constructor() as Model;
    }
    return this._repository;
  }

  ngOnInit(): void {
    this.logger = new MiniLogger('for-angular', DefaultLoggingConfig).for(this.constructor.name);
  }

  async ionViewWillEnter(): Promise<void> {
    return this.refresh(this.uid);
  }

  async refresh(uid?: string) {
    const self: ModelPage = this;
    try {
      this.repository;
      // const model = new (Model.get(!self.modelName.includes('Model') ? `${self.modelName}Model` : self.modelName) as ModelConstructor<any>)();
      switch(self.operation){
        case OperationKeys.READ:
        case OperationKeys.UPDATE:
        case OperationKeys.DELETE:
          this.model = await self.handleGet(this.uid);
        break;
        // to DO
        // default:
        //   return Model.fromObject(self.manager)
      }
    } catch (error: any) {
      this.logger.error(error?.message || error);
    }
    // this.model = (Model.get(self.modelName) as any)();
    // console.log(this.model);
    // this.model = Model.fromModel(getInjectablesRegistry().get(self.modelName)) as any;
    // console.log(this.model)
    // if (this.operation !== OperationKeys.CREATE)
    //   await self.handleGet((uid || self.modelId) as string);
    //
    // await self.getLocale();
    // this.getComponent();
    // return new Promise<void>( async (resolve, reject) => {
    //   switch(self.operation){
    //     case CRUD_OPERATIONS.READ || CRUD_OPERATIONS.UPDATE:
    //       self.handleGet((pk || self.pk) as string);
    //     break;
    //     // to DO
    //     // default:
    //     //   return Model.fromObject(self.manager)
    //   }
    //   if(this.operation === CRUD_OPERATIONS.CREATE) {}
    //   // const filter = modelId || self.modelId;
    //   // let condition = !filter ?
    //   //   Condition.builder.attribute("id").dif('null') : Condition.builder.attribute("id").eq(filter);
    //   // let results = null;
    //   // if(self.manager)
    //   //   results = await self.manager.read("wallet.replication");
    //   // await self.getComponent(results);
    // })
  }

  async handleEvent(event: BaseCustomEvent) {
    const { name, data } = event;
    switch (event.name) {
      case EventConstants.SUBMIT_EVENT:
        await this.handleSubmit(event);
      break;
    }
  }

  async handleSubmit(event: FormReactiveSubmitEvent): Promise<void | Error> {
    try {
      const repo = this._repository as IRepository<Model>;
      const data = this.parseData(event.data, this.operation);
      const result = this.operation === OperationKeys.CREATE ?
        await repo.create(data as Model) : this.operation === OperationKeys.UPDATE ?
          await repo.update(data as Model) : repo.delete(data as string | number);
      if(result) {
        (repo as DecafRepository<Model>).refresh(this.modelName, this.operation, this.uid);
        this.routerService.backToLastPage();
        await getNgxToastComponent().inform(`${this.operation} Item successfully`);
      }
    } catch (error: any) {
      this.logger.error(error?.message || error);
      throw new Error(error);
    }
    // console.log(data)
  }

  async handleGet(uid: string): Promise<Model | undefined> {
    const self = this;
    return new Promise(async (resolve, reject) => {
      if (!uid) {
        this.logger.info('No key passed to model page read operation, backing to last page',);
        this.routerService.backToLastPage();
        return reject(undefined);
      }
      resolve(await (this._repository as IRepository<Model>).read(Number(uid)));
    })
  }


  private parseData(data: Partial<Model>, opration: OperationKeys): Model | string | number{
      const repo = this._repository as IRepository<Model>;
      let uid: number | string = this.uid;
      if(repo.pk === 'id' as keyof Model)
        uid = Number(uid);
      if(this.operation !== OperationKeys.DELETE)
        return Model.build(this.uid ? Object.assign(data, {[repo.pk]: uid}) : data, this.modelName) as Model;
      return uid;

  }
}
