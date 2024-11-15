import { describe, test, expect } from "vitest";
import { nestedSelectButtonUnitless } from "@webstudio-is/design-system";
import { buildOptions } from "./unit-select-options";

describe("Unit menu options", () => {
  test("Should show options", () => {
    expect(
      buildOptions(
        "width",
        { value: 10, type: "unit", unit: "px" },
        nestedSelectButtonUnitless
      )
    ).toMatchInlineSnapshot(`
[
  {
    "id": "px",
    "label": "px",
    "type": "unit",
  },
  {
    "id": "%",
    "label": "%",
    "type": "unit",
  },
  {
    "id": "em",
    "label": "em",
    "type": "unit",
  },
  {
    "id": "rem",
    "label": "rem",
    "type": "unit",
  },
  {
    "id": "svw",
    "label": "svw",
    "type": "unit",
  },
  {
    "id": "svh",
    "label": "svh",
    "type": "unit",
  },
  {
    "id": "lvw",
    "label": "lvw",
    "type": "unit",
  },
  {
    "id": "lvh",
    "label": "lvh",
    "type": "unit",
  },
  {
    "id": "ch",
    "label": "ch",
    "type": "unit",
  },
]
`);
  });

  test("Should show options with unitless if value supports unitless", () => {
    expect(
      buildOptions(
        "width",
        { value: 0, type: "unit", unit: "px" },
        nestedSelectButtonUnitless
      ).some((option) => option.id === "number")
    ).toBe(true);
  });

  test("Should show options with units if value is keyword", () => {
    expect(
      buildOptions(
        "width",
        { value: "auto", type: "keyword" },
        nestedSelectButtonUnitless
      )
    ).toMatchInlineSnapshot(`
[
  {
    "id": "px",
    "label": "px",
    "type": "unit",
  },
  {
    "id": "%",
    "label": "%",
    "type": "unit",
  },
  {
    "id": "em",
    "label": "em",
    "type": "unit",
  },
  {
    "id": "rem",
    "label": "rem",
    "type": "unit",
  },
  {
    "id": "svw",
    "label": "svw",
    "type": "unit",
  },
  {
    "id": "svh",
    "label": "svh",
    "type": "unit",
  },
  {
    "id": "lvw",
    "label": "lvw",
    "type": "unit",
  },
  {
    "id": "lvh",
    "label": "lvh",
    "type": "unit",
  },
  {
    "id": "ch",
    "label": "ch",
    "type": "unit",
  },
]
`);
  });

  test("Should add unit to options even if it's not in a visibleLengthUnits", () => {
    expect(
      buildOptions(
        "width",
        { value: 10, type: "unit", unit: "ch" },
        nestedSelectButtonUnitless
      ).some((option) => option.id === "ch")
    ).toBe(true);
  });
});
