import { MenuItem } from "src/lib/engine";

export const Menu: MenuItem[] = [
  {
    text: 'crud',
    icon: 'ti-table-plus',
    accessRole: []
  },
  {
    text: 'Read',
    url: '/crud/read',
  },
  {
    text: 'Create / Update',
    url: '/crud/create',
  },
  // {
  //   text: 'Delete',
  //   url: 'crud/delete',
  // },
];
