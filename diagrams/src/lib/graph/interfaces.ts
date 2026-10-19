import { UIFunctionLike } from '@decaf-ts/ui-decorators';
import { IMenuItem } from '@decaf-ts/for-angular';
/**
 * Graph sidebar menu item: a {@link IMenuItem} extended with grouping and a
 * UI-function handler.
 *
 * @property id - Stable item identifier.
 * @property label - Display label.
 * @property icon - Icon identifier rendered by the sidebar.
 * @property group - Whether the item renders in the primary or secondary group.
 * @property handler - Optional handler invoked when the item is activated.
 * @category Graph
 */
export interface IGraphSidebarItem extends IMenuItem {
  id: string;
  label: string;
  icon: string;
  group: 'primary' | 'secondary';
  handler?: UIFunctionLike;
}
/**
 * One tab of the graph home page.
 *
 * @property id - Stable tab identifier.
 * @property label - Display label of the tab.
 * @category Graph
 */
export interface IHomeTabItem<T extends string> {
  id: T;
  label: string;
}
