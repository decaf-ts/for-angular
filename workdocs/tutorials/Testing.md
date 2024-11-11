## Testing

Preconfigured Jest based testing:

- unit tests under the `tests/unit` folder;
  - include a default bundle test (helps with circular dependencies and such);
- integration tests under the `tests/integration` folder;
- stores converage results under `workdocs/coverage`;
- publishes coverage result to docs;
- ignores `cli.ts` from coverage since that is an executable file;
- defines the coverage threshold in `jest.config.ts`;