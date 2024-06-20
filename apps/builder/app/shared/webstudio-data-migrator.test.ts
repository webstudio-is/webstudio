import { expect, test } from "@jest/globals";
import type { WebstudioData } from "@webstudio-is/sdk";
import { createDefaultPages } from "@webstudio-is/project-build";
import type { StyleProperty } from "@webstudio-is/css-engine";
import { migrateWebstudioDataMutable } from "./webstudio-data-migrator";

const emptyData: WebstudioData = {
  pages: createDefaultPages({
    rootInstanceId: "rootInstanceId",
    systemDataSourceId: "systemDataSourceId",
  }),
  assets: new Map(),
  dataSources: new Map(),
  resources: new Map(),
  instances: new Map(),
  props: new Map(),
  breakpoints: new Map(),
  styleSources: new Map(),
  styleSourceSelections: new Map(),
  styles: new Map(),
};

test("expand overflow shorthand", () => {
  const data = structuredClone(emptyData);
  data.styles.set("base:local:overflow::hover", {
    breakpointId: "base",
    styleSourceId: "local",
    state: ":hover",
    property: "overflow" as StyleProperty,
    value: {
      type: "tuple",
      value: [
        { type: "keyword", value: "auto" },
        { type: "keyword", value: "hidden" },
      ],
    },
  });
  migrateWebstudioDataMutable(data);
  expect(Array.from(data.styles.values())).toEqual([
    {
      breakpointId: "base",
      property: "overflowX",
      state: ":hover",
      styleSourceId: "local",
      value: { type: "keyword", value: "auto" },
    },
    {
      breakpointId: "base",
      property: "overflowY",
      state: ":hover",
      styleSourceId: "local",
      value: { type: "keyword", value: "hidden" },
    },
  ]);
});
