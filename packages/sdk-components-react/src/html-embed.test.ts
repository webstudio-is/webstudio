import { test, expect, describe } from "@jest/globals";
import { getRenderMode } from "./html-embed";

describe("published site", () => {
  test("server runtime", () => {
    const mode = getRenderMode({
      runtime: "server",
      clientOnly: false,
    });
    expect(mode).toBe("static");
  });

  test("server runtime, clientOnly", () => {
    const mode = getRenderMode({
      runtime: "server",
      clientOnly: true,
    });
    expect(mode).toBe(undefined);
  });

  test("client runtime, first mount", () => {
    const mode = getRenderMode({
      runtime: "client",
      clientOnly: false,
      isFirstMount: true,
    });
    expect(mode).toBe("static");
  });

  test("client runtime, second mount", () => {
    const mode = getRenderMode({
      runtime: "client",
      clientOnly: false,
      isFirstMount: false,
    });
    expect(mode).toBe("client");
  });
});

describe("builder", () => {
  test("preview", () => {
    const mode = getRenderMode({
      runtime: "client",
      renderer: "preview",
    });
    expect(mode).toBe("client");
  });

  test("canvas with scripts", () => {
    const mode = getRenderMode({
      runtime: "client",
      renderer: "canvas",
      executeScriptOnCanvas: true,
    });
    expect(mode).toBe("client");
  });

  test("canvas without scripts", () => {
    const mode = getRenderMode({
      runtime: "client",
      renderer: "canvas",
    });
    expect(mode).toBe("static");
  });
});
