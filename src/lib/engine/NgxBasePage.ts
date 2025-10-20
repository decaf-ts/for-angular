import {MenuController} from "@ionic/angular/standalone";
import { Directive, inject } from "@angular/core";
import { NgxDecafComponent} from "./NgxDecafComponent";
import { getLocaleContext } from "../i18n/Loader";


@Directive()
export abstract class NgxBasePage extends NgxDecafComponent {

	protected menu: MenuController = inject(MenuController)

  // eslint-disable-next-line @angular-eslint/prefer-inject
  constructor(protected localeRoot: string = "", protected hasMenu: boolean = true) {
    super();
    this.locale = this.localeContext;
  }

	get localeContext(){
		if (!this.locale)
			this.locale = getLocaleContext(this.localeRoot)
		return this.locale;
	}

	async ionViewWillEnter(): Promise<void> {
		await this.menu.enable(this.hasMenu);
	}

}
