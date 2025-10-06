the user need to give a <base_path> representing  where to run commands on, and where to consider the root folder.
escaping this root folder for anything must be granted explicit permission by the user.

task 1 - read all files under `<base_path>/src/**/*.ts` and store them in <files>.
task 2 - understand the content of each file, the repository as a whole. Identify main Classes, Functions, and overall functionality
task 3 - in <files>, find the module file `<base_path>/src/index.ts`.
task 4 - read the file `<base_path>/.codex/prompts/doc.md` and `.<base_path>/.codex/prompts/module.md` for instructions on how to document the module file.
task 5 - for each of the remaining files in <files>, read the file `<base_path>/.codex/prompts/doc.md` and `./.codex/prompts/file.md` for instructions on how to document that file. Use the module name created in task 4 for eventual @memberOf reference.
task 6 - build the docs by running in <base_path> the command `npm run docs`. If it fails iterate fixing it until it passes

NOTES:
 - when documenting a function type as a parameter, ALWAYS use the function(type1,type2):return_type syntax