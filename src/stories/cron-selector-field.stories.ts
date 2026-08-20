import { FormControl, FormGroup } from '@angular/forms';
import { OperationKeys } from '@decaf-ts/db-decorators';
import { IonButton, IonCheckbox, IonLabel } from '@ionic/angular/standalone';
import type { Meta, StoryObj } from '@storybook/angular';
import { CronSelectorComponent } from 'src/lib/components/cron-selector/cron-selector.component';
import { CronSelectorFieldComponent } from 'src/lib/components/cron-selector-field/cron-selector-field.component';
import './setup';
import { getComponentMeta } from './utils';

function buildFormState(
  name: string,
  value = ''
): Pick<CronSelectorFieldComponent, 'formGroup' | 'path'> {
  const formGroup = new FormGroup({
    [name]: new FormControl(value),
  });

  return {
    formGroup,
    path: name,
  };
}

const component = getComponentMeta<CronSelectorFieldComponent>([
  IonButton,
  IonCheckbox,
  IonLabel,
  CronSelectorComponent,
]);
const meta: Meta<CronSelectorFieldComponent> = {
  title: 'Components/Cron Selector Field',
  component: CronSelectorFieldComponent,

  ...component,
  render: (args) => {
    const { formGroup, path } = buildFormState(args.name, String(args.value ?? ''));

    return {
      props: {
        ...args,
        formGroup,
        path: args.path || path,
      },
    };
  },
  args: {
    operation: OperationKeys.CREATE,
    name: 'cronExpression',
    label: 'Schedule',
    value: '',
    allowEmpty: false,
    hideDaily: false,
    hideInterval: false,
    hideWeekly: false,
    describeCron: false,
    required: true,
    ...buildFormState('cronExpression'),
  },
};
export default meta;
type Story = StoryObj<CronSelectorFieldComponent>;

export const init: Story = {};

export const withValue: Story = {
  args: {
    ...buildFormState('cronExpression', '0 9 * * *'),
    value: '0 9 * * *',
  },
};

export const describeCronEnabled: Story = {
  args: {
    ...buildFormState('cronExpression', '0 9 * * *'),
    value: '0 9 * * *',
    describeCron: true,
  },
};

export const optional: Story = {
  args: {
    allowEmpty: true,
    required: false,
  },
};

export const readonly: Story = {
  args: {
    ...buildFormState('cronExpression', '0 9 * * *'),
    value: '0 9 * * *',
    operation: OperationKeys.READ,
  },
};

export const limitedOptions: Story = {
  args: {
    hideDaily: true,
    hideInterval: true,
  },
};
