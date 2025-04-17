import { Command } from 'commander';
import { runCommand } from "../../utils";

enum Projects {
  FOR_ANGULAR = "for-angular",
  FOR_ANGULAR_APP = "for-angular-app",
}

export default function angular() {
  return new Command()
    .command('generate <type> <name> [project]')
    .description("decaf-ts' angular CLI module")
    .action((type: string, name: string, project: Projects = Projects.FOR_ANGULAR) => {
      runCommand(
       `ionic g ${type} ${name}`,
      );
    });
}
