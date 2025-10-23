import { Directive, inject } from "@angular/core";
import { NgxDecafComponent} from "./NgxDecafComponent";
import { Title } from "@angular/platform-browser";
import { IMenuItem } from "./interfaces";
import { NavigationEnd, NavigationStart } from "@angular/router";
import { removeFocusTrap } from "../helpers";


@Directive()
export abstract class NgxBasePage extends NgxDecafComponent {

  title: string = '';

  protected hasMenu: boolean = true;

  protected menu: IMenuItem[] = [];

  protected titleService: Title = inject(Title);

  constructor() {
    super();
    this.locale = this.localeContext;
  }

	async ionViewWillEnter(): Promise<void> {
		await this.menuController.enable(this.hasMenu);
	}

  protected async initialize(): Promise<void> {
    this.router.events.subscribe(async event => {
      if(event instanceof NavigationEnd) {
        const {url} = event;
        this.hasMenu = !url.includes('login');
        this.setPageTitle(url.replace('/', '') || "login");
      }
      if (event instanceof NavigationStart)
        removeFocusTrap();
    });

    this.initialized = true;
  }

  protected setPageTitle(route: string, menu?: IMenuItem[]): void {
    if(menu)
      menu = this.menu;
    const activeMenu = this.menu.find(item => item?.url?.includes(route));
    if(activeMenu)
      this.titleService.setTitle(`Decaf For Angular - ${activeMenu?.title || activeMenu?.label}`);
  }

}
