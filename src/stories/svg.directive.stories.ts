import { provideHttpClient } from '@angular/common/http';
import type { Meta, StoryObj } from '@storybook/angular';
import { NgxSvgDirective } from 'src/lib/directives';
import './setup';
import { getComponentMeta } from './utils';

const component = getComponentMeta<NgxSvgDirective>([NgxSvgDirective], 'component', {}, [provideHttpClient()]);
const meta: Meta<NgxSvgDirective> = {
  title: 'Directives/Svg',
  component: NgxSvgDirective,

  ...component,
  render: (args) => {
    const path = args.path || '/youtube.svg';
    return {
      template: `
        <div style="padding: 48px;">
          <h3>Svg inlined from a bound path</h3>
          <div [ngx-decaf-svg]="path" style="width: 96px; height: 96px;"></div>

          <h3>Svg inlined from the host element src attribute</h3>
          <img ngx-decaf-svg src="/github.svg" style="width: 96px; height: 96px;" />
        </div>
      `,
      props: { ...args, path },
    };
  },
  args: {
    path: '/youtube.svg',
  },
};
export default meta;
type Story = StoryObj<NgxSvgDirective>;

export const FromBinding: Story = {};

export const FromSrcAttribute: Story = {
  args: {
    path: '/accessibility.svg',
  },
};
