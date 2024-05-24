import { describe, expect, test, jest } from "@jest/globals";
import { applyPatches } from "./patches";
import {
  produce,
  enableMapSet,
  enablePatches,
  applyPatches as applyPatchesImmer,
} from "immer";

enableMapSet();
enablePatches();

const deepClone = (obj) =>
  obj instanceof Map
    ? new Map([...obj].map(([k, v]) => [k, deepClone(v)]))
    : JSON.parse(JSON.stringify(obj));

test("applypatches", () => {
  let state = new Map([
    ["1", { id: "1", name: "John" }],
    ["2", { id: "2", name: "Doe" }],
    ["11", { id: "11", children: [1, 2] }],
  ]);

  let changes = [];

  produce(
    state,
    (draft) => {
      draft.set("3", { id: "3", name: "Jane" });
      draft.set("4", { id: "3", name: "Doe" });
      draft.get("2").name = "Jane";
      draft.get("11").children.push(3);
      draft.get("11").children[0] = 11;
      draft.get("11").label = "world";
    },
    (patches) => {
      changes = patches;
    }
  );

  const result = applyPatches(deepClone(state), deepClone(changes));
  const originalResult = applyPatchesImmer(
    deepClone(state),
    deepClone(changes)
  );

  expect(result).toEqual(originalResult);
});
