import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  blockComponent,
  blockTemplateComponent,
  coreMetas,
  elementComponent,
  type Instance,
  type Prop,
  type WebstudioFragment,
} from "@webstudio-is/sdk";
import * as defaultMetas from "@webstudio-is/sdk-components-react/metas";
import type { Project } from "@webstudio-is/project";
import { createDefaultPages } from "@webstudio-is/project-build";
import type { InstanceSelector } from "@webstudio-is/project-build/runtime";
import {
  __testing__,
  filterInsertableContentBlockTemplates,
  insertListItemAt,
  insertTemplateAt,
} from "./block-utils";
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
import { $externalContentRoots } from "~/shared/external-content-mutations";

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

test("keeps structural MDX templates out of insertion menus", () => {
  const templates: [Instance, InstanceSelector][] = [
    [
      { ...createInstance("cell", elementComponent), tag: "td" },
      ["cell", "templates", "block"],
    ],
    [createInstance("heading", "Heading"), ["heading", "templates", "block"]],
    [createInstance("card", "Card"), ["card", "templates", "block"]],
  ];
  const props = new Map<string, Prop>([
    [
      "heading-tag",
      {
        id: "heading-tag",
        instanceId: "heading",
        name: "tag",
        type: "string",
        value: "h2",
      },
    ],
  ]);
  const metas = new Map(Object.entries({ ...defaultMetas, ...coreMetas }));

  expect(
    filterInsertableContentBlockTemplates({ templates, props, metas }).map(
      ([template]) => template.id
    )
  ).toEqual(["heading", "card"]);
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
    $externalContentRoots.set(new Map());
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
            label: "Card",
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
    $externalContentRoots.set(
      new Map([
        [
          "scope",
          {
            blockInstanceId: "block",
            instanceIds: new Set<string>(),
            mutationRevision: 0,
          },
        ],
      ])
    );

    const insertion = insertTemplateAt({
      templateSelector: ["template", "templates", "block", "body"],
      anchor: ["current", "block", "body"],
      insertBefore: false,
    });

    const insertedSelector = $selectedInstanceSelector.get();
    expect(insertedSelector?.[0]).not.toBe("current");
    expect(insertedSelector?.slice(1)).toEqual(["block", "body"]);
    const insertedId = insertedSelector?.[0];
    const recordedInsertion =
      insertedId === undefined
        ? undefined
        : $externalContentRoots
            .get()
            .get("scope")
            ?.insertedTemplates?.get(insertedId);
    expect(recordedInsertion).toMatchObject({ templateName: "Card" });
    expect(recordedInsertion?.pristineFragment.children).toEqual([
      { type: "id", value: insertedId },
    ]);
    expect(recordedInsertion?.htmlTags).toEqual([
      { instanceId: insertedId, tag: "p" },
    ]);

    await expect(insertion).resolves.toBe(true);
  });

  test("replaces the current block when slash replaces all of its text", async () => {
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
            ...createInstance("template", elementComponent, [
              { type: "text", value: "Template content" },
            ]),
            tag: "p",
            label: "Paragraph",
          },
        ],
        [
          "current",
          {
            ...createInstance("current", elementComponent, [
              { type: "text", value: "Replaced content" },
            ]),
            tag: "p",
          },
        ],
      ])
    );

    const insertion = insertTemplateAt({
      templateSelector: ["template", "templates", "block", "body"],
      anchor: ["current", "block", "body"],
      insertBefore: false,
      replaceAnchor: true,
    });

    await expect(insertion).resolves.toBe(true);
    const children = $instances.get().get("block")?.children ?? [];
    expect(children).toHaveLength(2);
    expect(children[0]).toEqual({ type: "id", value: "templates" });
    expect(children).not.toContainEqual({ type: "id", value: "current" });
    const insertedId = children[1]?.type === "id" ? children[1].value : "";
    expect($instances.get().get(insertedId)?.children).toEqual([
      { type: "text", value: "Template content" },
    ]);
  });
});
