# Graph Value Parameters

Node editor values that use expression or text-template modes are persisted as
`GraphValueTemplate` objects in the node's `parameters` map. The Angular editor
uses `isGraphValueTemplateValue` to recognize these values when restoring an edit
surface; it accepts only `expression` or `template` modes with a string
`expression` body.

The guard narrows the value for TypeScript callers. It does not evaluate the
expression or template; evaluation belongs to the backend graph runtime.
