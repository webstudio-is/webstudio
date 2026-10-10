import { expect, test } from "vitest";
import { meta } from "./input.ws";

test("Input keeps file upload attributes in its initial property list", () => {
  expect(meta.initialProps).toEqual(
    expect.arrayContaining(["type", "name", "required", "accept", "multiple"])
  );
});
