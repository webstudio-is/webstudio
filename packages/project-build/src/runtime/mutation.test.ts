import { expect, test } from "vitest";
import type { BuilderPatchChange } from "../contracts/patch";
import { createDefaultPages } from "../shared/pages-utils";
import {
  createRuntimeMutation,
  createRuntimeMutationAccumulator,
  mergeBuilderPatchChanges,
} from "./mutation";

test("merges repeated namespaces in order without modifying input patch arrays", () => {
  const first: BuilderPatchChange[] = [
    {
      namespace: "props",
      patches: [{ op: "add", path: ["prop"], value: "old" }],
    },
  ];
  const second: BuilderPatchChange[] = [
    { namespace: "instances", patches: [{ op: "remove", path: ["instance"] }] },
    {
      namespace: "props",
      patches: [{ op: "replace", path: ["prop"], value: "new" }],
    },
  ];
  const original = structuredClone([first, second]);
  const merged = mergeBuilderPatchChanges(first, second);
  expect(merged).toEqual([
    {
      namespace: "props",
      patches: [...first[0].patches, ...second[1].patches],
    },
    second[0],
  ]);
  expect([first, second]).toEqual(original);
  expect(mergeBuilderPatchChanges(first, second)).toEqual(merged);
  expect(merged[0].patches).not.toBe(first[0].patches);
  expect(mergeBuilderPatchChanges()).toEqual([]);
});

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
