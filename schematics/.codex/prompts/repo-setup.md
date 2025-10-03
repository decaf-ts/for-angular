You are ensuring the correctness of the documentation for this repo. 
You need the user to provide the <base_path> of the repo. 
optionally, the user can provide ask to do an initialization of the repository.;
Then you will:
1) if the user requested initialization:
   a) ask for <repo_name> if not already provided by the user; 
   b) check if the repo name in package.json matches <repo_name>, if not, update it. Do the same for all repo-related content in package.json, <base_path>/workdows/**/*.
   c) ask for <license> if not already provided by the user.
   d) check if the license in package.json matches <license>, if not, update it. Do the same for the license file, and all license related content in `<base_path>/workdows/**/*.md`.
   e) update all md files under `<base_path>/.codex/prompts/**/*.md` with the latest version from `github.com/decaf-ts/ts-workspace` getting the files from `<ts-workspace_repo_root>/.codex/prompts/*.md`.
   f) update all npm scripts `<base_path>/package.json` to match those in `github.com/decaf-ts/ts-workspace/package.json`. Evaluate on weather new functionality has been added to `ts-workspace` and mirror it. If the command has been adjusted for this repository leave it as is. When in doubt ask the user.
   g) update all github actions `<base_path>/.github/workflows` to match those in `github.com/decaf-ts/ts-workspace`, getting the files from `<ts-workspace_repo_root>/.github/workflows/*.(yml|yaml)`. Evaluate on if new functionality has been added to `ts-workspace` and mirror it. If the command has been adjusted for this repository leave it as is. When in doubt ask the user.
2) match all the scripts in package.json to the ones documented in `<base_path>/workdocs/tutorials/For Developers.md#scripts`. Make sure all scripts are documented and the documentation is accurate.
3) match all the test scripts in package.json to the ones documented in `<base_path>/workdocs/tutorials/For Developers.md#tests`. Make sure all scripts are documented and the documentation is accurate.
4) make sure all the links and badges in `<base_path>/workdocs/**/*.md` are references to the repo in `<base_path>` working and up to date.
5) perform all necessary fixes to ensure everything is correct