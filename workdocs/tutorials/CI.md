## Continuous Integration/Deployment

While the implementationfor gitlab and github are not perfectly matched, they are perfectly usable.

The template comes with ci/cd for :
  - gitlab (with caching for performance):
    - stages: 
      - dependencies: Installs dependencies (on `package-lock.json` changes, caches node modules);
      - build: builds the code (on `src/*` changes, caches `lib` and `dist`);
      - test: tests the code (on `src/*`, `test/*` changes, caches `workdocs/{resources, badges, coverage}`);
      - deploy: 
        - deploys to package registry on a tag (public|private);
        - deploys docker image to docker registry (private);
        - Deploys the documentation to the repository pages;
  - github:
    - jest-test: standard `install -> build -> test` loop;
    - jest-coverage: extracts coverage from the tests;
    - codeql-analysis: Code quality analisys;
    - pages: builds the documentation and deploys to github pages
    - release-on-tag: issues a release when the tag does not contain `-no-ci` string
    - publish-on-release: publishes to package registry when the tag does not contain the `-no-ci` string
    - Requires Variables:
      - CONSECUTIVE_ACTION_TRIGGER: secret to enable actions to trigger other actions;
      - NPM_TOKEN: npm/docker registry token