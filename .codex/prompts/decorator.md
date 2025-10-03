document the target code, always including the @description tag with a short description of the target, and a@summary tag with a more detailed one.
Include @function an @template tags when appropriate.
Include detailed @description for all properties.
For methods, include @description and @summary tags as defined for the target. also document every argument, including its type definition, and return type, referencing @template tags when necessary.
create mermaid sequence diagrams under the @mermaid tag;

The order of tags (when applicable) should be as follows:
1 - @description;
2 - @summary;
3 - @template;
4 - @param including type definitions;
5 - @return;
6 - @function followed by the interface or type name;
7 - @mermaid with the sequence diagram for the function if ithas over 10 lines
8 - @category one of: "Decorators", "Class Decorators", "Method Decorators", "Property Decorators", "Parameter Decorators"
Output only the full JSDoc comment block for the function.
DO NOT refer to the module it belongs with @memberOf
never omit or change any code
if the element is already documented, only restructure, correct, or add to the documentation. NEVER remove existing information
