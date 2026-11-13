import { expect, test } from "vitest";
import type { Asset } from "@webstudio-is/sdk";
import { __testing__ } from "./builder-api";

const file = (format: string) =>
  ({ type: "file", format }) satisfies Pick<Asset, "type" | "format">;
const { canAccessAssetContent } = __testing__;

test("allows Markdown frontmatter writes without allowing JSON or viewer writes", () => {
  for (const format of ["md", "mdx", "json"]) {
    expect(
      canAccessAssetContent({
        asset: file(format),
        operation: "read",
        canWrite: false,
      })
    ).toBe(true);
  }
  expect(
    canAccessAssetContent({
      asset: file("png"),
      operation: "read",
      canWrite: true,
    })
  ).toBe(false);
  for (const format of ["md", "MD", "mdx", "MDX"]) {
    expect(
      canAccessAssetContent({
        asset: file(format),
        operation: "write",
        canWrite: true,
      })
    ).toBe(true);
    expect(
      canAccessAssetContent({
        asset: file(format),
        operation: "write",
        canWrite: false,
      })
    ).toBe(false);
  }
  for (const format of ["json", "png", "txt"]) {
    expect(
      canAccessAssetContent({
        asset: file(format),
        operation: "write",
        canWrite: true,
      })
    ).toBe(false);
  }
});
