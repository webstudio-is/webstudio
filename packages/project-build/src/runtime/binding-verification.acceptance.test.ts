import { encodeDataVariableId } from "@webstudio-is/sdk";
import { describe, expect, test } from "vitest";
import type { BuilderRuntimeMutation } from "./mutation";
import { applyBuilderPatchTransactions } from "../state/patch";
import {
  createBuilderStateFromSerializedSnapshot,
  createSerializedBuilderStateSnapshotFromState,
} from "../state/adapters";
import { executeBuilderRuntimeOperation } from "./registry";
import { verifyBindings } from "./binding-verification";
import { createBindingVerificationFixture } from "./binding-verification.test-fixtures";

const createContext = () => {
  let nextId = 0;
  return {
    createId: () => `acceptance-${nextId++}`,
  };
};

const applyMutation = (
  state: ReturnType<typeof createBindingVerificationFixture>,
  id: string,
  input: unknown,
  context: ReturnType<typeof createContext>
) => {
  const result = executeBuilderRuntimeOperation({
    id,
    state,
    input,
    context,
  });
  expect(result).toMatchObject({ kind: "mutation" });
  return applyBuilderPatchTransactions(state, [
    {
      id: `transaction-${id}`,
      payload: (result as BuilderRuntimeMutation).payload,
    },
  ]).state;
};

describe("dynamic binding verification acceptance", () => {
  test("checks realistic text, prop, action, parameter, resource, and metadata bindings", () => {
    const state = createBindingVerificationFixture();
    const result = verifyBindings(state, { limit: 200 });

    expect(result.analysis).toEqual({
      staticIntegrity: "complete",
      renderedResolution: "not-evaluated",
      externalResourcesExecuted: false,
    });
    expect(result.findings).toEqual([]);
    expect(result.summary.bindingsChecked).toBeGreaterThanOrEqual(18);

    const bindingKinds = new Set<string>();
    for (const instance of state.instances!.values()) {
      for (const child of instance.children) {
        if (child.type === "expression") {
          bindingKinds.add("text-expression");
        }
      }
    }
    for (const prop of state.props!.values()) {
      if (prop.type === "expression") {
        bindingKinds.add("prop-expression");
      }
      if (prop.type === "action") {
        bindingKinds.add("prop-action");
      }
      if (prop.type === "resource") {
        bindingKinds.add("prop-resource");
      }
      if (prop.type === "parameter") {
        bindingKinds.add("prop-parameter");
      }
    }
    bindingKinds.add("resource-expression");
    bindingKinds.add("page-metadata");
    expect(bindingKinds).toEqual(
      new Set([
        "text-expression",
        "prop-expression",
        "prop-action",
        "prop-resource",
        "prop-parameter",
        "resource-expression",
        "page-metadata",
      ])
    );
  });

  test("keeps root-scoped resource expressions in a page verification", () => {
    const state = createBindingVerificationFixture();
    state.resources!.get("health-resource")!.url = "unknownTenant";

    const result = verifyBindings(state, { pagePath: "/" });

    expect(result.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "unknown-identifier",
          bindingKind: "resource-expression",
          location: expect.objectContaining({
            pageId: "catalog-page",
            resourceId: "health-resource",
          }),
        }),
      ])
    );
  });

  test("preserves binding meaning through the persisted session boundary", () => {
    const state = createBindingVerificationFixture();
    const restored = createBuilderStateFromSerializedSnapshot(
      createSerializedBuilderStateSnapshotFromState(state)
    );

    expect(verifyBindings(restored, { limit: 200 })).toEqual(
      verifyBindings(state, { limit: 200 })
    );
    expect(restored.instances).toEqual(state.instances);
    expect(restored.props).toEqual(state.props);
    expect(restored.dataSources).toEqual(state.dataSources);
    expect(restored.resources).toEqual(state.resources);
  });

  test("survives create, inspect, update, and failed mutation semantics", () => {
    let state = createBindingVerificationFixture();
    const context = createContext();

    state = applyMutation(
      state,
      "variables.create",
      {
        scopeInstanceId: "body",
        name: "region",
        value: { type: "string", value: "eu-west" },
      },
      context
    );
    expect(state.dataSources?.has("acceptance-0")).toBe(true);

    const createResource = executeBuilderRuntimeOperation({
      id: "resources.create",
      state,
      input: {
        resource: {
          name: "Regional products",
          method: "get",
          url: '"/api/products?region=" + region',
          headers: [
            { name: "x-region", value: "region" },
            {
              name: "accept",
              value: { type: "literal", value: "application/json" },
            },
          ],
          searchParams: [
            { name: "source", value: { type: "literal", value: "catalog" } },
          ],
        },
        scopeInstanceId: "body",
        dataSourceName: "RegionalProducts",
        exposeAsDataSource: true,
      },
      context,
    });
    expect(createResource).toMatchObject({
      kind: "mutation",
      result: { resourceId: "acceptance-1", dataSourceId: "acceptance-2" },
    });
    state = applyBuilderPatchTransactions(state, [
      {
        id: "create-regional-resource",
        payload: (createResource as BuilderRuntimeMutation).payload,
      },
    ]).state;

    state = applyMutation(
      state,
      "instances.bindProps",
      {
        bindings: [
          {
            instanceId: "hero",
            name: "aria-label",
            binding: { type: "expression", value: "region" },
          },
        ],
      },
      context
    );
    const regionalProp = [...(state.props?.values() ?? [])].find(
      (prop) => prop.instanceId === "hero" && prop.name === "aria-label"
    );
    expect(regionalProp).toMatchObject({
      type: "expression",
      value: encodeDataVariableId("acceptance-0"),
    });

    const inspection = executeBuilderRuntimeOperation({
      id: "instances.inspect",
      state,
      input: { instanceId: "hero", include: ["bindings"] },
      context,
    });
    expect(inspection).toMatchObject({
      bindings: expect.arrayContaining([
        expect.objectContaining({ name: "aria-label", type: "expression" }),
      ]),
    });

    const clean = verifyBindings(state, { pagePath: "/" });
    expect(clean.findings).toEqual([]);

    state = applyMutation(
      state,
      "variables.update",
      {
        dataSourceId: "acceptance-0",
        values: { scopeInstanceId: "detail-body" },
      },
      context
    );
    const outOfScope = verifyBindings(state, { pagePath: "/" });
    expect(outOfScope.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "out-of-scope-data-source",
          location: expect.objectContaining({ dataSourceId: "acceptance-0" }),
        }),
      ])
    );

    expect(() =>
      executeBuilderRuntimeOperation({
        id: "resources.update",
        state,
        input: {
          resourceId: "acceptance-1",
          values: { url: "region +" },
        },
        context,
      })
    ).toThrow();
  });
});
