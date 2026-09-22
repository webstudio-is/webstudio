import { runInNewContext } from "node:vm";
import { transformSync } from "esbuild";
import { expect, test } from "vitest";
import { generateResponseHeadersModule } from "./response-headers";

const readGeneratedModule = (source: string) => {
  const { code } = transformSync(source, { loader: "ts", format: "cjs" });
  const module = {
    exports: {} as {
      customHeaders?: unknown;
      responseHeadersCacheName?: string;
    },
  };
  runInNewContext(code, { module });
  return module.exports;
};

const readGeneratedHeaders = (source: string) =>
  readGeneratedModule(source).customHeaders;

test("isolates cached responses when headers change, are removed, or the site is republished", () => {
  const settings = {
    meta: { customHeaders: [{ name: "X-Test", value: "old" }] },
    compiler: {},
  };
  const configured = readGeneratedModule(
    generateResponseHeadersModule(settings, "build-1")
  ).responseHeadersCacheName;
  const deleted = readGeneratedModule(
    generateResponseHeadersModule(undefined, "build-1")
  ).responseHeadersCacheName;
  const republished = readGeneratedModule(
    generateResponseHeadersModule(settings, "build-2")
  ).responseHeadersCacheName;
  const changed = readGeneratedModule(
    generateResponseHeadersModule(
      {
        ...settings,
        meta: { customHeaders: [{ name: "X-Test", value: "new" }] },
      },
      "build-1"
    )
  ).responseHeadersCacheName;
  expect(new Set([configured, deleted, republished, changed]).size).toBe(4);
  expect(configured).toMatch(/^file-cache-headers-[a-f0-9]{64}$/);
  expect(
    readGeneratedModule(generateResponseHeadersModule(settings, "build-1"))
      .responseHeadersCacheName
  ).toBe(configured);
});

test("generates an empty configuration for existing projects", () => {
  expect(readGeneratedHeaders(generateResponseHeadersModule())).toEqual([]);
});

test("compiles values as data, preserving removal and empty strings", () => {
  const headers = [
    {
      name: "Content-Security-Policy",
      value: "frame-ancestors 'self' https://example.com",
    },
    { name: "X-Frame-Options", value: null },
    { name: "X-Empty", value: "" },
    { name: "X-Quoted", value: '"; throw new Error("injection"); //' },
  ];
  expect(
    readGeneratedHeaders(
      generateResponseHeadersModule({
        meta: { customHeaders: headers },
        compiler: {},
      })
    )
  ).toEqual(headers);
});

test("invalid configuration fails the build", () => {
  expect(() =>
    generateResponseHeadersModule({
      meta: { customHeaders: [{ name: "X-Test", value: "bad\r\nvalue" }] },
      compiler: {},
    })
  ).toThrow();
});
