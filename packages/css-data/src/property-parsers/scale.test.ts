import { test, expect } from "@jest/globals";
import { parseScale } from "./scale";

test("parses a valid translate value", () => {
  expect(parseScale("1.5")).toMatchInlineSnapshot(`
{
  "type": "tuple",
  "value": [
    {
      "type": "keyword",
      "value": "1.5",
    },
  ],
}
`);

  expect(parseScale("5 10 15")).toMatchInlineSnapshot(`
{
  "type": "tuple",
  "value": [
    {
      "type": "keyword",
      "value": "5",
    },
    {
      "type": "keyword",
      "value": "10",
    },
    {
      "type": "keyword",
      "value": "15",
    },
  ],
}
`);
});

test("throws error for invalid scale proeprty values", () => {
  expect(parseScale("10 foo")).toMatchInlineSnapshot(`
{
  "type": "invalid",
  "value": "10 foo",
}
`);

  expect(parseScale("5 10 15 20")).toMatchInlineSnapshot(`
{
  "type": "invalid",
  "value": "5 10 15 20",
}
`);

  expect(parseScale("5, 15")).toMatchInlineSnapshot(`
{
  "type": "invalid",
  "value": "5, 15",
}
`);
});
