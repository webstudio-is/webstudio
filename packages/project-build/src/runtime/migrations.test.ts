import { describe, expect, test } from "vitest";
import { createDefaultPages } from "@webstudio-is/project-build";
import type { BuilderState } from "../state/builder-state";
import { migrateLoadedData, migrateLoadedDataInput } from "./migrations";

const createState = (): BuilderState => ({
  pages: createDefaultPages({ rootInstanceId: "body" }),
  instances: new Map([
    [
      "body",
      {
        type: "instance",
        id: "body",
        component: "Body",
        children: [],
      },
    ],
  ]),
  props: new Map(),
  styles: new Map(),
  styleSources: new Map(),
  styleSourceSelections: new Map(),
  dataSources: new Map(),
  resources: new Map(),
  assets: new Map(),
  breakpoints: new Map(),
});

describe("migrateLoadedData", () => {
  test("accepts no input fields", () => {
    expect(migrateLoadedDataInput.safeParse({}).success).toBe(true);
    expect(migrateLoadedDataInput.safeParse({ id: "manual" }).success).toBe(
      false
    );
  });

  test("returns a runtime mutation for loaded data migrations", () => {
    const mutation = migrateLoadedData(createState());

    expect(mutation.kind).toBe("mutation");
    expect(mutation.result).toEqual({ didBreakCycles: false });
    expect(mutation.invalidatesNamespaces).toEqual([
      "pages",
      "instances",
      "props",
      "styles",
      "styleSources",
      "styleSourceSelections",
      "dataSources",
      "resources",
      "assets",
      "assetFolders",
      "breakpoints",
    ]);
  });
});
