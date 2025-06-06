import { Injectable } from '@angular/core';
import { Model } from '@decaf-ts/decorator-validation/lib/model/Model';
import { RamRepository, RamAdapter } from "../../../../core/src/ram";
import { Repository } from "../../../../core/src/repository";
import { KeyValue } from 'src/lib/engine';

const adapter = new RamAdapter();

@Injectable({
  providedIn: 'root'
})
export class RamAdapterService {
  private repo!: RamRepository<Model>;
  constructor(model: Model) {
    this.repo = new Repository(adapter, Model);
  }

  async create(model: Model) {
    return await this.repo.create(model);
  }
}
