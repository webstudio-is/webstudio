import { expect, test } from "vitest";
import { createDefaultPages } from "../shared/pages-utils";
import {
  blockComponent,
  blockTemplateComponent,
  type Instance,
} from "@webstudio-is/sdk";
import {
  createRuntimeMutation,
  createRuntimeMutationAccumulator,
  getRuntimeMutationPersistenceOrder,
} from "./mutation";

const externalRoot = {
  type: "external" as const,
  identity: {
    blockInstanceId: "block",
    assetId: "article",
    revision: "sha256:article",
    contentRef: "article.mdx",
    format: "mdx" as const,
    renderScope: "page:/",
  },
};

test("orders the durable destination before a cross-storage source removal", () => {
  const storageRemoval = {
    root: externalRoot,
    payload: [
      {
        namespace: "instances" as const,
        patches: [{ op: "remove" as const, path: ["moved"] }],
      },
    ],
  };
  expect(
    getRuntimeMutationPersistenceOrder({
      payload: [
        {
          namespace: "instances",
          patches: [{ op: "add", path: ["moved"], value: {} }],
        },
      ],
      storageChanges: [storageRemoval],
    })
  ).toBe("project-first");
  expect(
    getRuntimeMutationPersistenceOrder({
      payload: [
        {
          namespace: "instances",
          patches: [{ op: "remove", path: ["moved"] }],
        },
      ],
      storageChanges: [
        {
          root: externalRoot,
          payload: [
            {
              namespace: "instances",
              patches: [{ op: "add", path: ["moved"], value: {} }],
            },
          ],
        },
      ],
    })
  ).toBe("storage-first");
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

test("preserves multiple authored storage changes and their noop semantics", () => {
  const instances = new Map<Instance["id"], Instance>();
  for (const id of ["first", "second"]) {
    instances.set(id, {
      type: "instance",
      id,
      component: blockComponent,
      children: [
        { type: "id", value: `${id}-templates` },
        { type: "text", value: "Before" },
      ],
    });
    instances.set(`${id}-templates`, {
      type: "instance",
      id: `${id}-templates`,
      component: blockTemplateComponent,
      children: [],
    });
  }
  const accumulator = createRuntimeMutationAccumulator({ instances });
  const firstRoot = {
    type: "external" as const,
    identity: {
      blockInstanceId: "first",
      assetId: "first-asset",
      revision: "first-revision",
      contentRef: "first.mdx",
      format: "mdx" as const,
      renderScope: "page:/first",
    },
  };
  const secondRoot = {
    type: "external" as const,
    identity: {
      ...firstRoot.identity,
      blockInstanceId: "second",
      assetId: "second-asset",
      contentRef: "second.mdx",
      renderScope: "page:/second",
    },
  };
  for (const root of [firstRoot, secondRoot]) {
    accumulator.stage(
      createRuntimeMutation({
        payload: [],
        storageChanges: [
          {
            root,
            payload: [
              {
                namespace: "fragment",
                patches: [
                  {
                    op: "replace",
                    path: ["children", 0],
                    value: { type: "text", value: root.identity.assetId },
                  },
                ],
              },
            ],
          },
        ],
        result: {},
        invalidatesNamespaces: ["instances"],
      })
    );
  }

  expect(accumulator.state.instances?.get("first")?.children[1]).toEqual({
    type: "text",
    value: "first-asset",
  });
  expect(accumulator.state.instances?.get("second")?.children[1]).toEqual({
    type: "text",
    value: "second-asset",
  });

  expect(accumulator.complete({})).toMatchObject({
    noop: false,
    storageChanges: [{ root: firstRoot }, { root: secondRoot }],
  });
});
