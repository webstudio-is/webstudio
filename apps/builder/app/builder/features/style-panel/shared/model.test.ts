// Verifies that style-panel tag lookup uses component metadata when a prop
// selects the element rendered by a polymorphic component.
import { afterEach, expect, test } from "vitest";
import { createDefaultPages } from "@webstudio-is/project-build";
import type { WsComponentMeta } from "@webstudio-is/sdk";
import {
  $registeredComponentMetas,
  $selectedPageId,
  selectInstance,
} from "~/shared/nano-states";
import {
  $instances,
  $pages,
  $props,
  resetDataStores,
} from "~/shared/sync/data-stores";
import { $instanceTags } from "./model";

afterEach(() => {
  resetDataStores();
  $selectedPageId.set(undefined);
  $registeredComponentMetas.set(new Map());
  selectInstance(undefined);
});

test("resolves prop-selected component tags for the style panel", () => {
  const pages = createDefaultPages({ rootInstanceId: "list" });
  $pages.set(pages);
  $selectedPageId.set(pages.homePageId);
  $instances.set(
    new Map([
      [
        "list",
        {
          type: "instance" as const,
          id: "list",
          component: "List",
          children: [],
        },
      ],
    ])
  );
  $props.set(
    new Map([
      [
        "ordered",
        {
          id: "ordered",
          instanceId: "list",
          name: "ordered",
          type: "boolean" as const,
          value: true,
        },
      ],
    ])
  );
  $registeredComponentMetas.set(
    new Map<string, WsComponentMeta>([
      [
        "List",
        {
          props: {
            ordered: {
              type: "boolean",
              control: "boolean",
              required: false,
            },
          },
          renderedTag: {
            prop: "ordered",
            values: { true: "ol", false: "ul" },
            default: "ul",
          },
        },
      ],
    ])
  );
  selectInstance(["list"]);

  expect($instanceTags.get().get("list")).toBe("ol");
});
