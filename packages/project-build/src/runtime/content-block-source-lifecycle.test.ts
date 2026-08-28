import { describe, expect, test } from "vitest";
import {
  blockComponent,
  blockTemplateComponent,
  elementComponent,
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

describe("Content Block source lifecycle", () => {
  test("connect replaces ordinary body content without producing Asset writes", () => {
    const current = state();
    const prepared = prepareContentBlockConnect({
      state: current,
      blockInstanceId: "block",
      source: { type: "asset", assetId: "asset" },
    });
    const connected = apply(current, prepared.projectPayload);

    expect(prepared.requiresConfirmation).toBe(true);
    expect(connected.instances?.get("block")?.children).toEqual([
      { type: "id", value: "templates" },
    ]);
    expect(connected.instances?.has("body")).toBe(false);
    const [sourceProp] = Array.from(connected.props?.values() ?? []);
    expect(sourceProp?.id).toMatch(/^[\w-]{21}$/);
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
    });
    const switched = apply(current, prepared.projectPayload);

    expect(switched.instances).toEqual(current.instances);
    expect(switched.props?.get("src")).toMatchObject({ value: "second" });
  });

  test("disconnect removes only the source property", () => {
    const current = state({ source: true });
    const prepared = prepareContentBlockDisconnect({
      state: current,
      blockInstanceId: "block",
    });
    const disconnected = apply(current, prepared.projectPayload);

    expect(disconnected.instances).toEqual(current.instances);
    expect(disconnected.props?.has("src")).toBe(false);
    expect(prepared.requiresConfirmation).toBe(false);
  });
});
