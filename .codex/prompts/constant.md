document the target code, always including the @description tag with a short description of the target, and a@summary tag with a more detailed one.
Include @const and @typeDef tags when appropriate.
Include detailed @description for all properties.
- For enums, include @enum and @readonly, and add inline documentation for each member
- For object-like constants:
    - Create a @typedef with @property for each key
    - Reference it in the constant using @type
    - Alternatively, document each key inline if small

The order of tags  (when applicable) should be as follows:
1 - @description;
2 - @summary;
3 - @template;
4 - @property;
6 - @const followed by the const or enum name;
8 - @memberOf referencing the appropriate module using the appropriate syntax

Respond with the JSDoc comment block(s) for both the typedef and the constant or enum.
refer to the module it belongs with @memberOf this the `@memberOf module:<module_name>` syntax
never omit or change any code
if the element is already documented, only restructure, correct, or add to the documentation. NEVER remove existing information
