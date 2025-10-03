document the target code, always including the @description tag with a short description of the target, and a@summary tag with a more detailed one.
  Include @interface and @typeDef an @template tags when appropriate.
  Include detailed @description for all properties.
  For methods, include @description and @summary tags as defined for the target. also document every argument, including its type definition, and return type, referencing @template tags when necessary.

  The order of tags  (when applicable) should be as follows:
1 - @description;
2 - @summary;
3 - @template;
4 - @param;
5 - @return;
6 - @interface or @typeDef followed by the interface or type name;
8 - @memberOf referencing the appropriate module using the appropriate syntax

Output only the completed JSDoc comment block for the type or interface.
refer to the module it belongs with @memberOf this the `@memberOf module:<module_name>` syntax
never omit or change any code
if the element is already documented, only restructure, correct, or add to the documentation. NEVER remove existing information
