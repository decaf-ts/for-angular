import type { Meta, StoryObj } from '@storybook/angular';
import { CurveEditorComponent } from 'src/lib/components/curve-editor/curve-editor.component';
import { fn } from 'storybook/test';
import './setup';
import { getComponentMeta } from './utils';

const component = getComponentMeta<CurveEditorComponent>([]);
const meta: Meta<CurveEditorComponent> = {
  title: 'Components/Curve Editor',
  component: CurveEditorComponent,

  ...component,
  args: {
    points: [
      { x: 0, y: 0 },
      { x: 0.25, y: 0.1 },
      { x: 0.5, y: 0.6 },
      { x: 0.75, y: 0.9 },
      { x: 1, y: 1 },
    ],
    formula: '',
    interpolation: 'monotonic',
    xRange: [0, 1],
    yRange: [0, 1],
    lockEndpoints: true,
    height: 320,
    pointAdded: fn(),
    pointRemoved: fn(),
    pointMoved: fn(),
    curveChanged: fn(),
    formulaChanged: fn(),
  },
};
export default meta;
type Story = StoryObj<CurveEditorComponent>;

export const Monotonic: Story = {};

export const Linear: Story = {
  args: {
    interpolation: 'linear',
  },
};

export const FormulaDriven: Story = {
  args: {
    points: [],
    formula: 'x^2',
  },
};

export const UnlockedEndpoints: Story = {
  args: {
    lockEndpoints: false,
  },
};

export const CustomRanges: Story = {
  args: {
    points: [
      { x: -1, y: -1 },
      { x: 0, y: 0 },
      { x: 2, y: 4 },
    ],
    xRange: [-1, 2],
    yRange: [-1, 4],
  },
};
