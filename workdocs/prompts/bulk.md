## Prompts to generate bulk actions

 - Bulk JSDoc
```
Act as a seasoned typescript developer.
- find all code files using `find ./src -type f -name '*.ts'`
- Document all files globbed according to:
 - classes: document the entire class and each of its functions including always including the @description tag with a short description of the target, and a@summary tag with a more detailed one.
Include @class tags when applicable.
include @param tags in the class documentation and its type definitions
Include detailed @description for all properties.
Include @template tags when necessary.
Do NOT document the constructor, but include the constructor arguments as @param in the class documentation
For methods and functions:
- include @description and @summary tags as defined for the target. also document every argument, including its type definition, and return type, referencing @template tags when necessary.
- create a usage example under the @example tag on the class documentation
- create mermaid sequence diagrams under the @mermaid tag;

The order of tags  (when applicable) should be as follows:
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

 - interfaces and types: document the target code, always including the @description tag with a short description of the target, and a@summary tag with a more detailed one.
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

 - functions: document the target code, always including the @description tag with a short description of the target, and a@summary tag with a more detailed one.
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
8 - @memberOf referencing the appropriate module using the appropriate syntax

Output only the full JSDoc comment block for the function.
refer to the module it belongs with @memberOf this the `@memberOf module:<module_name>` syntax
never omit or change any code
if the element is already documented, only restructure, correct, or add to the documentation. NEVER remove existing information

 - document the target code, always including the @description tag with a short description of the target, and a@summary tag with a more detailed one.
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

if the file is `src/index.ts`: Generate a JSDoc comment block for a TypeScript module file using better-docs formatting:
- Add @module with the name of the module
- Add @description and @summary
- Do NOT document individual exports
- The summary should explain the role of the module and what it exposes (classes, utils, etc.)
- Include references to key exported objects using @link where appropriate

Respond with only the JSDoc block for the module file.
never omit or change any code
if the element is already documented, only restructure, correct, or add to the documentation. NEVER remove existing information

respond upon completion without additional input
```

 - Bulk Examples
```
- find all code files using `find ./src -type f -name '*.ts'``
- for each file, identify all classes and functions;
- from the identified elements, elaborate a short summary of the intent of the library and write in `workdocs/1-Header.md` under the banner and title
- from the identified elements, elaborate a detailed description of the intent of the library and write in `workdocs/4-Description.md` under the title
- write examples in the `workdocs/5-HowToUse.md` file for all the identified elements
- each exaple MUST contain:
  - Description of the use case;
  - typescript example using the appropriate typescript code notation in md format
stop only when the task is done
```