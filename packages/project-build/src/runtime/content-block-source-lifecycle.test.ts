import { describe, expect, test } from "vitest";
import {
  blockBodyComponent,
  blockComponent,
  blockTemplateComponent,
  elementComponent,
  type Instance,
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
  explicitBody = false,
}: { source?: boolean; explicitBody?: boolean } = {}): BuilderState => ({
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
          ...(explicitBody
            ? [
                { type: "id" as const, value: "header" },
                { type: "id" as const, value: "body-outlet" },
                { type: "id" as const, value: "footer" },
              ]
            : [{ type: "id" as const, value: "body" }]),
        ],
      },
    ],
    ...(explicitBody
      ? [
          [
            "header",
            {
              type: "instance" as const,
              id: "header",
              component: elementComponent,
              tag: "header",
              children: [],
            },
          ] as [string, Instance],
          [
            "body-outlet",
            {
              type: "instance" as const,
              id: "body-outlet",
              component: blockBodyComponent,
              children: [{ type: "id" as const, value: "body" }],
            },
          ] as [string, Instance],
          [
            "footer",
            {
              type: "instance" as const,
              id: "footer",
              component: elementComponent,
              tag: "footer",
              children: [],
            },
          ] as [string, Instance],
        ]
      : []),
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
    const connectedChildren = connected.instances?.get("block")?.children;
    expect(connectedChildren?.at(0)).toEqual({
      type: "id",
      value: "templates",
    });
    const bodyChild = connectedChildren?.at(1);
    expect(bodyChild?.type).toBe("id");
    expect(
      bodyChild?.type === "id"
        ? connected.instances?.get(bodyChild.value)?.component
        : undefined
    ).toBe(blockBodyComponent);
    expect(connected.instances?.has("body")).toBe(false);
    const sourceProp = Array.from(connected.props?.values() ?? []).find(
      ({ name }) => name === "src"
    );
    expect(sourceProp?.id).toMatch(/^[\w-]{21}$/);
    expect(sourceProp).toMatchObject({
      instanceId: "block",
      name: "src",
      type: "asset",
      value: "asset",
    });
    const documentProp = Array.from(connected.props?.values() ?? []).find(
      ({ name }) => name === "document"
    );
    expect(documentProp).toMatchObject({
      instanceId: "block",
      name: "document",
      type: "parameter",
    });
    expect(
      connected.dataSources?.get(
        documentProp?.type === "parameter" ? documentProp.value : ""
      )
    ).toMatchObject({
      scopeInstanceId: "block",
      name: "document",
      type: "parameter",
    });
  });

  test("connect clears only the explicit Body outlet", () => {
    const current = state({ explicitBody: true });
    const prepared = prepareContentBlockConnect({
      state: current,
      blockInstanceId: "block",
      source: { type: "asset", assetId: "asset" },
    });
    const connected = apply(current, prepared.projectPayload);

    expect(prepared.requiresConfirmation).toBe(true);
    expect(connected.instances?.get("block")?.children).toEqual([
      { type: "id", value: "templates" },
      { type: "id", value: "header" },
      { type: "id", value: "body-outlet" },
      { type: "id", value: "footer" },
    ]);
    expect(connected.instances?.get("body-outlet")?.children).toEqual([]);
    expect(connected.instances?.has("body")).toBe(false);
    expect(connected.instances?.has("header")).toBe(true);
    expect(connected.instances?.has("footer")).toBe(true);
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
