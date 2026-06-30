import { beforeEach, describe, expect, test } from "vitest";
import { coreMetas, elementComponent } from "@webstudio-is/sdk";
import type { Instances } from "@webstudio-is/sdk";
import { createDefaultPages } from "@webstudio-is/project-build";
import { $registeredComponentMetas } from "~/shared/nano-states";
import { $instances, $pages, $props } from "~/shared/sync/data-stores";
import {
  $commandSearch,
  closeCommandPanel,
  openCommandPanel,
} from "../command-state";
import { $instanceOptions } from "./instances-group";

beforeEach(() => {
  closeCommandPanel();
  $commandSearch.set("");
  $instances.set(new Map());
  $props.set(new Map());
  $pages.set(undefined);
  $registeredComponentMetas.set(new Map(Object.entries(coreMetas)));
});

describe("$instanceOptions", () => {
  test("does not build instance options until command search has text", () => {
    const instances: Instances = new Map([
      [
        "box",
        {
          type: "instance",
          id: "box",
          component: elementComponent,
          tag: "div",
          children: [],
        },
      ],
    ]);
    $instances.set(instances);
    $pages.set(createDefaultPages({ rootInstanceId: "box" }));

    openCommandPanel();

    expect($instanceOptions.get()).toEqual([]);

    $commandSearch.set("box");

    expect($instanceOptions.get()).toHaveLength(1);
    expect($instanceOptions.get()[0]?.instance.id).toBe("box");
  });
});
