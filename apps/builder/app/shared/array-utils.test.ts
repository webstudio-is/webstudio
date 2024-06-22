import { expect, test } from "@jest/globals";
import { removeByMutable } from "./array-utils";

test("removeByMutable", () => {
  const array = [
    { param: 1 },
    { param: 2 },
    { param: 3 },
    { param: 4 },
    { param: 5 },
    { param: 6 },
  ];
  removeByMutable(array, (item) => item.param % 2 === 1);
  expect(array).toMatchInlineSnapshot(`
    [
      {
        "param": 2,
      },
      {
        "param": 4,
      },
      {
        "param": 6,
      },
    ]
  `);
  removeByMutable(array, (item) => item.param !== 4);
  expect(array).toMatchInlineSnapshot(`
    [
      {
        "param": 4,
      },
    ]
  `);
});
