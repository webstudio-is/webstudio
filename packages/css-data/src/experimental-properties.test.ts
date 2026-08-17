import { expect, test } from "vitest";
import mdnProperties from "mdn-data/css/properties.json";
import { experimentalProperties } from "./__generated__/experimental-properties";
import { properties } from "./__generated__/properties";
import { shorthandProperties } from "./__generated__/shorthand-properties";

test("supports every experimental MDN property", () => {
  const expectedProperties = Object.entries(mdnProperties)
    .filter(([, config]) => config.status === "experimental")
    .map(([property]) => property)
    .sort();
  const supportedProperties = new Set([
    ...Object.keys(properties),
    ...shorthandProperties,
  ]);

  expect([...experimentalProperties].sort()).toEqual(expectedProperties);
  expect(
    expectedProperties.filter(
      (property) => supportedProperties.has(property) === false
    )
  ).toEqual([]);
});
