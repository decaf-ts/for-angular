import { Command } from 'commander';
import { runCommand } from '@decaf-ts/utils';
import { MiniLogger, LogLevel } from "@decaf-ts/logging";

const defaultLoggerConfig = {
  level: LogLevel.info,
  logLevel: true,
  timestamp: false
};

enum Projects {
  FOR_ANGULAR = "for-angular",
  FOR_ANGULAR_APP = "for-angular-app",
  LIB = "lib",
  APP = "app"
}
enum Types {
  PAGE = "page",
  SERVICE = "service",
  COMPONENT = "component",
  DIRECTIVE = "directive",
  SCHEMATICS = "schematics"
}

const cliDescription = 'Angular CLI module';
const Logger = new MiniLogger(cliDescription, defaultLoggerConfig);


/**
 * Creates and returns a Command object for the Angular CLI module in decaf-ts.
 * This function sets up a 'generate' command that can create various Angular artifacts.
 *
 * @returns {Command} A Command object configured with the 'generate' subcommand and its action.
 *
 * The command syntax is: generate <type> <name> [project]
 * @param {Types} type - The type of artifact to generate (e.g., service, component, directive, page).
 * @param {string} name - The name of the artifact to be generated.
 * @param {Projects} [project=Projects.FOR_ANGULAR] - The project for which to generate the artifact.
 *                   Defaults to the main Angular project if not specified.
 *
 * @throws {Error} If an invalid type is provided.
 *
 * @example
 * // Usage in CLI
 * // decaf-ts generate service my-service
 * // decaf-ts generate component my-component for-angular-app
 */
export default function angular() {
  return new Command()
    .name('decaf generate')
    .command('generate <type> <name> [project]')
    .description(`decaf-ts ${cliDescription}`)
    .action(async(type: Types, name: string, project: Projects = Projects.FOR_ANGULAR) => {
      if(!validateType(type))
        return Logger[LogLevel.error](`${type} is not valid. Use service, component or directive.`)

      if(type === Types.SCHEMATICS)
        return await generateSchematics();

      if(type === Types.PAGE) {
        Logger[LogLevel.info](`Pages can be only generate for app. Forcing project to: ${Projects.FOR_ANGULAR_APP}`);
        project = Projects.FOR_ANGULAR_APP;
      }

      (project as string) = parseProjectName(project);

      if(!validateProject(project))
        project = Projects.FOR_ANGULAR;
      const command = project === Projects.FOR_ANGULAR_APP ?
        'ionic generate' : `ng generate --project=${Projects.FOR_ANGULAR} --path=src/lib/${type}s`;

      try {
        const result = await execute(`${command} ${type} ${name}`);
        console.info(result);
      } catch(error: any) {
        Logger[LogLevel.error](error?.message || error);
      }

    });
}


async function generateSchematics() {
  return Promise.all([
    execute(`npm link schematics`),
    execute(`cd schematics`),
    execute(`npm install`),
    execute(`npm run build`),
    execute(`schematics .:schematics --name=decaf`)
  ])
  .then(res => res)
  .catch(error => error)
}


/**
 * Executes a shell command asynchronously.
 *
 * @param command - The shell command to execute.
 * @returns A Promise that resolves with the command's stdout output as a string if successful,
 *          or rejects with an error message if the command fails or produces stderr output.
 */
async function execute(command: string): Promise<string|void> {
  try {
    return await runCommand(command).promise;
  } catch (error: any) {
    Logger[LogLevel.error](error?.message || error);
  }
}

/**
 * Parses and normalizes the project name input.
 *
 * @param value - The input project name to be parsed.
 *                Can be 'app', 'lib', or any other string value.
 * @returns A normalized string representation of the project name.
 *          Returns 'for-angular-app' if input is 'app',
 *          'for-angular' if input is 'lib',
 *          or the lowercase version of the input for any other value.
 */
function parseProjectName(value: string): string {
  return (value === Projects.APP ?
    Projects.FOR_ANGULAR_APP : value === Projects.LIB ?
      Projects.FOR_ANGULAR : value).toLowerCase();
}

/**
 * Validates if the given type value is a valid enum member of Types.
 *
 * @param value - The type value to validate.
 * @returns A boolean indicating whether the value is a valid Types enum member.
 */
function validateType(value: Types): boolean {
  return Object.values(Types).includes(value);
}


/**
 * Validates if the given project value is a valid enum member of Projects.
 *
 * @param value - The project value to validate.
 * @returns A boolean indicating whether the value is a valid Projects enum member.
 */
function validateProject(value: string): boolean {
  return Object.values(Projects).includes(value as Projects);
}
