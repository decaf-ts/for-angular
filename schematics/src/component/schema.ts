export interface Schema {
  path?: string;
  project?: string;
  name: string;
  prefix?: string;
  styleext?: string;
  spec?: boolean;
  style?: string;
  flat?: boolean;
  selector?: string;
  createModule?: boolean;
  module?: string;
  export?: boolean;
  entryComponent?: boolean;
  type?: string;
  standalone?: boolean;
}
