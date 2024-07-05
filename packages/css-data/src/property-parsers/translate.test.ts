import { test, expect } from "@jest/globals";
import { parseTranslate } from "./translate";

test("parses a valid translate value", () => {
  expect(parseTranslate("100px")).toMatchInlineSnapshot(`
{
  "type": "tuple",
  "value": [
    {
      "type": "unit",
      "unit": "px",
      "value": 100,
    },
  ],
}
`);

  expect(parseTranslate("100px 200px")).toMatchInlineSnapshot(`
{
  "type": "tuple",
  "value": [
    {
      "type": "unit",
      "unit": "px",
      "value": 100,
    },
    {
      "type": "unit",
      "unit": "px",
      "value": 200,
    },
  ],
}
`);

  expect(parseTranslate("10em 10em 10em")).toMatchInlineSnapshot(`
{
  "type": "tuple",
  "value": [
    {
      "type": "unit",
      "unit": "em",
      "value": 10,
    },
    {
      "type": "unit",
      "unit": "em",
      "value": 10,
    },
    {
      "type": "unit",
      "unit": "em",
      "value": 10,
    },
  ],
}
`);
});

test("parses and returns invalid for invalid translate values", () => {
  expect(parseTranslate("foo bar")).toMatchInlineSnapshot(`
{
  "type": "invalid",
  "value": "foo bar",
}
`);

  expect(parseTranslate("100px 200px 300px 400px")).toMatchInlineSnapshot(`
{
  "type": "invalid",
  "value": "100px 200px 300px 400px",
}
`);

  expect(parseTranslate("100%, 200%")).toMatchInlineSnapshot(`
{
  "type": "invalid",
  "value": "100%, 200%",
}
`);
});
