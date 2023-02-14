import { expect, test } from "@jest/globals";
import { removeByMutable, replaceByOrAppendMutable } from "./array-utils";

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

test("replaceByOrAppendMutable", () => {
  const array = [{ param: 1 }, { param: 2 }, { param: 3 }];
  replaceByOrAppendMutable(array, { param: 6 }, (item) => item.param === 2);
  expect(array).toMatchInlineSnapshot(`
    [
      {
        "param": 1,
      },
      {
        "param": 6,
      },
      {
        "param": 3,
      },
    ]
  `);
  replaceByOrAppendMutable(array, { param: 8 }, (item) => item.param === 8);
  expect(array).toMatchInlineSnapshot(`
    [
      {
        "param": 1,
      },
      {
        "param": 6,
      },
      {
        "param": 3,
      },
      {
        "param": 8,
      },
    ]
  `);
});
