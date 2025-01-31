"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.angular = void 0;
var commander_1 = require("commander");
function angular() {
    return new commander_1.Command()
        .command('generate <type> <name>')
        .description("decaf-ts' angular CLI module")
        .action(function (type, name) {
        console.log("executed demo command with type variable: ".concat(type, " and name ").concat(name));
    });
}
exports.angular = angular;
