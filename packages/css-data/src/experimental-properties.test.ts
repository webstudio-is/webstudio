import { expect, test } from "vitest";
import mdnProperties from "mdn-data/css/properties.json";
import { experimentalProperties } from "./__generated__/experimental-properties";
import { properties } from "./__generated__/properties";
import { shorthandProperties } from "./__generated__/shorthand-properties";

test("supports and describes every experimental MDN property", () => {
  const expectedProperties = Object.fromEntries(
    Object.entries(mdnProperties)
      .filter(([, config]) => config.status === "experimental")
      .map(([property, config]) => [
        property,
        "mdn_url" in config
          ? config.mdn_url
          : `https://developer.mozilla.org/en-US/search?q=${encodeURIComponent(property)}`,
      ])
  );
  const supportedProperties = new Set([
    ...Object.keys(properties),
    ...shorthandProperties,
  ]);

  expect(experimentalProperties).toEqual(expectedProperties);
  expect(
    Object.keys(expectedProperties).filter(
      (property) => supportedProperties.has(property) === false
    )
  ).toEqual([]);
});
