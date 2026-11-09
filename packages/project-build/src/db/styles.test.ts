import { expect, test } from "vitest";
import type { StyleDecl } from "@webstudio-is/sdk";
import { writableStyles } from "./styles";

const style = (property: string, value = "none"): StyleDecl => ({
  styleSourceId: "source",
  breakpointId: "base",
  property: property as StyleDecl["property"],
  value: { type: "unparsed", value },
});

test("rejects malformed writable style maps", () => {
  const invalid = style(
    "--pE--_WitxzZqY_3KruPxn-\\ \\>\\ \\.figma-block-translate"
  );
  expect(
    writableStyles.safeParse(new Map([["invalid", invalid]])).success
  ).toBe(false);
  expect(
    writableStyles.safeParse(new Map([["valid", style("color", "red")]]))
      .success
  ).toBe(true);
});
