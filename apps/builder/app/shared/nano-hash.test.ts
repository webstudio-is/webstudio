import { expect, test } from "@jest/globals";
import { nanoHash } from "./nano-hash";

test("NanoHash Equal", async () => {
  expect(await nanoHash("hello")).toEqual(await nanoHash("hello"));
});

test("NanoHash Not Equal", async () => {
  expect(await nanoHash("hello")).not.toEqual(await nanoHash("world"));
});
