### Releases

This repository automates releases in the following manner:

- run `npm run release -- <major|minor|patch|version> <message>`:
  - if arguments are missing you will be prompted for them;
- it will run `npm run prepare-release` npm script;
- it will commit all changes;
- it will push the new tag;

If publishing to a private repo's npm registry, make sure you add to your `package.json`:

```json
{
  "publishConfig": {
    "<SCOPE>:registry": " https://<REGISTRY>/api/v4/projects/<PROJECT_ID>/packages/npm/"
  }
}
```

Where:

- `<SCOPE>` - Is the scope of your package;
- `<REGISTRY>` - your registry host;
- `<PROJECT_ID>` - you project ID number (easy to grab via UI in gitlab or by
  running `$("meta[name=octolytics-dimension-repository_id]").getAttribute('content')` in the repository page in github)
  ;

### Publishing

Unless the `-no-ci` flag is passed in the commit message to the `npm run release` command, publishing will be handled
automatically by github/gitlab (triggered by the tag).

When the `-no-ci` flag is passed then you can:

- run `npm run publish`. This command assumes :
  - you have previously run the `npm run release`;
  - you have you publishing properly configured in `npmrc` and `package.json`;
  - The token for any special access required is stored in the `.token` file;
 