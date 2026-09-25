import { runInNewContext } from "node:vm";
import { transformSync } from "esbuild";
import { expect, test } from "vitest";
import { generateResponseHeadersModule } from "./response-headers";

const readGeneratedHeaders = (source: string) => {
  const { code } = transformSync(source, { loader: "ts", format: "cjs" });
  const module = { exports: {} as { customHeaders?: unknown } };
  runInNewContext(code, { module });
  return module.exports.customHeaders;
};

test("generates no user rules for existing projects", () => {
  expect(readGeneratedHeaders(generateResponseHeadersModule())).toEqual([]);
});

test("compiles configured values and route rules as data", () => {
  const headers = [
    {
      name: "Content-Security-Policy",
      value: "frame-ancestors https://example.com",
    },
    { route: "/docs/*", name: "Referrer-Policy", value: "no-referrer" },
    { name: "Cache-Control", value: "public, max-age=60" },
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

test("invalid or dispatcher-owned configuration fails the build", () => {
  for (const header of [
    { name: "Content-Security-Policy", value: "bad\r\nvalue" },
    { name: "X-Content-Type-Options", value: "off" },
    { name: "Strict-Transport-Security", value: "max-age=0" },
  ]) {
    expect(() =>
      generateResponseHeadersModule({
        meta: { customHeaders: [header] },
        compiler: {},
      })
    ).toThrow();
  }
});
