import { enableMapSet } from "immer";
import { expect, test } from "vitest";
import { registerContainers } from "~/shared/sync";
import {
  $instances,
  $selectedStyleSources,
  $styleSourceSelections,
  $styleSources,
} from "~/shared/nano-states";
import { addStyleSourceToInstance } from "./style-source-section";
import { $awareness } from "~/shared/awareness";

enableMapSet();
registerContainers();

test("add style source to instance", () => {
  $instances.set(
    new Map([
      [
        "body",
        { type: "instance", id: "body", component: "Body", children: [] },
      ],
    ])
  );
  $awareness.set({
    pageId: "",
    instanceSelector: ["body"],
  });
  $styleSources.set(new Map([["local1", { id: "local1", type: "local" }]]));
  $styleSourceSelections.set(new Map());
  $selectedStyleSources.set(new Map());

  addStyleSourceToInstance("token1");
  expect($styleSourceSelections.get().get("body")).toEqual({
    instanceId: "body",
    values: ["token1"],
  });
  expect($selectedStyleSources.get().get("body")).toEqual("token1");

  // put new style source last
  addStyleSourceToInstance("local1");
  expect($styleSourceSelections.get().get("body")).toEqual({
    instanceId: "body",
    values: ["token1", "local1"],
  });

  // put new token before local
  addStyleSourceToInstance("token2");
  expect($styleSourceSelections.get().get("body")).toEqual({
    instanceId: "body",
    values: ["token1", "token2", "local1"],
  });
});
