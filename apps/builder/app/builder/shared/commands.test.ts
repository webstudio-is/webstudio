import { describe, expect, test } from "@jest/globals";
import type { Instance } from "@webstudio-is/sdk";
import * as baseMetas from "@webstudio-is/sdk-components-react/metas";
import {
  $instances,
  $pages,
  $registeredComponentMetas,
  $selectedInstanceSelector,
} from "~/shared/nano-states";
import { registerContainers } from "~/shared/sync";
import { emitCommand } from "./commands";
import { createDefaultPages } from "@webstudio-is/project-build";

registerContainers();

const createInstancePair = (
  id: Instance["id"],
  component: string,
  children: Instance["children"]
): [Instance["id"], Instance] => {
  return [id, { type: "instance", id, component, children }];
};

const metas = new Map(Object.entries(baseMetas));

$pages.set(createDefaultPages({ rootInstanceId: "", systemDataSourceId: "" }));

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
    $registeredComponentMetas.set(metas);
    $selectedInstanceSelector.set(["child2", "parent", "body"]);
    $instances.set(threeChildInstances);
    emitCommand("deleteInstance");
    expect($selectedInstanceSelector.get()).toEqual([
      "child3",
      "parent",
      "body",
    ]);
  });

  test("delete selected instance and select previous one", () => {
    $registeredComponentMetas.set(metas);
    $selectedInstanceSelector.set(["child3", "parent", "body"]);
    $instances.set(threeChildInstances);
    emitCommand("deleteInstance");
    expect($selectedInstanceSelector.get()).toEqual([
      "child2",
      "parent",
      "body",
    ]);
  });

  test("delete selected instance and select parent one", () => {
    $selectedInstanceSelector.set(["child1", "parent", "body"]);
    $registeredComponentMetas.set(metas);
    // body
    //   parent
    //     child1
    $instances.set(
      new Map([
        createInstancePair("body", "Body", [{ type: "id", value: "parent" }]),
        createInstancePair("parent", "Box", [{ type: "id", value: "child1" }]),
        createInstancePair("child1", "Box", []),
      ])
    );
    emitCommand("deleteInstance");
    expect($selectedInstanceSelector.get()).toEqual(["parent", "body"]);
  });
});
