import { expect, test } from "vitest";
import mdnProperties from "mdn-data/css/properties.json";
import { properties } from "./__generated__/properties";
import { propertyStatuses } from "./__generated__/property-statuses";
import { shorthandProperties } from "./__generated__/shorthand-properties";

const propertiesHandledInAnotherForm = new Set([
  "--*",
  "-webkit-text-fill-color",
  "-webkit-text-stroke-color",
  "-webkit-text-stroke-width",
  "all",
  "overflow",
  "background-position",
  "border-block-style",
  "border-block-width",
  "border-block-color",
  "border-inline-style",
  "border-inline-width",
  "border-inline-color",
]);

test("supports MDN properties regardless of status", () => {
  const expectedStatuses = Object.fromEntries(
    Object.entries(mdnProperties)
      .filter(
        ([property]) => propertiesHandledInAnotherForm.has(property) === false
      )
      .map(([property, config]) => [property, config.status])
  );
  const supportedProperties = new Set([
    ...Object.keys(properties),
    ...shorthandProperties,
  ]);

  expect(propertyStatuses).toEqual(expectedStatuses);
  expect(
    Object.keys(expectedStatuses).filter(
      (property) => supportedProperties.has(property) === false
    )
  ).toEqual([]);
});
