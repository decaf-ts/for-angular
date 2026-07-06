import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { OperationKeys } from '@decaf-ts/db-decorators';
import { HTML5InputTypes } from '@decaf-ts/ui-decorators';
import { IonButton, IonItem, IonLabel, IonList, IonText } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';
import type { Meta, StoryObj } from '@storybook/angular';
import { CardComponent } from 'src/lib/components/card/card.component';
import { FileUploadComponent } from 'src/lib/components/file-upload/file-upload.component';
import { IconComponent } from 'src/lib/components/icon/icon.component';
import { fn } from 'storybook/test';
import './setup';
import { getComponentMeta } from './utils';

function buildFormState(name: string): Pick<FileUploadComponent, 'formGroup' | 'formControl' | 'name'> {
  const formControl = new FormControl(null);
  const formGroup = new FormGroup({ [name]: formControl });

  return { formGroup, formControl, name };
}

const component = getComponentMeta<FileUploadComponent>([
  CommonModule,
  ReactiveFormsModule,
  CardComponent,
  IonText,
  IconComponent,
  IonList,
  IonLabel,
  IonItem,
  TranslatePipe,
  IonButton,
]);
const meta: Meta<FileUploadComponent> = {
  title: 'Components/File Upload',
  component: FileUploadComponent,

  ...component,
  args: {
    operation: OperationKeys.CREATE,
    type: HTML5InputTypes.FILE,
    valueType: 'base64',
    buttonLabel: 'Choose file',
    size: 'large',
    position: 'center',
    accept: 'image/*',
    showIcon: true,
    enableDirectoryMode: false,
    maxFileSize: 1,
    required: false,
    multiple: false,
    subType: 'text',
    ...buildFormState('file'),
    changeEvent: fn(),
  },
};
export default meta;
type Story = StoryObj<FileUploadComponent>;

export const Default: Story = {};

export const Multiple: Story = {
  args: {
    multiple: true,
    buttonLabel: 'Choose files',
    ...buildFormState('files'),
  },
};

export const Documents: Story = {
  args: {
    accept: ['.pdf', '.doc', '.docx'],
    buttonLabel: 'Choose document',
    ...buildFormState('document'),
  },
};

export const DirectoryMode: Story = {
  args: {
    enableDirectoryMode: true,
    buttonLabel: 'Choose folder',
    ...buildFormState('folder'),
  },
};
