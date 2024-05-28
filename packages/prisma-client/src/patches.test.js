/* eslint-disable @typescript-eslint/ban-ts-comment */
import { expect, test } from "@jest/globals";
// @ts-ignore
import { patch } from "./patches";
import {
  produce,
  enableMapSet,
  enablePatches,
  applyPatches as applyPatchesImmer,
} from "immer";

enableMapSet();
enablePatches();

/**
 *
 * @template T
 * @param {T} obj
 * @returns {T}
 */
const deepClone = (obj) =>
  obj instanceof Map
    ? new Map([...obj].map(([k, v]) => [k, deepClone(v)]))
    : JSON.parse(JSON.stringify(obj));

test("applypatches on map", () => {
  let state = new Map([
    ["1", { id: "1", name: "John" }],
    ["2", { id: "2", name: "Doe" }],
    ["11", { id: "11", children: [1, 2] }],
  ]);

  /** @type { import("immer").Patch[] } */
  let changes = [];

  produce(
    state,
    (draft) => {
      draft.set("3", { id: "3", name: "Jane" });
      draft.set("4", { id: "3", name: "Doe" });
      // @ts-ignore
      draft.get("2").name = "Jane";
      // @ts-ignore
      draft.get("11").children.push(3);
      // @ts-ignore
      draft.get("11").children[0] = 11;
      // @ts-ignore
      draft.get("11").label = "world";
    },
    (patches) => {
      changes = patches;
    }
  );

  const originalResult = applyPatchesImmer(
    deepClone(state),
    deepClone(changes)
  );

  const result = patch(
    JSON.stringify([...state.values()]),
    "map",
    JSON.stringify(changes)
  );

  expect(JSON.parse(result)).toEqual([...originalResult.values()]);
});

test("applypatches on object", () => {
  let state = {
    hello: "world",
    props: {
      name: "John",
      age: 20,
    },
  };

  /** @type { import("immer").Patch[] } */
  let changes = [];

  produce(
    state,
    (draft) => {
      draft.hello = "world 2";
      draft.props.age = 44;
    },
    (patches) => {
      changes = patches;
    }
  );

  const originalResult = applyPatchesImmer(
    deepClone(state),
    deepClone(changes)
  );

  const result = patch(
    JSON.stringify(state),
    "object",
    JSON.stringify(changes)
  );

  expect(JSON.parse(result)).toEqual(originalResult);
});
