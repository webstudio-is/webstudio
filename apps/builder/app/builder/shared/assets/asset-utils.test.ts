import { expect, test } from "vitest";
import { parseAssetName } from "./asset-utils";

test("parse asset name", () => {
  expect(parseAssetName("hello_hash.ext")).toEqual({
    basename: "hello",
    hash: "hash",
    ext: "ext",
  });
  expect(parseAssetName("hello.ext")).toEqual({
    basename: "hello",
    hash: "",
    ext: "ext",
  });
  expect(parseAssetName("hello_hash1.ext_hash2")).toEqual({
    basename: "hello",
    hash: "hash1",
    ext: "ext_hash2",
  });
  expect(parseAssetName("hello_hash1_hash2")).toEqual({
    basename: "hello_hash1",
    hash: "hash2",
    ext: "",
  });
});
