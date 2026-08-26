import { describe, expect, test } from "vitest";
import {
  blockComponent,
  blockTemplateComponent,
  elementComponent,
  type WebstudioFragment,
} from "@webstudio-is/sdk";
import type { BuilderState } from "../state/builder-state";
import { applyBuilderPatchTransactions } from "../state/patch";
import { createDefaultPages } from "../shared/pages-utils";
import {
  prepareContentBlockConnect,
  prepareContentBlockDisconnect,
  prepareContentBlockSwitch,
} from "./content-block-source-lifecycle";

const state = ({
  source = false,
}: { source?: boolean } = {}): BuilderState => ({
  pages: createDefaultPages({ rootInstanceId: "block" }),
  instances: new Map([
    [
      "block",
      {
        type: "instance",
        id: "block",
        component: blockComponent,
        children: [
          { type: "id", value: "templates" },
          { type: "id", value: "body" },
        ],
      },
    ],
    [
      "templates",
      {
        type: "instance",
        id: "templates",
        component: blockTemplateComponent,
        children: [],
      },
    ],
    [
      "body",
      {
        type: "instance",
        id: "body",
        component: elementComponent,
        tag: "p",
        children: [{ type: "text", value: "Existing" }],
      },
    ],
  ]),
  props: source
    ? new Map([
        [
          "src",
          {
            id: "src",
            instanceId: "block",
            name: "src",
            type: "asset" as const,
            value: "first",
          },
        ],
      ])
    : new Map(),
  dataSources: new Map(),
  resources: new Map(),
  styleSources: new Map(),
  styleSourceSelections: new Map(),
  styles: new Map(),
  breakpoints: new Map(),
  assets: new Map(),
});

const apply = (
  current: BuilderState,
  payload: ReturnType<typeof prepareContentBlockConnect>["projectPayload"]
) =>
  applyBuilderPatchTransactions(current, [
    { id: "test", payload: [...payload] },
  ]).state;

const context = (() => {
  let id = 0;
  return {
    createId: () => `generated-${id++}`,
    projectId: "project",
  };
})();

describe("Content Block source lifecycle", () => {
  test("connect replaces ordinary body content without producing Asset writes", () => {
    const current = state();
    const prepared = prepareContentBlockConnect({
      state: current,
      blockInstanceId: "block",
      source: { type: "asset", assetId: "asset" },
      context,
    });
    const connected = apply(current, prepared.projectPayload);

    expect(prepared.requiresConfirmation).toBe(true);
    expect(connected.instances?.get("block")?.children).toEqual([
      { type: "id", value: "templates" },
    ]);
    expect(connected.instances?.has("body")).toBe(false);
    expect(Array.from(connected.props?.values() ?? [])).toEqual([
      expect.objectContaining({
        instanceId: "block",
        name: "src",
        type: "asset",
        value: "asset",
      }),
    ]);
  });

  test("switch changes only the source contract", () => {
    const current = state({ source: true });
    const prepared = prepareContentBlockSwitch({
      state: current,
      blockInstanceId: "block",
      source: { type: "asset", assetId: "second" },
      context,
    });
    const switched = apply(current, prepared.projectPayload);

    expect(switched.instances).toEqual(current.instances);
    expect(switched.props?.get("src")).toMatchObject({ value: "second" });
  });

  test("disconnect copies the current materialized fragment with fresh ids", () => {
    const current = state({ source: true });
    const block = current.instances?.get("block");
    if (block === undefined) {
      throw new Error("Expected block");
    }
    block.children = [
      { type: "id", value: "templates" },
      { type: "id", value: "materialized" },
    ];
    current.instances?.set("materialized", {
      type: "instance",
      id: "materialized",
      component: elementComponent,
      tag: "h2",
      children: [{ type: "text", value: "From file" }],
    });
    const fragment: WebstudioFragment = {
      children: [{ type: "id", value: "materialized" }],
      instances: [current.instances!.get("materialized")!],
      props: [],
      assets: [],
      dataSources: [],
      resources: [],
      breakpoints: [],
      styleSources: [],
      styleSourceSelections: [],
      styles: [],
    };

    const prepared = prepareContentBlockDisconnect({
      state: current,
      blockInstanceId: "block",
      fragment,
      context,
    });
    const disconnected = apply(current, prepared.projectPayload);
    const copiedChild = disconnected.instances
      ?.get("block")
      ?.children.find(
        (child) => child.type === "id" && child.value !== "templates"
      );

    expect(copiedChild?.type).toBe("id");
    if (copiedChild?.type !== "id") {
      throw new Error("Expected copied child");
    }
    expect(copiedChild.value).not.toBe("materialized");
    expect(disconnected.instances?.get(copiedChild.value)).toMatchObject({
      tag: "h2",
      children: [{ type: "text", value: "From file" }],
    });
    expect(disconnected.props?.has("src")).toBe(false);
  });
});
