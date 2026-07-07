import { beforeEach, describe, expect, test } from "vitest";
import { coreMetas, elementComponent } from "@webstudio-is/sdk";
import type { Instances, Props } from "@webstudio-is/sdk";
import { createDefaultPages } from "@webstudio-is/project-build";
import {
  $registeredComponentMetas,
  $selectedPageId,
  selectInstance,
} from "~/shared/nano-states";
import { $instances, $pages, $props } from "~/shared/sync/data-stores";
import {
  $commandSearch,
  closeCommandPanel,
  openCommandPanel,
} from "../command-state";
import { $tagOptions } from "./tags-group";

beforeEach(() => {
  closeCommandPanel();
  $commandSearch.set("");
  $instances.set(new Map());
  $props.set(new Map());
  $pages.set(undefined);
  $selectedPageId.set(undefined);
  $registeredComponentMetas.set(new Map(Object.entries(coreMetas)));
});

describe("$tagOptions", () => {
  test("uses indexed html tags from props when validating content model", () => {
    const instances: Instances = new Map([
      [
        "list",
        {
          type: "instance",
          id: "list",
          component: elementComponent,
          children: [],
        },
      ],
    ]);
    const props: Props = new Map([
      [
        "list-tag",
        {
          id: "list-tag",
          instanceId: "list",
          name: "tag",
          type: "string",
          value: "ul",
        },
      ],
    ]);

    $instances.set(instances);
    $props.set(props);
    $pages.set(
      createDefaultPages({ rootInstanceId: "list", homePageId: "home" })
    );
    $selectedPageId.set("home");
    selectInstance(["list"]);
    openCommandPanel();

    const tags = $tagOptions.get().map((option) => option.tag);

    expect(tags).toContain("li");
    expect(tags).not.toContain("div");
  });
});
