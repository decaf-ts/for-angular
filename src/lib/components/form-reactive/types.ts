export interface FormReactiveSubmitEvent {
  data: Record<string, unknown>;
}

export interface FormReactiveOptions {
  buttons: {
    submit: {
      icon?: string;
      iconSlot?: 'start' | 'end';
      text?: string;
    };
    clear?: {
      icon?: string;
      iconSlot?: 'start' | 'end';
      text?: string;
    };
  };
}
