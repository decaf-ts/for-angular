/**
 * @module module:lib/engine/NgxPageDirective
 * @description Base page component for Decaf Angular applications.
 * @summary Provides a page-level base class (NgxPageDirective) that extends NgxDecafComponentDirective and
 * offers page-focused utilities such as menu management, title handling and router event hooks.
 *
 * @link {@link NgxPageDirective}
 */
import { Directive, Inject, inject } from "@angular/core";
import { NgxDecafComponentDirective} from "./NgxDecafComponentDirective";
import { Title } from "@angular/platform-browser";
import { IMenuItem } from "./interfaces";
import { CPTKN } from "../for-angular-common.module";


@Directive()
export abstract class NgxPageDirective extends NgxDecafComponentDirective {

  title: string = '';

  protected menu: IMenuItem[] = [];

  protected titleService: Title = inject(Title);

  // eslint-disable-next-line @angular-eslint/prefer-inject
  constructor(@Inject(CPTKN) protected override localeRoot?: string, @Inject(CPTKN) protected hasMenu: boolean = true) {
    super(localeRoot);
  }

	async ionViewWillEnter(): Promise<void> {
		await this.menuController.enable(this.hasMenu);
	}

  protected setPageTitle(route: string, menu?: IMenuItem[]): void {
    if(menu)
      menu = this.menu;
    const activeMenu = this.menu.find(item => item?.url?.includes(route));
    if(activeMenu)
      this.titleService.setTitle(`Decaf For Angular - ${activeMenu?.title || activeMenu?.label}`);
  }

}
