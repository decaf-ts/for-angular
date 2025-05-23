export enum ListComponentsTypes {
  INFINITE = 'infinite',
  PAGINATED = 'paginated'
}

export interface IListEmptyResult {
  title: string;
  subtitle: string;
  showButton: boolean;
  buttonText: string;
  link: string;
  icon: string;
}
