### ***Initial Setup***

#### if you use github

create a new project using this one as a template.

clone it `git clone <project>` and navigate to the root folder `cd <project>`

#### If your project has private dependencies or publishes to private npm registries, create an `.npmrc` containing:

```text
@<scope1>:registry=https://<ADDRESS>.com/api/v4/packages/npm/
@<scope2>:registry=https://<ADDRESS>.<DOMAIN>.com/api/v4/packages/npm/
//<ADDRESS>.<DOMAIN>.com/:_authToken=${TOKEN}
//<ADDRESS>.<DOMAIN>.com/api/v4/groups/<GROUP_ID>/packages/npm/:_authToken=${TOKEN}
//<ADDRESS>.<DOMAIN>.com/api/v4/projects/<PROJECT_ID>/packages/npm/:_authToken=${TOKEN}
```

Changing:
 - <ADDRESS> to `gitlab` or `github` (or other);
 - <DOMAIN> to your domain if any (if you are using plain gitlab or github use empty and take care to remove the extra `.`);
 - <GROUP_ID> to your project's group id (if any). otherwise remove this line
 - <PROJECT_ID> to your project's id

and adding a `.token` file containing your access token to the private registries na repositories.

### Installation

Run `npm install` (or `npm run do-install` if you have private dependencies and a `.token` file) to install the dependencies:

If this is the first time you are running this command it will also:
 - update this repository's dependencies to their latest version;
 - creates a `.token` file which you can leave empty unless you have private dependencies or publish to private registries
 - delete this 'first run script' file and npm call from the `package.json`;
 - try to commit the updated `package.json` and deleted files (having ssh access helps here);