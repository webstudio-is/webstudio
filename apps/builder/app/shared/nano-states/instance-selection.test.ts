import { beforeEach, describe, expect, test } from "vitest";
import type { Instance } from "@webstudio-is/sdk";
import { $instances, $pages } from "../sync/data-stores";
import {
  $allSelectedInstanceSelectors,
  $selectedInstance,
  $selectedInstanceKey,
  $selectedInstancePath,
  $selectedInstanceSelector,
  clearInstanceSelection,
  selectInstance,
  selectInstances,
  toggleSelectedInstance,
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
  test("selects and clears the selected instance selector through canonical state", () => {
    selectInstance(["box", "body"]);
    expect($allSelectedInstanceSelectors.get()).toEqual([["box", "body"]]);
    expect($selectedInstanceSelector.get()).toEqual(["box", "body"]);

    selectInstance(undefined);
    expect($allSelectedInstanceSelectors.get()).toEqual([]);
    expect($selectedInstanceSelector.get()).toBeUndefined();
  });

  test("does not notify listeners when selecting the same selector", () => {
    const selections: Array<undefined | readonly Instance["id"][]> = [];
    const unsubscribe = $selectedInstanceSelector.listen((selector) => {
      selections.push(selector);
    });

    selectInstance(["box", "body"]);
    selectInstance(["box", "body"]);

    unsubscribe();
    expect(selections).toEqual([["box", "body"]]);
  });
});

describe("selectInstances", () => {
  test("stores all selected selectors and projects single selection only for one selected instance", () => {
    selectInstances([
      ["box", "body"],
      ["heading", "body"],
    ]);

    expect($allSelectedInstanceSelectors.get()).toEqual([
      ["box", "body"],
      ["heading", "body"],
    ]);
    expect($selectedInstanceSelector.get()).toBeUndefined();

    selectInstances([["box", "body"]]);

    expect($selectedInstanceSelector.get()).toEqual(["box", "body"]);
  });

  test("clears with empty array and clear helper", () => {
    selectInstances([["box", "body"]]);

    selectInstances([]);
    expect($allSelectedInstanceSelectors.get()).toEqual([]);

    selectInstances([["box", "body"]]);
    clearInstanceSelection();
    expect($allSelectedInstanceSelectors.get()).toEqual([]);
  });

  test("deduplicates selectors while preserving first occurrence order", () => {
    selectInstances([
      ["box", "body"],
      ["heading", "body"],
      ["box", "body"],
    ]);

    expect($allSelectedInstanceSelectors.get()).toEqual([
      ["box", "body"],
      ["heading", "body"],
    ]);
  });

  test("does not treat selectors with comma-containing ids as duplicates", () => {
    selectInstances([
      ["a,b", "c"],
      ["a", "b,c"],
    ]);

    expect($allSelectedInstanceSelectors.get()).toEqual([
      ["a,b", "c"],
      ["a", "b,c"],
    ]);
  });

  test("normalizes ancestor and descendant selections", () => {
    selectInstances([
      ["child", "parent", "body"],
      ["parent", "body"],
    ]);
    expect($allSelectedInstanceSelectors.get()).toEqual([["parent", "body"]]);

    selectInstances([
      ["parent", "body"],
      ["child", "parent", "body"],
    ]);
    expect($allSelectedInstanceSelectors.get()).toEqual([["parent", "body"]]);

    selectInstances([
      ["child", "parent", "body"],
      ["footer", "body"],
      ["parent", "body"],
    ]);
    expect($allSelectedInstanceSelectors.get()).toEqual([["parent", "body"]]);
  });

  test("collapses selection to a root selector when one is selected with other instances", () => {
    selectInstances([["box", "body"], [":root"]]);
    expect($allSelectedInstanceSelectors.get()).toEqual([[":root"]]);

    selectInstances([[":root"], ["box", "body"]]);
    expect($allSelectedInstanceSelectors.get()).toEqual([[":root"]]);
  });

  test("collapses selection to page body when selected with its descendants", () => {
    selectInstances([["box", "body"], ["heading", "body"], ["body"]]);
    expect($allSelectedInstanceSelectors.get()).toEqual([["body"]]);

    selectInstances([["body"], ["box", "body"]]);
    expect($allSelectedInstanceSelectors.get()).toEqual([["body"]]);
  });
});

describe("selection store invariants", () => {
  test("clears selection when selected page changes", () => {
    selectInstances([
      ["box", "body"],
      ["heading", "body"],
    ]);

    $selectedPageId.set("page-id");

    expect($allSelectedInstanceSelectors.get()).toEqual([]);
  });

  test("prunes selected selectors that no longer resolve", () => {
    $instances.set(
      new Map([
        [
          "body",
          createInstance("body", [
            { type: "id", value: "box" },
            { type: "id", value: "heading" },
          ]),
        ],
        ["box", createInstance("box")],
        ["heading", createInstance("heading")],
      ])
    );
    selectInstances([
      ["box", "body"],
      ["heading", "body"],
    ]);

    $instances.set(
      new Map([
        ["body", createInstance("body", [{ type: "id", value: "heading" }])],
        ["heading", createInstance("heading")],
      ])
    );

    expect($allSelectedInstanceSelectors.get()).toEqual([["heading", "body"]]);
  });

  test("prunes selected selectors whose parent-child path no longer resolves", () => {
    $instances.set(
      new Map([
        [
          "body",
          createInstance("body", [
            { type: "id", value: "section" },
            { type: "id", value: "footer" },
          ]),
        ],
        ["section", createInstance("section", [{ type: "id", value: "box" }])],
        ["footer", createInstance("footer")],
        ["box", createInstance("box")],
      ])
    );
    selectInstances([["box", "section", "body"]]);

    $instances.set(
      new Map([
        [
          "body",
          createInstance("body", [
            { type: "id", value: "section" },
            { type: "id", value: "footer" },
          ]),
        ],
        ["section", createInstance("section")],
        ["footer", createInstance("footer", [{ type: "id", value: "box" }])],
        ["box", createInstance("box")],
      ])
    );

    expect($allSelectedInstanceSelectors.get()).toEqual([]);
  });

  test("keeps virtual collection item selectors when their base instance still exists", () => {
    $instances.set(
      new Map([
        ["body", createInstance("body", [{ type: "id", value: "collection" }])],
        ["collection", createInstance("collection")],
      ])
    );
    selectInstances([["collection[1]", "collection", "body"]]);

    $instances.set(
      new Map([
        ["body", createInstance("body", [{ type: "id", value: "collection" }])],
        ["collection", createInstance("collection")],
      ])
    );

    expect($allSelectedInstanceSelectors.get()).toEqual([
      ["collection[1]", "collection", "body"],
    ]);

    $instances.set(new Map([["body", createInstance("body")]]));

    expect($allSelectedInstanceSelectors.get()).toEqual([]);
  });
});

describe("toggleSelectedInstance", () => {
  test("adds and removes selected selectors", () => {
    toggleSelectedInstance(["box", "body"]);
    expect($allSelectedInstanceSelectors.get()).toEqual([["box", "body"]]);

    toggleSelectedInstance(["heading", "body"]);
    expect($allSelectedInstanceSelectors.get()).toEqual([
      ["box", "body"],
      ["heading", "body"],
    ]);

    toggleSelectedInstance(["box", "body"]);
    expect($allSelectedInstanceSelectors.get()).toEqual([["heading", "body"]]);

    toggleSelectedInstance(["heading", "body"]);
    expect($allSelectedInstanceSelectors.get()).toEqual([]);
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

  test("does not derive a particular selected instance from multi-selection", () => {
    $instances.set(
      new Map([
        [
          "body",
          createInstance("body", [
            { type: "id", value: "box" },
            { type: "id", value: "heading" },
          ]),
        ],
        ["box", createInstance("box")],
        ["heading", createInstance("heading")],
      ])
    );

    selectInstances([
      ["box", "body"],
      ["heading", "body"],
    ]);

    expect($selectedInstance.get()).toBeUndefined();
    expect($selectedInstanceKey.get()).toBeUndefined();
    expect($selectedInstancePath.get()).toBeUndefined();
  });
});
