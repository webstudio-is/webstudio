import { beforeEach, describe, expect, test } from "vitest";
import { createDefaultPages } from "@webstudio-is/project-build";
import { $pages } from "../sync/data-stores";
import {
  $allSelectedInstanceSelectors,
  $selectedInstanceSelector,
  selectInstance,
  selectInstances,
} from "./instances";
import { $selectedPageId, selectPage } from "./pages";

beforeEach(() => {
  $pages.set(undefined);
  $selectedPageId.set(undefined);
  selectInstance(undefined);
});

describe("selectPage", () => {
  test("selects page by id and selects the page root instance", () => {
    const pages = createDefaultPages({
      homePageId: "home-page",
      rootInstanceId: "body-id",
    });
    $pages.set(pages);

    selectPage("home-page");

    expect($selectedPageId.get()).toBe("home-page");
    expect($selectedInstanceSelector.get()).toEqual(["body-id"]);
  });

  test("selects page by path and selects the page root instance", () => {
    const pages = createDefaultPages({
      homePageId: "home-page",
      rootInstanceId: "body-id",
    });
    $pages.set(pages);

    selectPage("/");

    expect($selectedPageId.get()).toBe("home-page");
    expect($selectedInstanceSelector.get()).toEqual(["body-id"]);
  });

  test("leaves current page and instance selection unchanged for unknown page", () => {
    const pages = createDefaultPages({
      homePageId: "home-page",
      rootInstanceId: "body-id",
    });
    $pages.set(pages);
    $selectedPageId.set("home-page");
    selectInstance(["box-id", "body-id"]);

    selectPage("missing-page");

    expect($selectedPageId.get()).toBe("home-page");
    expect($selectedInstanceSelector.get()).toEqual(["box-id", "body-id"]);
  });

  test("clears multi-selection when selected page id changes", () => {
    selectInstances([
      ["box-id", "body-id"],
      ["heading-id", "body-id"],
    ]);

    $selectedPageId.set("other-page");

    expect($allSelectedInstanceSelectors.get()).toEqual([]);
    expect($selectedInstanceSelector.get()).toBeUndefined();
  });
});
