import { UIFunctionLike } from '@decaf-ts/ui-decorators';
import { IMenuItem } from 'src/lib/engine/interfaces';

export interface IGraphSidebarItem extends IMenuItem {
  id: string;
  label: string;
  icon: string;
  group: 'primary' | 'secondary';
  handler?: UIFunctionLike;
}

export interface IHomeTabItem<T extends string> {
  id: T;
  label: string;
}
