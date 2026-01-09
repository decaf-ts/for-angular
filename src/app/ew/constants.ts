import { ITabItem } from "src/lib/engine/interfaces";

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
