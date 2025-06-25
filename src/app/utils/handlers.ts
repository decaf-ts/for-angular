import { EventHandler } from "@decaf-ts/ui-decorators";
import { CrudFormEvent } from "src/lib/engine/types";

export class LoginHandler extends EventHandler {

  async handle(event: CrudFormEvent): Promise<boolean> {
    const { username, password } = event.data;
    return !!username && !!password;
  }
}
