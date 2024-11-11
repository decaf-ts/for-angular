### Repository Structure

```
ts-workspace
│
│   .gitignore              <-- Defines files ignored to git
│   .npmignore              <-- Defines files ignored by npm
│   .nmprc                  <-- Defines the Npm registry for this package
│   .eslintrc.cjs           <-- linting for the project
│   .prettier.config.cjs    <-- Code style for the project
│   .gitlab-ci.yml          <-- Gillab CI/CD file
│   gulpfile.js             <-- Gulp build scripts. used for building na other features (eg docs)
│   jest.config.ts          <-- Tests Configuration file
│   mdCompile.json          <-- md Documentation generation configuration file
│   jsdocs.json             <-- jsdoc Documentation generation configuration file
│   Dockerfile              <-- minimal example of a node service Dockerfile
│   LICENCE.md              <-- Licence disclamer
│   package.json
│   package-lock.json
│   README.md               <-- Readme File dynamically compiled from 'workdocs' via the 'docs' npm script
│   tsconfig.json           <-- Typescript config file. Is overriden in 'gulpfile.js' 
│
└───bin
│   │   tag_release.sh      <-- Script to help with releases
│   
└───docs
│   │   ...                 <-- Dinamically generated folder, containing the compiled documentation for this repository. generated via the 'docs' npm script
│   
└───src
│   │   ...                 <-- Source code for this repository
│   
└───tests
│   │───unit                <-- Unit tests
│   └───integration         <-- Integration tests
│   
└───workdocs                <-- Folder with all pre-compiled documentation
│   │───assets              <-- Documentation asset folder
│   │───badges              <-- Auto generated coverage badges folder
│   │───coverage            <-- Auto generated coverage results
│   │───drawings            <-- DrawIO folder. Drawings (*.drawio) here will be processed to generate documentation (requires docker)
│   │───uml                 <-- PlantUML folder. Diagrams (*.puml) here will be processed to generate documentation (requires docker)
│   │───tutorials           <-- Tutorial folder
│   │   ...                 <-- Categorized *.md files that are merged to generate the final readme (via md compile)
│   │   Readme.md           <-- Entry point to the README.md   
│  
└───dist
│   │   ...                 <-- Dinamically generated folder containing the bundles for distribution
│
└───lib
    |   ...                 <-- Dinamically generated folder containing the compiled code
```
