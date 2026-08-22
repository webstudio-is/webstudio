import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  blockComponent,
  blockTemplateComponent,
  elementComponent,
  type Instance,
  type WebstudioFragment,
} from "@webstudio-is/sdk";
import type { Project } from "@webstudio-is/project";
import { createDefaultPages } from "@webstudio-is/project-build";
import type { MaterializedMdxAuthoredContentRoot } from "@webstudio-is/project-build/runtime";
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
import {
  publishMaterializedContentRoot,
  registerContentStorageSaver,
  resetMaterializedContent,
} from "~/shared/content-block-content";

const { getPersistedInsertionInstanceId, getTemplateTokenConflicts } =
  __testing__;
registerContainers();

afterEach(() => {
  resetMaterializedContent();
});

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

test("uses the rematerialized instance id after an MDX insertion save", () => {
  expect(
    getPersistedInsertionInstanceId({
      root: {
        identity: {
          blockInstanceId: "block",
          assetId: "asset",
          contentRef: "content.mdx",
          revision: "next-revision",
          renderScope: "scope",
          format: "mdx",
        },
        fragment: {
          ...fragment,
          children: [{ type: "id", value: "persisted-heading" }],
        },
      },
      insertIndex: 0,
      transientInstanceId: "transient-heading",
    })
  ).toBe("persisted-heading");
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

  test("inserts after a list item from materialized MDX content", async () => {
    $pages.set(createDefaultPages({ rootInstanceId: "body" }));
    $instances.set(
      new Map([
        [
          "body",
          createInstance("body", "Body", [{ type: "id", value: "block" }]),
        ],
        [
          "block",
          createInstance("block", blockComponent, [
            { type: "id", value: "templates" },
          ]),
        ],
        ["templates", createInstance("templates", blockTemplateComponent)],
      ])
    );
    $props.set(
      new Map([
        [
          "source",
          {
            id: "source",
            instanceId: "block",
            name: "src",
            type: "asset" as const,
            value: "article",
          },
        ],
      ])
    );
    const renderScope = JSON.stringify(["block", "body"]);
    const root: MaterializedMdxAuthoredContentRoot = {
      identity: {
        blockInstanceId: "block",
        assetId: "article",
        contentRef: "article.mdx",
        revision: "sha256:one",
        renderScope,
        format: "mdx",
      },
      fragment: {
        ...fragment,
        children: [{ type: "id", value: "list" }],
        instances: [
          {
            ...createInstance("list", elementComponent, [
              { type: "id", value: "first" },
            ]),
            tag: "ul",
          },
          {
            ...createInstance("first", elementComponent, [
              { type: "text", value: "First" },
            ]),
            tag: "li",
          },
        ],
      },
      document: {
        frontmatter: { properties: {} },
        children: [
          {
            type: "element",
            syntax: "markdown",
            tag: "ul",
            props: [],
            children: [
              {
                type: "element",
                syntax: "markdown",
                tag: "li",
                props: [],
                children: [{ type: "text", value: "First" }],
              },
            ],
          },
        ],
      },
      provenance: {
        nodes: [
          { type: "element", path: [0], instanceId: "list", assetProps: [] },
          {
            type: "element",
            path: [0, 0],
            instanceId: "first",
            assetProps: [],
          },
        ],
        unresolvedTemplates: [],
      },
    };
    publishMaterializedContentRoot(root);
    const save = vi.fn(async () => ({ status: "applied" as const }));
    const unregister = registerContentStorageSaver({
      blockInstanceId: "block",
      renderScope,
      preflight: save,
      save,
      isCurrent: () => true,
    });
    selectInstance(["first", "list", "block", "body"]);

    await insertListItemAt(["first", "list", "block", "body"]);

    expect(save).toHaveBeenCalled();
    const insertedId = $textEditingInstanceSelector.get()?.selector[0];
    expect(insertedId).toEqual(expect.any(String));
    expect(insertedId).not.toBe("first");
    expect($textEditingInstanceSelector.get()?.selector).toEqual([
      insertedId,
      "list",
      "block",
      "body",
    ]);
    unregister();
  });
});
