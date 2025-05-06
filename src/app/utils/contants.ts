import { MenuItem } from "./types";
export const Menu: MenuItem[] = [
  {
    text: 'Crud',
    icon: 'save-outline',
  },
  {
    text: 'Read',
    url: '/crud/read',
  },
  {
    text: 'Create / Update',
    url: '/crud/create',
  },
  {
    text: 'Lists',
    icon: 'list-outline',
  },
  {
    text: 'Infinte',
    url: '/list/infinite',
  },
  {
    text: 'Paginated',
    url: '/list/paginated',
  }
];

