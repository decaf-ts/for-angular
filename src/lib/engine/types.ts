export interface FieldDefinition {
  tag: string;
  props: Record<string, unknown>;
  children: FieldDefinition[];
}
