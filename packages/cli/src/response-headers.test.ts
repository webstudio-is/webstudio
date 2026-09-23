import { getResponseHeaders } from "@webstudio-is/sdk/schema";
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
    meta: {
      customHeaders: [{ name: "Content-Security-Policy", value: "old" }],
    },
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
        meta: {
          customHeaders: [{ name: "Content-Security-Policy", value: "new" }],
        },
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

test("generates all default headers for existing projects", () => {
  expect(readGeneratedHeaders(generateResponseHeadersModule())).toEqual(
    getResponseHeaders()
  );
});

test("compiles values as data, preserving optional removal", () => {
  const headers = [
    {
      name: "Content-Security-Policy",
      value: "frame-ancestors 'self' https://example.com",
    },
    { name: "X-Frame-Options", value: null },
    { name: "Referrer-Policy", value: '"; throw new Error("injection"); //' },
  ];
  expect(
    readGeneratedHeaders(
      generateResponseHeadersModule({
        meta: { customHeaders: headers },
        compiler: {},
      })
    )
  ).toEqual(getResponseHeaders(headers));
});

test("invalid configuration fails the build", () => {
  expect(() =>
    generateResponseHeadersModule({
      meta: {
        customHeaders: [
          { name: "Content-Security-Policy", value: "bad\r\nvalue" },
        ],
      },
      compiler: {},
    })
  ).toThrow();
});
