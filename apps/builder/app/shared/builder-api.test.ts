import { expect, test } from "vitest";
import type { Asset } from "@webstudio-is/sdk";
import { __testing__ } from "./builder-api";

const file = (format: string) =>
  ({ type: "file", format }) satisfies Pick<Asset, "type" | "format">;

test("allows graph documents to be read but only MDX roots to be written", () => {
  for (const format of ["md", "mdx", "json"]) {
    expect(
      __testing__.canAccessAssetContent({
        asset: file(format),
        operation: "read",
        canWrite: false,
      })
    ).toBe(true);
  }
  expect(
    __testing__.canAccessAssetContent({
      asset: file("png"),
      operation: "read",
      canWrite: true,
    })
  ).toBe(false);
  expect(
    __testing__.canAccessAssetContent({
      asset: file("mdx"),
      operation: "write",
      canWrite: true,
    })
  ).toBe(true);
  for (const format of ["md", "json"]) {
    expect(
      __testing__.canAccessAssetContent({
        asset: file(format),
        operation: "write",
        canWrite: true,
      })
    ).toBe(false);
  }
  expect(
    __testing__.canAccessAssetContent({
      asset: file("mdx"),
      operation: "write",
      canWrite: false,
    })
  ).toBe(false);
});
