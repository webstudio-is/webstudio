import { beforeEach, describe, expect, test } from "vitest";
import type { Instance } from "@webstudio-is/sdk";
import { $instances, $pages } from "../sync/data-stores";
import {
  $selectedInstance,
  $selectedInstanceKey,
  $selectedInstancePath,
  $selectedInstanceSelector,
  selectInstance,
} from "./instances";
import { $selectedPageId } from "./pages";

const createInstance = (
  id: Instance["id"],
  children: Instance["children"] = []
): Instance => ({
  type: "instance",
  id,
  component: "Box",
  children,
});

beforeEach(() => {
  $instances.set(new Map());
  $pages.set(undefined);
  $selectedPageId.set(undefined);
  selectInstance(undefined);
});

describe("selectInstance", () => {
  test("selects and clears the selected instance selector", () => {
    selectInstance(["box", "body"]);
    expect($selectedInstanceSelector.get()).toEqual(["box", "body"]);

    selectInstance(undefined);
    expect($selectedInstanceSelector.get()).toBeUndefined();
  });

  test("does not notify listeners when selecting the same selector", () => {
    const selections: Array<undefined | Instance["id"][]> = [];
    const unsubscribe = $selectedInstanceSelector.listen((selector) => {
      selections.push(selector);
    });

    selectInstance(["box", "body"]);
    selectInstance(["box", "body"]);

    unsubscribe();
    expect(selections).toEqual([["box", "body"]]);
  });
});

describe("selected instance derived state", () => {
  test("derives selected instance, key, and path from selected selector", () => {
    $instances.set(
      new Map([
        ["body", createInstance("body", [{ type: "id", value: "box" }])],
        ["box", createInstance("box", [{ type: "id", value: "child" }])],
        ["child", createInstance("child")],
      ])
    );

    selectInstance(["child", "box", "body"]);

    expect($selectedInstance.get()?.id).toBe("child");
    expect($selectedInstanceKey.get()).toBe(
      JSON.stringify(["child", "box", "body"])
    );
    expect(
      $selectedInstancePath.get()?.map(({ instance }) => instance.id)
    ).toEqual(["child", "box", "body"]);
  });

  test("clears selected instance, key, and path when selection is cleared", () => {
    $instances.set(new Map([["box", createInstance("box")]]));

    selectInstance(["box"]);
    selectInstance(undefined);

    expect($selectedInstance.get()).toBeUndefined();
    expect($selectedInstanceKey.get()).toBeUndefined();
    expect($selectedInstancePath.get()).toBeUndefined();
  });
});
