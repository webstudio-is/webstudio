import { getResponseHeaders } from "@webstudio-is/sdk/schema";
import { runInNewContext } from "node:vm";
import { transformSync } from "esbuild";
import { expect, test } from "vitest";
import { generateResponseHeadersModule } from "./response-headers";

const readGeneratedHeaders = (source: string) => {
  const { code } = transformSync(source, { loader: "ts", format: "cjs" });
  const module = {
    exports: {} as { customHeaders?: unknown },
  };
  runInNewContext(code, { module });
  return module.exports.customHeaders;
};

const siteWideHeaders = (headers = getResponseHeaders()) =>
  headers.map((header) => ({ route: "/*", ...header }));

test("generates all default headers for existing projects", () => {
  expect(readGeneratedHeaders(generateResponseHeadersModule())).toEqual(
    siteWideHeaders()
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
  ).toEqual(siteWideHeaders(getResponseHeaders(headers)));
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

test("generates site-wide defaults followed by route rules", () => {
  const rule = {
    route: "/docs/*",
    name: "Referrer-Policy",
    value: "no-referrer",
  };
  const generated = readGeneratedHeaders(
    generateResponseHeadersModule({
      meta: { customHeaders: [rule] },
      compiler: {},
    })
  ) as unknown[];
  expect(generated).toEqual([...siteWideHeaders(), rule]);
});

test("generates custom headers for all paths and matching routes", () => {
  const global = { name: "Cache-Control", value: "public, max-age=60" };
  const scoped = {
    route: "/api/*",
    name: "Access-Control-Allow-Origin",
    value: "*",
  };
  const generated = readGeneratedHeaders(
    generateResponseHeadersModule({
      meta: { customHeaders: [global, scoped] },
      compiler: {},
    })
  );
  expect(generated).toEqual([...siteWideHeaders(), global, scoped]);
});
