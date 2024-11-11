## Contributing

[fork]: https://github.com/actions/dependency-review-action/fork
[pr]: https://github.com/actions/dependency-review-action/compare
[code-of-conduct]: CODE_OF_CONDUCT.md

Hi there! I'm thrilled that you'd like to contribute to this project. Your help is essential for keeping it great.

Contributions to this project are
[released](https://help.github.com/articles/github-terms-of-service/#6-contributions-under-repository-license)
to the public under the [project's open source license](LICENSE.md).

Please note that this project is released with a [Contributor Code of
Conduct][code-of-conduct]. By participating in this project you agree
to abide by its terms.

### Bootstrapping the project

```
git clone https://github.com/decaf-ts/ts-workspace.git
cd ts-workspace
npm install
npm run build:prod
```

### Running the tests

```
npm run test:all
```

_Note_: We don't have any useful tests yet, contributions are welcome!

## Submitting a pull request

0. [Fork][fork] and clone the repository
1. Configure and install the dependencies: `npm install`
2. Make sure the tests pass on your machine: `npm run test:all`
3. Create a new branch: `git checkout -b my-branch-name`. Relate the branch to an issue if possible
4. Make your change, add tests, add documentation, and make sure the tests still pass
5. Make sure to build and package before pushing: `npm run prepare-release`
6. Push to your fork and [submit a pull request][pr]
7. Pat your self on the back and wait for your pull request to be reviewed and merged.

Here are a few things you can do that will increase the likelihood of your pull request being accepted:

- Add lots of tests for new features.
- Keep your change as focused as possible. If there are multiple changes you would like to make that are not dependent upon each other, consider submitting them as separate pull requests.
- Write a [good commit message](https://tbaggery.com/2008/04/19/a-note-about-git-commit-messages.html).

## Cutting a new release

The acceptance of a pull request will trigger an automatic release by the CI.

## Resources

- [How to Contribute to Open Source](https://opensource.guide/how-to-contribute/)
- [Using Pull Requests](https://help.github.com/articles/about-pull-requests/)
- [GitHub Help](https://help.github.com)