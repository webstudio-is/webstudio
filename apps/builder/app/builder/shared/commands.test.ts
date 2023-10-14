import { describe, expect, test } from "@jest/globals";
import type { Instance } from "@webstudio-is/sdk";
import * as baseMetas from "@webstudio-is/sdk-components-react/metas";
import {
  instancesStore,
  registeredComponentMetasStore,
  selectedInstanceSelectorStore,
} from "~/shared/nano-states";
import { registerContainers } from "~/shared/sync";
import { emitCommand } from "./commands";

registerContainers();

const createInstancePair = (
  id: Instance["id"],
  component: string,
  children: Instance["children"]
): [Instance["id"], Instance] => {
  return [id, { type: "instance", id, component, children }];
};

const metas = new Map(Object.entries(baseMetas));

describe("deleteInstance", () => {
  // body
  //   parent
  //     child1
  //     child2
  //     child3
  const threeChildInstances = new Map([
    createInstancePair("body", "Body", [{ type: "id", value: "parent" }]),
    createInstancePair("parent", "Box", [
      { type: "id", value: "child1" },
      { type: "id", value: "child2" },
      { type: "id", value: "child3" },
    ]),
    createInstancePair("child1", "Box", []),
    createInstancePair("child2", "Box", []),
    createInstancePair("child3", "Box", []),
  ]);

  test("delete selected instance and select next one", () => {
    registeredComponentMetasStore.set(metas);
    selectedInstanceSelectorStore.set(["child2", "parent", "body"]);
    instancesStore.set(threeChildInstances);
    emitCommand("deleteInstance");
    expect(selectedInstanceSelectorStore.get()).toEqual([
      "child3",
      "parent",
      "body",
    ]);
  });

  test("delete selected instance and select previous one", () => {
    registeredComponentMetasStore.set(metas);
    selectedInstanceSelectorStore.set(["child3", "parent", "body"]);
    instancesStore.set(threeChildInstances);
    emitCommand("deleteInstance");
    expect(selectedInstanceSelectorStore.get()).toEqual([
      "child2",
      "parent",
      "body",
    ]);
  });

  test("delete selected instance and select parent one", () => {
    selectedInstanceSelectorStore.set(["child1", "parent", "body"]);
    registeredComponentMetasStore.set(metas);
    // body
    //   parent
    //     child1
    instancesStore.set(
      new Map([
        createInstancePair("body", "Body", [{ type: "id", value: "parent" }]),
        createInstancePair("parent", "Box", [{ type: "id", value: "child1" }]),
        createInstancePair("child1", "Box", []),
      ])
    );
    emitCommand("deleteInstance");
    expect(selectedInstanceSelectorStore.get()).toEqual(["parent", "body"]);
  });
});
