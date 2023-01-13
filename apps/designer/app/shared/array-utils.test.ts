import { expect, test } from "@jest/globals";
import { filterMutable } from "./array-utils";

test("filterMutable", () => {
  const array = [
    { param: 1 },
    { param: 2 },
    { param: 3 },
    { param: 4 },
    { param: 5 },
    { param: 6 },
  ];
  filterMutable(array, (item) => item.param % 2 === 0);
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
  filterMutable(array, (item) => item.param === 4);
  expect(array).toMatchInlineSnapshot(`
    [
      {
        "param": 4,
      },
    ]
  `);
});
