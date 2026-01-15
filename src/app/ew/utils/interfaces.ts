import { IMenuItem } from "src/lib/engine/interfaces";


type AccessWhen = 'feature' | 'role' | 'module';

export interface IAppMenuItem extends IMenuItem {
  activeWhen?: string[];
  accessRole?: Record<AccessWhen, string | string[]>;
}

export interface ITabItem {
  title?: string;
  description?: string;
  url?: string;
  value?: string;
  icon?: string;
}
