## Documentation

The repository proposes a way to generate documentation that while still not ideal, produces verys consitest results.

In the code you see an example on how to properly document each code object, but the overall structure is:
  - each package is a `@module`;
  - Classes and Interfaces are categorized into `@category` and `@subcategory`;
  - All other objects are categorized by `@namespace` and `@memberOf`;
  - Enums and const are declared as `@const` and both must describe their properties as `@property` (when constants are objects);
  - Interfaces must declare their methods `@method`;

There are 3 steps the generating the documentation (automated in CI):
 - `npm run drawings` - generates png files from each drawing in the `workdocs/drawings` folder and moves them to the `workdocs/resources` folder (requires Docker);
 - `npm run uml` - generates png files from each PlantUML diagram in the `workdocs/uml` folder and moves them to the `workdocs/resources` folder (requires Docker);
 - `npm run docs` - this has several stages, defined under the `gulp docs` (gulpfile.js):
   - compiles the Readme file via md compile:
     - enables keeping separate files for sections that are then joined into a single file;
     - Allows keeping specific files in the jsdocs tutorial folder so they show up on their own menu;
   - compiles the documentation from the source code using jsdocs:
     - uses the better docs template with the category and component plugins
     - uses the mermaid jsdoc plugin to embue uml diagrams in the docs
     - includes a nav link to the test coverage results;
   - copies the jsdoc and mds to `/docs`;
   - copies the `./workdocs/{drawings, uml, assets, resources}` to `./docs`;

The produced `docs` folder contains the resulting documentation;