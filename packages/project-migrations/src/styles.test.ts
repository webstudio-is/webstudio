import { expect, test } from "vitest";
import type { StyleProperty } from "@webstudio-is/css-engine";
import type { Styles } from "@webstudio-is/sdk";
import { migrateStylesMutable } from "./styles";

test("expands overflow shorthand", () => {
  const styles: Styles = new Map([
    [
      "base:local:overflow::hover",
      {
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
      },
    ],
  ]);

  migrateStylesMutable(styles);

  expect(Array.from(styles.values())).toEqual([
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
