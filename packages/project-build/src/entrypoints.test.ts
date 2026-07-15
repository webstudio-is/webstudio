import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

type PackageExport = Record<string, string>;

const packageJson = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8")
) as { exports: Record<string, PackageExport> };

describe("package entrypoints", () => {
  test("exposes architectural surfaces instead of source-file paths", () => {
    const entrypoints = Object.keys(packageJson.exports);

    expect(entrypoints.length).toBeLessThanOrEqual(11);
    expect(
      entrypoints.filter((entrypoint) => entrypoint.split("/").length > 2)
    ).toEqual(["./transfer/server"]);
  });

  test("does not expose Node-only surfaces through generic conditions", () => {
    for (const entrypoint of [
      "./mcp",
      "./visual",
      "./transfer/server",
      "./server",
    ]) {
      expect(packageJson.exports[entrypoint]).toEqual({
        webstudio: expect.any(String),
      });
    }
  });
});
