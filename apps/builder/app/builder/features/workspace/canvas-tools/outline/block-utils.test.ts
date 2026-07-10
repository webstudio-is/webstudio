import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Instance, WebstudioFragment } from "@webstudio-is/sdk";
import type { Project } from "@webstudio-is/project";
import { createDefaultPages } from "@webstudio-is/project-build";
import { __testing__, insertListItemAt } from "./block-utils";
import { registerContainers } from "~/shared/sync/sync-stores";
import {
  $instances,
  $pages,
  $project,
  $props,
} from "~/shared/sync/data-stores";
import {
  $selectedInstanceSelector,
  $textEditingInstanceSelector,
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
