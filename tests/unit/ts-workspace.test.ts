import {ChildClass, Class, complexFunction, something,} from "../../src";

describe("Type Script Workspace test", function () {
  it("runs functions", function () {
    expect(complexFunction(),).toBe("Hello Worlddefault",);
  },);

  it("Instantiates Classes", async function () {
    const a = new Class(1, "string",);
    expect(a,).toBeDefined();
    expect(a.method,).rejects.toBeInstanceOf(Error,);
    expect(Class.method,).toThrow();
    const b = new ChildClass("string", "string",);
    expect(b,).toBeDefined();
    expect(() => b.method2("string",),).toThrow();
    expect(something.call(a,),).toEqual(a,);
    const res = await b.method();
    expect(res,).toEqual("ok",);
  },);
},);