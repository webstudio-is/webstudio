import { buildOptions } from "./unit-select-options";
import { describe, test, expect } from "@jest/globals";
//@todo investigate Imports from "@webstudio-is/design-system" cause jest to fail
export const nestedSelectButtonUnitless = " – ";

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
          "id": "dvw",
          "label": "dvw",
          "type": "unit",
        },
        {
          "id": "dvh",
          "label": "dvh",
          "type": "unit",
        },
        {
          "id": "auto",
          "label": "auto",
          "type": "keyword",
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
          "id": "dvw",
          "label": "dvw",
          "type": "unit",
        },
        {
          "id": "dvh",
          "label": "dvh",
          "type": "unit",
        },
        {
          "id": "auto",
          "label": "auto",
          "type": "keyword",
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

  test("Should add keyword to options", () => {
    expect(
      buildOptions(
        "width",
        { value: "inherit", type: "keyword" },
        nestedSelectButtonUnitless
      ).some((option) => option.id === "inherit")
    ).toBe(true);
  });
});
