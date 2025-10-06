the user needs to give a <base_path> representing where to run commands on, and where to consider the root folder.
escaping this root folder for anything must be granted explicit permission by the user.
the user can optionally provide <coverage>, a percentage number between 0 and 100 representing the minimum documentation coverage required. If not provided assume 90%.


task 1 - read all files under `<base_path>/src/**/*.ts` and store them in <files>.
task 2 - understand the content of each file, the repository as a whole. Identify main Classes, Functions, and overall functionality
task 3 - run coverage by running `npm run coverage`.
task 4 - extract the coverage report. If coverage is bellow <coverage>, create new tests (unit or integration) under `<base_path>/tests`;
task 5 - repeat tasks 3 and 4 until coverage is equal or above <coverage> with all tests passing.
task 6 - update the coverage config in `<base-path>/workdocs/reports` to reflect the new coverage percentage (round down to the nearest integer).
NOTES:
 - Avoid mocking at all costs! Use real instances and dependencies.
 - the coverage report (after running the coverage command) can be found in `<base_path>/workdocs/reports/coverage`.
 - If a bug in the code is found, propose a fix to the user. if the user accepts it, apply the fix and continue with the tasks.
 - Always run the test command with env variables USE_WATCHMAN=false WATCHMAN_DISABLE=1 JEST_DISABLE_WATCHMAN=1 and the flag --watchman=false. If that still fails also add the flag --runInBand