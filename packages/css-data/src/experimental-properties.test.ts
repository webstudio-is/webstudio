import { expect, test } from "vitest";
import mdnProperties from "mdn-data/css/properties.json";
import { experimentalProperties } from "./__generated__/experimental-properties";

test("includes every experimental MDN property", () => {
  const expectedProperties = Object.entries(mdnProperties)
    .filter(([, config]) => config.status === "experimental")
    .map(([property]) => property)
    .sort();

  expect([...experimentalProperties].sort()).toEqual(expectedProperties);
});
