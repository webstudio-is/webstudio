import { expect, test } from "@jest/globals";

import { parseTransitionLonghandProperty } from "./transition";
import { toValue } from "@webstudio-is/css-engine";

test("parses a valid transitionDuration longhand property", () => {
  expect(parseTransitionLonghandProperty("transitionDuration", `10ms, 10ms`))
    .toMatchInlineSnapshot(`
{
  "type": "layers",
  "value": [
    {
      "type": "unit",
      "unit": "ms",
      "value": 10,
    },
    {
      "type": "unit",
      "unit": "ms",
      "value": 10,
    },
  ],
}
`);
});

test("parses an in-valid transitionDuration longhand property", () => {
  expect(parseTransitionLonghandProperty("transitionDuration", `10ms, foo`))
    .toMatchInlineSnapshot(`
{
  "type": "invalid",
  "value": "10ms, foo",
}
`);
});

test("parses a vaild transitionProeprty longhand property", () => {
  expect(
    parseTransitionLonghandProperty("transitionProperty", "opacity, width, all")
  ).toMatchInlineSnapshot(`
{
  "type": "layers",
  "value": [
    {
      "type": "keyword",
      "value": "opacity",
    },
    {
      "type": "keyword",
      "value": "width",
    },
    {
      "type": "keyword",
      "value": "all",
    },
  ],
}
`);
});

test("parses only valid transitionProperty longhand property", () => {
  expect(
    parseTransitionLonghandProperty("transitionProperty", "opacity, width, foo")
  ).toMatchInlineSnapshot(`
{
  "type": "invalid",
  "value": "opacity, width, foo",
}
`);
});

test("parses a vaild transitionTimingFunction longhand property", () => {
  const parsedValue = parseTransitionLonghandProperty(
    "transitionTimingFunction",
    "ease, ease-in, cubic-bezier(0.68,-0.6,0.32,1.6), steps(4, jump-start)"
  );
  expect(parsedValue).toMatchInlineSnapshot(`
{
  "type": "layers",
  "value": [
    {
      "type": "keyword",
      "value": "ease",
    },
    {
      "type": "keyword",
      "value": "ease-in",
    },
    {
      "args": {
        "type": "layers",
        "value": [
          {
            "type": "keyword",
            "value": "0.68",
          },
          {
            "type": "keyword",
            "value": "-0.6",
          },
          {
            "type": "keyword",
            "value": "0.32",
          },
          {
            "type": "keyword",
            "value": "1.6",
          },
        ],
      },
      "name": "cubic-bezier",
      "type": "function",
    },
    {
      "args": {
        "type": "layers",
        "value": [
          {
            "type": "keyword",
            "value": "4",
          },
          {
            "type": "keyword",
            "value": "jump-start",
          },
        ],
      },
      "name": "steps",
      "type": "function",
    },
  ],
}
`);
  expect(toValue(parsedValue)).toMatchInlineSnapshot(
    `"ease, ease-in, cubic-bezier(0.68, -0.6, 0.32, 1.6), steps(4, jump-start)"`
  );
});

test("parses any invalid transitionTimingFunction proeprty and returns invalud", () => {
  expect(
    parseTransitionLonghandProperty(
      "transitionTimingFunction",
      "ease, ease-in, cubic-bezier(0.68,-0.6,0.32,1.6), testing"
    )
  ).toMatchInlineSnapshot(`
{
  "type": "invalid",
  "value": "ease, ease-in, cubic-bezier(0.68,-0.6,0.32,1.6), testing",
}
`);
});
