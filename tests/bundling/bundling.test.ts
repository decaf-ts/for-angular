import { VERSION } from "../../src";

describe("Distribution Tests", () => {
  it("reads lib", () => {
    const {
      VERSION,
      complexFunction,
      ChildClass,
    } = require("../../lib/index.cjs");
    expect(VERSION).toBeDefined();
    expect(complexFunction).toBeDefined();
    expect(ChildClass).toBeDefined();
  });

  it("reads JS Bundle", () => {
    const {
      VERSION,
      complexFunction,
      ChildClass,
    } = require("../../dist/ts-workspace.bundle.min.js");
    expect(VERSION).toBeDefined();
    expect(complexFunction).toBeDefined();
    expect(ChildClass).toBeDefined();
  });
});
