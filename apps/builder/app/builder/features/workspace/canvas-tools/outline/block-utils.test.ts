import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  blockComponent,
  blockTemplateComponent,
  coreMetas,
  elementComponent,
  type Instance,
  type WebstudioFragment,
} from "@webstudio-is/sdk";
import * as defaultMetas from "@webstudio-is/sdk-components-react/metas";
import type { Project } from "@webstudio-is/project";
import { createDefaultPages } from "@webstudio-is/project-build";
import { __testing__, insertListItemAt, insertTemplateAt } from "./block-utils";
import { registerContainers } from "~/shared/sync/sync-stores";
import {
  $instances,
  $pages,
  $project,
  $props,
} from "~/shared/sync/data-stores";
import {
  $selectedInstanceSelector,
  $builderMode,
  $registeredComponentMetas,
  $textEditingInstanceSelector,
  selectPage,
  selectInstance,
} from "~/shared/nano-states";

const { getTemplateTokenConflicts } = __testing__;
registerContainers();

const createInstance = (
  id: Instance["id"],
  component: Instance["component"],
  children: Instance["children"] = []
): Instance => ({
  type: "instance",
  id,
  component,
  children,
});

const fragment: WebstudioFragment = {
  children: [],
  instances: [],
  assets: [],
  dataSources: [],
  resources: [],
  props: [],
  breakpoints: [],
  styleSourceSelections: [],
  styleSources: [],
  styles: [],
};
const targetData = {} as Parameters<
  typeof getTemplateTokenConflicts
>[0]["targetData"];

describe("getTemplateTokenConflicts", () => {
  test("does not scan template token conflicts in content mode", () => {
    const detect = vi.fn(() => []);

    expect(
      getTemplateTokenConflicts({
        fragment,
        targetData,
        contentMode: true,
        detect,
      })
    ).toEqual([]);
    expect(detect).not.toHaveBeenCalled();
  });

  test("delegates template token conflict detection outside content mode", () => {
    const conflicts: ReturnType<typeof getTemplateTokenConflicts> = [];
    const detect = vi.fn(() => conflicts);

    expect(
      getTemplateTokenConflicts({
        fragment,
        targetData,
        contentMode: false,
        detect,
      })
    ).toBe(conflicts);
    expect(detect).toHaveBeenCalledWith({ fragment, targetData });
  });
});

describe("insertListItemAt", () => {
  beforeEach(() => {
    $project.set({ id: "projectId" } as Project);
    selectInstance(undefined);
    $textEditingInstanceSelector.set(undefined);
  });

  test("inserts a cloned empty list item through the runtime fragment operation", async () => {
    const instances = new Map<Instance["id"], Instance>([
      ["body", createInstance("body", "Body", [{ type: "id", value: "list" }])],
      [
        "list",
        createInstance("list", "List", [{ type: "id", value: "first" }]),
      ],
      [
        "first",
        createInstance("first", "ListItem", [{ type: "text", value: "First" }]),
      ],
    ]);
    $pages.set(createDefaultPages({ rootInstanceId: "body" }));
    $instances.set(instances);
    $props.set(new Map());

    await insertListItemAt(["first", "list", "body"]);

    const listChildren = $instances.get().get("list")?.children ?? [];
    const insertedId =
      listChildren[1]?.type === "id" ? listChildren[1].value : undefined;
    expect(insertedId).toEqual(expect.any(String));
    expect(insertedId).not.toBe("first");
    expect($instances.get().get(insertedId ?? "")?.children).toEqual([]);
    expect($selectedInstanceSelector.get()).toEqual([
      insertedId,
      "list",
      "body",
    ]);
    expect($textEditingInstanceSelector.get()).toEqual({
      selector: [insertedId, "list", "body"],
      reason: "new",
    });
  });
});

describe("insertTemplateAt", () => {
  beforeEach(() => {
    $project.set({ id: "projectId" } as Project);
    $pages.set(
      createDefaultPages({ homePageId: "home", rootInstanceId: "body" })
    );
    selectPage("home");
    $props.set(new Map());
    $builderMode.set("content");
    $registeredComponentMetas.set(
      new Map(Object.entries({ ...defaultMetas, ...coreMetas }))
    );
    selectInstance(["current", "block", "body"]);
    $textEditingInstanceSelector.set(undefined);
  });

  afterEach(() => {
    $builderMode.set("design");
  });

  test("inserts synchronously when content mode has no token conflicts", async () => {
    $instances.set(
      new Map<Instance["id"], Instance>([
        [
          "body",
          createInstance("body", "Body", [{ type: "id", value: "block" }]),
        ],
        [
          "block",
          createInstance("block", blockComponent, [
            { type: "id", value: "templates" },
            { type: "id", value: "current" },
          ]),
        ],
        [
          "templates",
          createInstance("templates", blockTemplateComponent, [
            { type: "id", value: "template" },
          ]),
        ],
        [
          "template",
          {
            ...createInstance("template", elementComponent),
            tag: "p",
          },
        ],
        [
          "current",
          {
            ...createInstance("current", elementComponent),
            tag: "p",
          },
        ],
      ])
    );

    const insertion = insertTemplateAt(
      ["template", "templates", "block", "body"],
      ["current", "block", "body"],
      false
    );

    const insertedSelector = $selectedInstanceSelector.get();
    expect(insertedSelector?.[0]).not.toBe("current");
    expect(insertedSelector?.slice(1)).toEqual(["block", "body"]);

    await expect(insertion).resolves.toBe(true);
  });
});
