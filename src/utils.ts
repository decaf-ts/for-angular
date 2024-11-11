/**
 * @summary Function summary
 * @description Function description
 *
 * @mermaid
 *   sequenceDiagram
 *     Alice ->> Bob: Hello Bob, how are you?
 *     Bob-->>John: How about you John?
 *     Bob--x Alice: I am good thanks!
 *     Bob-x John: I am good thanks!
 *     Note right of John: Bob thinks a long<br/>long time, so long<br/>that the text does<br/>not fit on a row.
 *
 *     Bob-->Alice: Checking with John...
 *     Alice->John: Yes... John, how are you?
 *
 * @param {string} [arg1] defaults to 'default'
 *
 * @function helloWorld
 * @memberOf module:ts-workspace
 */
export function complexFunction(arg1: string = "default",) {
  return "Hello World" + arg1;
}
