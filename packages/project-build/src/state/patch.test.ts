import { expect, test } from "vitest";
import { build } from "./fixtures.test-utils";
import type { BuilderState } from "./builder-state";
import type { Props } from "@webstudio-is/sdk";
import {
  applyBuilderNamespacePatches,
  applyBuilderPatchPayloadMutable,
  applyBuilderPatchTransactions,
  MissingBuilderStateNamespaceError,
} from "./patch";

test("root-replaces an optional marketplace product from missing state", () => {
  const state: BuilderState = {};
  const marketplaceProduct = {
    category: "sectionTemplates" as const,
    name: "Example section",
    thumbnailAssetId: "thumbnail",
    author: "Webstudio",
    email: "hello@example.com",
    website: "",
    issues: "",
    description: "Example marketplace product",
  };

  expect(
    applyBuilderPatchTransactions(state, [
      {
        id: "restore-marketplace-product",
        payload: [
          {
            namespace: "marketplaceProduct",
            patches: [{ op: "replace", path: [], value: marketplaceProduct }],
          },
        ],
      },
    ]).state.marketplaceProduct
  ).toEqual(marketplaceProduct);
});

test("applies namespace patches", () => {
  const nextProps = applyBuilderNamespacePatches<Props>(new Map(build.props), [
    {
      op: "add",
      path: ["prop-subtitle"],
      value: {
        id: "prop-subtitle",
        instanceId: "instance-root",
        name: "Subtitle",
        type: "string",
        value: "Subtitle",
      },
    },
  ]);

  expect(nextProps.get("prop-subtitle")).toEqual({
    id: "prop-subtitle",
    instanceId: "instance-root",
    name: "Subtitle",
    type: "string",
    value: "Subtitle",
  });
});

test("applies patch payloads mutably through namespace resolver", () => {
  const props = new Map<string, unknown>(build.props);
  applyBuilderPatchPayloadMutable(
    (namespace) => {
      if (namespace !== "props") {
        throw new Error("Unexpected namespace");
      }
      return props;
    },
    [
      {
        namespace: "props",
        patches: [
          {
            op: "add",
            path: ["prop-subtitle"],
            value: {
              id: "prop-subtitle",
              instanceId: "instance-root",
              name: "Subtitle",
              type: "string",
              value: "Subtitle",
            },
          },
          {
            op: "replace",
            path: ["prop-subtitle", "value"],
            value: "Updated subtitle",
          },
        ],
      },
    ]
  );

  expect(props.get("prop-subtitle")).toEqual({
    id: "prop-subtitle",
    instanceId: "instance-root",
    name: "Subtitle",
    type: "string",
    value: "Updated subtitle",
  });
});

test("applies patch payload namespace root replacements mutably", () => {
  const props = new Map<string, unknown>(build.props);
  applyBuilderPatchPayloadMutable(
    (namespace) => {
      if (namespace !== "props") {
        throw new Error("Unexpected namespace");
      }
      return props;
    },
    [
      {
        namespace: "props",
        patches: [
          {
            op: "replace",
            path: [],
            value: new Map([
              [
                "prop-subtitle",
                {
                  id: "prop-subtitle",
                  instanceId: "instance-root",
                  name: "Subtitle",
                  type: "string",
                  value: "Subtitle",
                },
              ],
            ]),
          },
        ],
      },
    ]
  );

  expect(props).toEqual(
    new Map([
      [
        "prop-subtitle",
        {
          id: "prop-subtitle",
          instanceId: "instance-root",
          name: "Subtitle",
          type: "string",
          value: "Subtitle",
        },
      ],
    ])
  );
});

test("fails when replacing a missing patch target", () => {
  expect(() =>
    applyBuilderNamespacePatches<Props>(new Map(build.props), [
      {
        op: "replace",
        path: ["client-created-prop"],
        value: {
          id: "client-created-prop",
          instanceId: "instance-root",
          name: "Title",
          type: "string",
          value: "Title",
        },
      },
    ])
  ).toThrow('Cannot replace missing patch path "client-created-prop"');

  const props = new Map<string, unknown>(build.props);
  expect(() =>
    applyBuilderPatchPayloadMutable(
      (namespace) => {
        if (namespace !== "props") {
          throw new Error("Unexpected namespace");
        }
        return props;
      },
      [
        {
          namespace: "props",
          patches: [
            {
              op: "replace",
              path: ["prop-title", "missing"],
              value: "Title",
            },
          ],
        },
      ]
    )
  ).toThrow('Cannot replace missing patch path "missing"');
});

test("replaces a complete namespace at its root", () => {
  const replacement = new Map([
    [
      "replacement",
      {
        id: "replacement",
        instanceId: "instance-root",
        name: "Title",
        type: "string" as const,
        value: "Restored",
      },
    ],
  ]);

  expect(
    applyBuilderNamespacePatches<Props>(new Map(build.props), [
      { op: "replace", path: [], value: replacement },
    ])
  ).toEqual(replacement);
});

test("applies transactions without mutating the input state object", () => {
  const state: BuilderState = {
    props: new Map(build.props),
  };
  const { state: nextState, changedNamespaces } = applyBuilderPatchTransactions(
    state,
    [
      {
        id: "tx-1",
        payload: [
          {
            namespace: "props",
            patches: [
              {
                op: "add",
                path: ["prop-subtitle"],
                value: {
                  id: "prop-subtitle",
                  instanceId: "instance-root",
                  name: "Subtitle",
                  type: "string",
                  value: "Subtitle",
                },
              },
            ],
          },
        ],
      },
    ]
  );

  expect(changedNamespaces).toEqual(["props"]);
  expect(nextState).not.toBe(state);
  expect(nextState.props).not.toBe(state.props);
  expect(state.props?.has("prop-subtitle")).toBe(false);
  expect(nextState.props?.get("prop-subtitle")).toEqual({
    id: "prop-subtitle",
    instanceId: "instance-root",
    name: "Subtitle",
    type: "string",
    value: "Subtitle",
  });
});

test("ignores empty patch changes", () => {
  const { state: nextState, changedNamespaces } = applyBuilderPatchTransactions(
    {},
    [
      {
        id: "tx-1",
        payload: [{ namespace: "props", patches: [] }],
      },
    ]
  );

  expect(nextState).toEqual({});
  expect(changedNamespaces).toEqual([]);
});

test("fails when a transaction targets a missing namespace", () => {
  expect(() =>
    applyBuilderPatchTransactions({}, [
      {
        id: "tx-1",
        payload: [
          {
            namespace: "props",
            patches: [
              {
                op: "remove",
                path: ["prop-title"],
              },
            ],
          },
        ],
      },
    ])
  ).toThrow(MissingBuilderStateNamespaceError);
});
