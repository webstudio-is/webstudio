import { expect, test } from "vitest";
import { createDefaultPages } from "../shared/pages-utils";
import {
  createRuntimeMutation,
  createRuntimeMutationAccumulator,
} from "./mutation";

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

test("stages mutations against the latest state and combines their contract", () => {
  const accumulator = createRuntimeMutationAccumulator({
    pages: createDefaultPages({ rootInstanceId: "body" }),
  });

  expect(
    accumulator.stage(
      createRuntimeMutation({
        payload: [
          {
            namespace: "pages",
            patches: [{ op: "replace", path: ["homePageId"], value: "next" }],
          },
        ],
        result: { first: true },
        invalidatesNamespaces: ["pages"],
      })
    )
  ).toEqual({ first: true });
  expect(accumulator.state.pages?.homePageId).toBe("next");

  accumulator.stage(
    createRuntimeMutation({
      payload: [
        {
          namespace: "pages",
          patches: [{ op: "replace", path: ["homePageId"], value: "last" }],
        },
      ],
      result: {},
      invalidatesNamespaces: ["pages"],
    })
  );

  expect(accumulator.complete({ done: true })).toMatchObject({
    result: { done: true },
    invalidatesNamespaces: ["pages"],
    payload: [
      {
        namespace: "pages",
        patches: [
          { op: "replace", path: ["homePageId"], value: "next" },
          { op: "replace", path: ["homePageId"], value: "last" },
        ],
      },
    ],
  });
});
