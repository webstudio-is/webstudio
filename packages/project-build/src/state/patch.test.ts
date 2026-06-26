import { expect, test } from "vitest";
import { build } from "./fixtures.test-utils";
import type { BuilderState } from "./builder-state";
import type { Props } from "@webstudio-is/sdk";
import {
  applyBuilderNamespacePatches,
  applyBuilderPatchTransactions,
  MissingBuilderStateNamespaceError,
} from "./patch";

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
