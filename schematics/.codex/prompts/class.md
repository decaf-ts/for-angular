document the entire class and each of its functions including always including the @description tag with a short description of the target, and a@summary tag with a more detailed one.
Include @class tags when applicable.
include @param tags in the class documentation and its type definitions
Include detailed @description for all properties.
Include @template tags when necessary.
Do NOT document the constructor, but include the constructor arguments as @param in the class documentation
For methods and functions:
- include @description and @summary tags as defined for the target. also document every argument, including its type definition, and return type, referencing @template tags when necessary.
- create a usage example under the @example tag on the class documentation
- create mermaid sequence diagrams under the @mermaid tag;

The order of tags (when applicable) should be as follows:
1 - @description;
2 - @summary;
3 - @template;
4 - @param;
5 - @return;
6 - @class
7 - @example
8 - @mermaid;

ignore @mermaid for methods with less that 15 lines and constructors.
Respond only with the full JSDoc comment block for the class and its methods.
NEVER user @memberOf in the class or any of it's methods
if the element is already documented, only restructure, correct, or add to the documentation. NEVER remove existing information
never omit or change any code, including the constructor