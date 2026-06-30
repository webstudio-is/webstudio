import { expect, test } from "vitest";
import { createRuntimeMutation } from "./mutation";

test("creates mutation result and marks noop from payload", () => {
  expect(
    createRuntimeMutation({
      payload: [],
      result: { pageId: "page" },
      invalidatesNamespaces: ["pages"],
    })
  ).toEqual({
    kind: "mutation",
    payload: [],
    result: { pageId: "page" },
    invalidatesNamespaces: ["pages"],
    noop: true,
  });

  expect(
    createRuntimeMutation({
      payload: [{ namespace: "pages", patches: [] }],
      result: {},
      invalidatesNamespaces: [],
    }).noop
  ).toBe(false);
});
