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

test.each(["id", "instanceId"])("applypatches on map", (pk) => {
  /**
   *
   * @param {*} item
   * @returns
   */
  const getKey = (item) => item[pk];

  let state = new Map(
    [
      { [pk]: "1", name: "John" },
      { [pk]: "2", name: "Doe" },
      { [pk]: "11", children: [1, 2] },
    ].map((item) => [getKey(item), item])
  );

  /** @type { import("immer").Patch[] } */
  let changes = [];

  produce(
    state,
    (draft) => {
      draft.set("3", { [pk]: "3", name: "Jane" });
      draft.set("4", { [pk]: "3", name: "Doe" });
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
    pk,
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

  const result = patch(JSON.stringify(state), "", JSON.stringify(changes));

  expect(JSON.parse(result)).toEqual(originalResult);
});

test("applypatches on map with multiple primary keys", () => {
  const pk = "idA,idB";
  /**
   *
   * @param {*} item
   * @returns
   */
  const getKey = (item) => `${item.idA ?? ""}:${item.idB ?? ""}`;

  let state = new Map(
    [
      { idA: "1", idB: "1", name: "John" },
      { idA: "1", idB: "2", name: "Doe" },
      { idA: "2", idB: "1", children: [1, 2] },
    ].map((item) => [getKey(item), item])
  );
  /** @type { import("immer").Patch[] } */
  let changes = [];

  produce(
    state,
    (draft) => {
      draft.set("3:1", { idA: "3", idB: "1", name: "Jane" });
      draft.set("4:1", { idA: "4", idB: "1", name: "Doe" });
      // @ts-ignore
      draft.get("1:1").name = "Jane";
      // @ts-ignore
      draft.get("2:1").children.push(3);
      // @ts-ignore
      draft.get("2:1").children[0] = 11;
      // @ts-ignore
      draft.get("2:1").label = "world";
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
    pk,
    JSON.stringify(changes)
  );

  expect(JSON.parse(result)).toEqual([...originalResult.values()]);
});
