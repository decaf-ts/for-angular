import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import type { Meta, StoryObj } from '@storybook/angular';
import { IconComponent } from 'src/lib/components/icon/icon.component';
import { NgxSvgDirective } from 'src/lib/directives/svg.directive';
import './setup';
import { getComponentMeta } from './utils';

/**
 * @description Fetches the bundled tabler sprite and lists every `ti-*` icon it ships,
 * so a full-set visual regression check doesn't need one story per icon name.
 */
@Component({
  selector: 'story-all-tabler-icons',
  standalone: true,
  imports: [IconComponent],
  template: `
    <p>{{ names.length }} icons</p>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:1rem;">
      @for (name of names; track name) {
        <div style="display:flex;flex-direction:column;align-items:center;gap:0.25rem;">
          <ngx-decaf-icon [name]="name" size="large" />
          <small style="font-size:0.65rem;text-align:center;word-break:break-all;">{{ name }}</small>
        </div>
      }
    </div>
  `,
})
class AllTablerIconsComponent implements OnInit {
  names: string[] = [];

  private cdr = inject(ChangeDetectorRef);

  async ngOnInit(): Promise<void> {
    const svg = await (await fetch('/assets/tabler-sprite.svg')).text();
    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
    this.names = Array.from(doc.querySelectorAll('symbol[id^="tabler-"]'))
      .map((el) => `ti-${el.id.slice('tabler-'.length)}`)
      .sort();
    this.cdr.detectChanges();
  }
}

const component = getComponentMeta<IconComponent>([NgxSvgDirective, IonIcon, IonButton]);
const meta: Meta<IconComponent> = {
  title: 'Components/Icon',
  component: IconComponent,

  ...component,
  argTypes: {
    color: {
      control: 'select',
      options: ['primary', 'secondary', 'tertiary', 'success', 'warning', 'danger', 'light', 'medium', 'dark'],
    },
    size: {
      control: 'select',
      options: ['small', 'default', 'large'],
    },
  },
  args: {
    name: 'ti-heart',
    color: 'dark',
    size: 'default',
    slot: 'icon-only',
    button: false,
    inline: false,
  },
};
export default meta;
type Story = StoryObj<IconComponent>;

export const init: Story = {};

export const asButton: Story = {
  args: {
    button: true,
    name: 'ti-trash',
    color: 'danger',
  },
};

export const large: Story = {
  args: {
    size: 'large',
    name: 'ti-star',
  },
};

export const small: Story = {
  args: {
    size: 'small',
    name: 'ti-star',
  },
};

export const allTablerIcons: Story = {
  render: () => ({
    moduleMetadata: { imports: [AllTablerIconsComponent] },
    template: '<story-all-tabler-icons />',
  }),
};
