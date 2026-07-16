import { describe, expect, test } from "vitest";
import { applyBuilderPatchTransactions } from "../state/patch";
import type { BuilderRuntimeMutation } from "./mutation";
import { executeBuilderRuntimeOperation } from "./registry";
import { createResourceCollectionIntegrationFixture } from "./runtime-ui.test-fixture";

const createContext = () => {
  let id = 0;
  return { createId: () => `runtime-ui-${++id}` };
};

describe("runtimeUi.integrate", () => {
  test("plans one editable resource-backed Collection transaction", () => {
    const fixture = createResourceCollectionIntegrationFixture();
    const originalController = structuredClone(
      fixture.state.instances!.get("results-controller")
    );
    const mutation = executeBuilderRuntimeOperation({
      id: "runtimeUi.integrate",
      state: fixture.state,
      input: fixture.input,
      context: createContext(),
    }) as BuilderRuntimeMutation<{
      created: Record<string, unknown>;
      editableStructure: Record<string, unknown>;
      retainedBehavior: unknown[];
      unsupportedConversions: unknown[];
      warnings: unknown[];
    }>;

    expect(mutation).toMatchObject({
      kind: "mutation",
      noop: false,
      result: {
        editableStructure: { type: "collection", usesCollection: true },
        warnings: [],
        retainedBehavior: [
          {
            instanceId: "results-controller",
            responsibility: "Keyboard navigation and result activation",
          },
        ],
        unsupportedConversions: [
          expect.objectContaining({
            behavior: "Third-party analytics callback",
          }),
        ],
      },
    });
    expect(
      new Set(mutation.payload.map(({ namespace }) => namespace)).size
    ).toBe(mutation.payload.length);
    expect(mutation.invalidatesNamespaces).toContain("pages");

    // A normal dry-run returns this mutation without applying it.
    expect(fixture.state.resources?.size).toBe(1);
    expect(fixture.state.instances!.get("results-controller")).toEqual(
      originalController
    );

    const { state: integrated } = applyBuilderPatchTransactions(fixture.state, [
      { id: "integrate-runtime-ui", payload: mutation.payload },
    ]);
    expect(integrated.instances!.get("results-controller")).toEqual(
      originalController
    );
    expect(integrated.resources?.size).toBe(2);
    expect(
      Array.from(integrated.dataSources!.values()).map(({ name }) => name)
    ).toEqual(expect.arrayContaining(["ResultsLabel", "SearchResults"]));

    const collection = Array.from(integrated.instances!.values()).find(
      ({ component }) => component === "ws:collection"
    );
    expect(collection).toBeDefined();
    expect(integrated.instances!.get("body")?.children).toContainEqual({
      type: "id",
      value: collection?.id,
    });
    expect(
      Array.from(integrated.props!.values()).find(
        ({ instanceId, name }) =>
          instanceId === collection?.id && name === "aria-label"
      )
    ).toMatchObject({
      type: "expression",
      value: expect.stringContaining("$ws$dataSource$"),
    });
    expect(
      Array.from(integrated.props!.values()).find(
        ({ instanceId, name }) =>
          instanceId === collection?.id && name === "data"
      )
    ).toMatchObject({
      type: "expression",
      value: expect.stringContaining("$ws$dataSource$"),
    });
  });

  test("rejects new script fragments and missing retained behavior", () => {
    const fixture = createResourceCollectionIntegrationFixture();
    expect(() =>
      executeBuilderRuntimeOperation({
        id: "runtimeUi.integrate",
        state: fixture.state,
        input: {
          ...fixture.input,
          retainedBehavior: [
            { instanceId: "missing-script", responsibility: "Unknown" },
          ],
        },
        context: createContext(),
      })
    ).toThrow(/Retained behavior instance/);

    expect(() =>
      executeBuilderRuntimeOperation({
        id: "runtimeUi.integrate",
        state: fixture.state,
        input: {
          ...fixture.input,
          structure: {
            type: "fragment",
            fragment: {
              ...fixture.input.structure.itemFragment,
              instances: [
                {
                  type: "instance",
                  id: "new-script",
                  component: "HtmlEmbed",
                  children: [],
                },
              ],
            },
          },
        },
        context: createContext(),
      })
    ).toThrow(/cannot create HtmlEmbed scripts/);

    expect(() =>
      executeBuilderRuntimeOperation({
        id: "runtimeUi.integrate",
        state: fixture.state,
        input: {
          ...fixture.input,
          structure: {
            type: "fragment",
            fragment: {
              ...fixture.input.structure.itemFragment,
              instances: [
                {
                  type: "instance",
                  id: "manual-collection",
                  component: "@webstudio-is/sdk-components-react:Collection",
                  children: [],
                },
              ],
            },
          },
        },
        context: createContext(),
      })
    ).toThrow(/Use structure\.type "collection"/);
  });

  test("does not expose action-script bindings", () => {
    const fixture = createResourceCollectionIntegrationFixture();
    const operation = executeBuilderRuntimeOperation;
    expect(() =>
      operation({
        id: "runtimeUi.integrate",
        state: fixture.state,
        input: {
          ...fixture.input,
          bindings: [
            {
              target: { type: "insertedRoot", index: 0 },
              name: "onClick",
              binding: {
                type: "action",
                value: [{ type: "execute", args: [], code: "doSomething()" }],
              },
            },
          ],
        },
        context: createContext(),
      })
    ).toThrow(/Operation input is invalid/);
  });

  test("inserts ordinary fragments and validates existing binding targets", () => {
    const fixture = createResourceCollectionIntegrationFixture();
    const structure = {
      type: "fragment" as const,
      fragment: fixture.input.structure.itemFragment,
    };

    const mutation = executeBuilderRuntimeOperation({
      id: "runtimeUi.integrate",
      state: fixture.state,
      input: { ...fixture.input, structure, resources: [], variables: [] },
      context: createContext(),
    }) as BuilderRuntimeMutation<{ editableStructure: { type: string } }>;

    expect(mutation.result.editableStructure).toEqual({
      type: "fragment",
      usesCollection: false,
    });
    expect(mutation.result).toMatchObject({
      created: { rootInstanceIds: [expect.any(String)] },
    });

    expect(() =>
      executeBuilderRuntimeOperation({
        id: "runtimeUi.integrate",
        state: fixture.state,
        input: {
          ...fixture.input,
          structure,
          bindings: [
            {
              target: { type: "existing", instanceId: "missing" },
              name: "title",
              binding: { type: "expression", value: "ResultsLabel" },
            },
          ],
        },
        context: createContext(),
      })
    ).toThrow(/Binding target instance "missing" not found/);
  });
});
