import { IAppMenuItem, ITabItem } from "./interfaces";

export const EpiTabs: ITabItem[] = [
  {
    title: 'epiTabs.products',
    url: 'products',
  },
  {
    title: 'epiTabs.batches',
    url: 'batches',
  },
] as const;

export const LogTabs: ITabItem[] = [
  {
    title: 'logTabs.actions',
    value: 'actions',
    icon: 'assets/images/icons/lock.svg',
  },
   {
    title: 'logTabs.access',
    value: 'access',
    icon: 'assets/images/icons/users.svg',
  },
] as const;

export const AppMenu: IAppMenuItem[] = [
  {
    label: 'dashboard',
    icon: 'ti-layout-dashboard',
    url: '/dashboard',
  },
  // {
  //   label: 'sytem',
  //   url: undefined,
  //   accessRole: {
  //     feature: 'systemManagement',
  //     role: ['admin'],
  //     module: 'system'
  //   }
  // },
  {
    label: 'core',
    url: undefined,
  },
  {
    label: 'products',
    url: 'products',
    activeWhen: ['products', 'batches'],
    icon: 'ti-package',
  },
  {
    label: 'leaflet',
    url: 'leaflets',
    icon: 'ti-file-barcode',
  },
  {
    label: 'audit',
    url: 'audit',
    icon: 'ti-shield-lock',
  },
  {
    label: 'account',
    url: 'account',
    icon: 'ti-user',
  },
  {
    label: 'logout',
    icon: 'ti-logout-2',
    url: '/login',
    color: 'danger'
  }
];
