import { expect, test } from "vitest";
import {
  selectInstance,
  $selectedStyleSources,
  $selectedStyleState,
} from "~/shared/nano-states";
import { $instances } from "~/shared/sync/data-stores";
import { deselectMatchingStyleSource } from "./style-source-actions";

test("deselects matching style source for selected instance", () => {
  $instances.set(
    new Map([
      [
        "instance",
        { type: "instance", id: "instance", component: "Box", children: [] },
      ],
    ])
  );
  selectInstance(["instance"]);
  $selectedStyleSources.set(new Map([["instance", "style-source"]]));
  $selectedStyleState.set(":hover");

  deselectMatchingStyleSource("style-source");

  expect($selectedStyleSources.get().has("instance")).toBe(false);
  expect($selectedStyleState.get()).toBeUndefined();
});

test("keeps selection when selected style source does not match", () => {
  $instances.set(
    new Map([
      [
        "instance",
        { type: "instance", id: "instance", component: "Box", children: [] },
      ],
    ])
  );
  selectInstance(["instance"]);
  $selectedStyleSources.set(new Map([["instance", "style-source"]]));
  $selectedStyleState.set(":hover");

  deselectMatchingStyleSource("other-style-source");

  expect($selectedStyleSources.get().get("instance")).toBe("style-source");
  expect($selectedStyleState.get()).toBe(":hover");
});
