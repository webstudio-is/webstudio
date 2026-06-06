import { describe, expect, test, beforeEach } from "vitest";
import {
  ROOT_FOLDER_ID,
  ROOT_INSTANCE_ID,
  blockComponent,
  blockTemplateComponent,
  type Instance,
  type Instances,
  type Page,
  type Pages,
} from "@webstudio-is/sdk";
import type { InstancePath } from "~/shared/nano-states";
import { $selectedPageId } from "~/shared/nano-states";
import { $pages } from "~/shared/sync/data-stores";
import { __testing__ } from "./instance-context-menu";

const { getMenuPermissions } = __testing__;

const emptyInstances: Instances = new Map();

const createInstance = (
  id: string,
  component = "Box",
  children: Instance["children"] = []
): Instance => ({
  type: "instance",
  id,
  component,
  children,
});

const page: Page = {
  id: "page",
  name: "Page",
  path: "",
  title: `"Page"`,
  meta: {},
  rootInstanceId: "body",
};

const pages: Pages = {
  homePageId: page.id,
  rootFolderId: ROOT_FOLDER_ID,
  pages: new Map([[page.id, page]]),
  folders: new Map([
    [
      ROOT_FOLDER_ID,
      {
        id: ROOT_FOLDER_ID,
        name: "Root",
        slug: "",
        children: [page.id],
      },
    ],
  ]),
};

beforeEach(() => {
  $pages.set(pages);
  $selectedPageId.set(page.id);
});

describe("getMenuPermissions", () => {
  test("keeps design actions available for regular instances", () => {
    const instancePath: InstancePath = [
      {
        instance: createInstance("child"),
        instanceSelector: ["child", "body"],
      },
      { instance: createInstance("body"), instanceSelector: ["body"] },
    ];

    expect(
      getMenuPermissions({
        instancePath,
        isContentMode: false,
        isDesignMode: true,
        instances: emptyInstances,
      })
    ).toMatchObject({
      canCopy: true,
      canPaste: true,
      canCut: true,
      canDuplicate: true,
      canHide: true,
      canRename: true,
      canWrap: true,
      canConvert: true,
      canAddToken: true,
      canOpenSettings: true,
      canDelete: true,
    });
  });

  test("protects root and page body in design mode", () => {
    const rootPath: InstancePath = [
      {
        instance: createInstance(ROOT_INSTANCE_ID),
        instanceSelector: [ROOT_INSTANCE_ID],
      },
    ];
    const bodyPath: InstancePath = [
      { instance: createInstance("body"), instanceSelector: ["body"] },
    ];

    expect(
      getMenuPermissions({
        instancePath: rootPath,
        isContentMode: false,
        isDesignMode: true,
        instances: emptyInstances,
      })
    ).toMatchObject({
      canCopy: false,
      canPaste: false,
      canCut: false,
      canDuplicate: false,
      canDelete: false,
    });
    expect(
      getMenuPermissions({
        instancePath: bodyPath,
        isContentMode: false,
        isDesignMode: true,
        instances: emptyInstances,
      })
    ).toMatchObject({
      canCopy: false,
      canPaste: true,
      canCut: false,
      canDuplicate: false,
      canDelete: false,
    });
  });

  test("disables design mutations outside of design and content modes", () => {
    const instancePath: InstancePath = [
      {
        instance: createInstance("child"),
        instanceSelector: ["child", "body"],
      },
      { instance: createInstance("body"), instanceSelector: ["body"] },
    ];

    expect(
      getMenuPermissions({
        instancePath,
        isContentMode: false,
        isDesignMode: false,
        instances: emptyInstances,
      })
    ).toMatchObject({
      canCopy: false,
      canPaste: false,
      canCut: false,
      canDuplicate: false,
      canHide: false,
      canRename: false,
      canWrap: false,
      canUnwrap: false,
      canConvert: false,
      canAddToken: false,
      canOpenSettings: true,
      canDelete: false,
    });
  });

  test("content mode exposes only direct content block child deletion and settings", () => {
    const instances: Instances = new Map([
      [
        "body",
        createInstance("body", "Body", [{ type: "id", value: "block" }]),
      ],
      [
        "block",
        createInstance("block", blockComponent, [
          { type: "id", value: "child" },
          { type: "id", value: "template" },
        ]),
      ],
      [
        "child",
        createInstance("child", "Box", [{ type: "id", value: "nested" }]),
      ],
      ["nested", createInstance("nested")],
      ["template", createInstance("template", blockTemplateComponent)],
    ]);
    const blockPath: InstancePath = [
      {
        instance: createInstance("block", blockComponent),
        instanceSelector: ["block", "body"],
      },
      { instance: createInstance("body"), instanceSelector: ["body"] },
    ];
    const childPath: InstancePath = [
      {
        instance: createInstance("child"),
        instanceSelector: ["child", "block", "body"],
      },
      {
        instance: createInstance("block", blockComponent),
        instanceSelector: ["block", "body"],
      },
      { instance: createInstance("body"), instanceSelector: ["body"] },
    ];
    const nestedPath: InstancePath = [
      {
        instance: createInstance("nested"),
        instanceSelector: ["nested", "child", "block", "body"],
      },
      {
        instance: createInstance("child"),
        instanceSelector: ["child", "block", "body"],
      },
      {
        instance: createInstance("block", blockComponent),
        instanceSelector: ["block", "body"],
      },
      { instance: createInstance("body"), instanceSelector: ["body"] },
    ];
    const templatePath: InstancePath = [
      {
        instance: createInstance("template", blockTemplateComponent),
        instanceSelector: ["template", "block", "body"],
      },
      {
        instance: createInstance("block", blockComponent),
        instanceSelector: ["block", "body"],
      },
      { instance: createInstance("body"), instanceSelector: ["body"] },
    ];

    const permissions = getMenuPermissions({
      instancePath: childPath,
      isContentMode: true,
      isDesignMode: false,
      instances,
    });

    expect(permissions).toMatchObject({
      canCopy: false,
      canPaste: false,
      canCut: false,
      canDuplicate: false,
      canHide: false,
      canRename: false,
      canWrap: false,
      canUnwrap: false,
      canConvert: false,
      canAddToken: false,
      canOpenSettings: true,
      canDelete: true,
    });
    expect(
      getMenuPermissions({
        instancePath: blockPath,
        isContentMode: true,
        isDesignMode: false,
        instances,
      }).canDelete
    ).toBe(false);
    expect(
      getMenuPermissions({
        instancePath: nestedPath,
        isContentMode: true,
        isDesignMode: false,
        instances,
      }).canDelete
    ).toBe(false);
    expect(
      getMenuPermissions({
        instancePath: templatePath,
        isContentMode: true,
        isDesignMode: false,
        instances,
      }).canDelete
    ).toBe(false);
  });
});
