import { Command } from 'commander';

export default function angular() {
  return new Command()
    .command('generate <type> <name>')
    .description("decaf-ts' angular CLI module")
    .action((type: string, name: string) => {
      console.log(
        `executed demo command with type variable: ${type} and name ${name}`,
      );
    });
}
