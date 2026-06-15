import { describe, expect, test } from "vitest";
import { createDefaultPages } from "@webstudio-is/project-build";
import type { Instance, PageTemplate } from "@webstudio-is/sdk";
import type { Project } from "@webstudio-is/project";
import {
  $editingPageId,
  $editingTemplateId,
  $folderIdToDelete,
  $pageIdToDelete,
  $selectedPageId,
  $templateIdToDelete,
  selectInstance,
  selectPage,
} from "~/shared/nano-states";
import {
  $assets,
  $breakpoints,
  $dataSources,
  $instances,
  $pages,
  $project,
  $props,
  $resources,
  $styles,
  $styleSources,
  $styleSourceSelections,
} from "~/shared/sync/data-stores";
import { registerContainers } from "~/shared/sync/sync-stores";
import {
  getDeletablePageActionTarget,
  getPageActionTarget,
} from "~/shared/page-action-target";
import { __testing__, emitCommand } from "./commands";

const { canRunDesignModeCommand, guardDesignModeCommand } = __testing__;

registerContainers();

const resetPageActionStores = () => {
  $editingPageId.set(undefined);
  $editingTemplateId.set(undefined);
  $folderIdToDelete.set(undefined);
  $pageIdToDelete.set(undefined);
  $selectedPageId.set(undefined);
  $templateIdToDelete.set(undefined);
  $instances.set(new Map());
  $pages.set(undefined);
};

const resetDataStores = () => {
  $assets.set(new Map());
  $breakpoints.set(new Map());
  $dataSources.set(new Map());
  $instances.set(new Map());
  $pages.set(undefined);
  $project.set(undefined);
  $props.set(new Map());
  $resources.set(new Map());
  $styles.set(new Map());
  $styleSources.set(new Map());
  $styleSourceSelections.set(new Map());
};

describe("canRunDesignModeCommand", () => {
  test("keeps design commands design-only", () => {
    expect(canRunDesignModeCommand({ isDesignMode: true })).toBe(true);
    expect(canRunDesignModeCommand({ isDesignMode: false })).toBe(false);
  });
});

describe("guardDesignModeCommand", () => {
  test("allows design mode commands without showing a message", () => {
    const messages: string[] = [];

    expect(
      guardDesignModeCommand({
        isDesignMode: true,
        message: "Blocked",
        toastInfo: (message) => messages.push(message),
      })
    ).toBe(true);
    expect(messages).toEqual([]);
  });

  test("blocks non-design mode commands and reports a message", () => {
    const messages: string[] = [];

    expect(
      guardDesignModeCommand({
        isDesignMode: false,
        message: "Blocked",
        toastInfo: (message) => messages.push(message),
      })
    ).toBe(false);
    expect(messages).toEqual(["Blocked"]);
  });
});

describe("duplicateInstance", () => {
  test("duplicates shared slot child in shared slot content", () => {
    resetDataStores();
    const instances = new Map<Instance["id"], Instance>([
      [
        "body",
        {
          type: "instance",
          id: "body",
          component: "Body",
          children: [
            { type: "id", value: "slot1" },
            { type: "id", value: "slot2" },
          ],
        },
      ],
      [
        "slot1",
        {
          type: "instance",
          id: "slot1",
          component: "Slot",
          children: [{ type: "id", value: "fragment" }],
        },
      ],
      [
        "slot2",
        {
          type: "instance",
          id: "slot2",
          component: "Slot",
          children: [{ type: "id", value: "fragment" }],
        },
      ],
      [
        "fragment",
        {
          type: "instance",
          id: "fragment",
          component: "Fragment",
          children: [{ type: "id", value: "div" }],
        },
      ],
      [
        "div",
        {
          type: "instance",
          id: "div",
          component: "Box",
          children: [],
        },
      ],
    ]);
    const pages = createDefaultPages({
      homePageId: "page-id",
      rootInstanceId: "body",
    });
    $pages.set(pages);
    $selectedPageId.set(pages.homePageId);
    $project.set({ id: "project-id" } as Project);
    $instances.set(instances);
    selectInstance(["div", "fragment", "slot1", "body"]);

    emitCommand("duplicateInstance");

    expect($instances.get().get("slot1")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect($instances.get().get("slot2")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect($instances.get().get("fragment")?.children).toEqual([
      { type: "id", value: "div" },
      { type: "id", value: expect.any(String) },
    ]);
  });

  test("duplicates nested shared slot child in shared slot content", () => {
    resetDataStores();
    const instances = new Map<Instance["id"], Instance>([
      [
        "body",
        {
          type: "instance",
          id: "body",
          component: "Body",
          children: [
            { type: "id", value: "slot1" },
            { type: "id", value: "slot2" },
          ],
        },
      ],
      [
        "slot1",
        {
          type: "instance",
          id: "slot1",
          component: "Slot",
          children: [{ type: "id", value: "fragment" }],
        },
      ],
      [
        "slot2",
        {
          type: "instance",
          id: "slot2",
          component: "Slot",
          children: [{ type: "id", value: "fragment" }],
        },
      ],
      [
        "fragment",
        {
          type: "instance",
          id: "fragment",
          component: "Fragment",
          children: [{ type: "id", value: "div" }],
        },
      ],
      [
        "div",
        {
          type: "instance",
          id: "div",
          component: "Box",
          children: [{ type: "id", value: "box" }],
        },
      ],
      [
        "box",
        {
          type: "instance",
          id: "box",
          component: "Box",
          children: [],
        },
      ],
    ]);
    const pages = createDefaultPages({
      homePageId: "page-id",
      rootInstanceId: "body",
    });
    $pages.set(pages);
    $selectedPageId.set(pages.homePageId);
    $project.set({ id: "project-id" } as Project);
    $instances.set(instances);
    selectInstance(["box", "div", "fragment", "slot1", "body"]);

    emitCommand("duplicateInstance");

    expect($instances.get().get("slot1")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect($instances.get().get("slot2")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect($instances.get().get("fragment")?.children).toEqual([
      { type: "id", value: "div" },
    ]);
    expect($instances.get().get("div")?.children).toEqual([
      { type: "id", value: "box" },
      { type: "id", value: expect.any(String) },
    ]);
  });

  test("duplicates shared slot child and preserves shared siblings", () => {
    resetDataStores();
    const instances = new Map<Instance["id"], Instance>([
      [
        "body",
        {
          type: "instance",
          id: "body",
          component: "Body",
          children: [
            { type: "id", value: "slot1" },
            { type: "id", value: "slot2" },
          ],
        },
      ],
      [
        "slot1",
        {
          type: "instance",
          id: "slot1",
          component: "Slot",
          children: [{ type: "id", value: "fragment" }],
        },
      ],
      [
        "slot2",
        {
          type: "instance",
          id: "slot2",
          component: "Slot",
          children: [{ type: "id", value: "fragment" }],
        },
      ],
      [
        "fragment",
        {
          type: "instance",
          id: "fragment",
          component: "Fragment",
          children: [
            { type: "id", value: "box" },
            { type: "id", value: "heading" },
          ],
        },
      ],
      [
        "box",
        {
          type: "instance",
          id: "box",
          component: "Box",
          children: [],
        },
      ],
      [
        "heading",
        {
          type: "instance",
          id: "heading",
          component: "Heading",
          children: [],
        },
      ],
    ]);
    const pages = createDefaultPages({
      homePageId: "page-id",
      rootInstanceId: "body",
    });
    $pages.set(pages);
    $selectedPageId.set(pages.homePageId);
    $project.set({ id: "project-id" } as Project);
    $instances.set(instances);
    selectInstance(["box", "fragment", "slot1", "body"]);

    emitCommand("duplicateInstance");

    expect($instances.get().get("slot1")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect($instances.get().get("slot2")?.children).toEqual([
      { type: "id", value: "fragment" },
    ]);
    expect($instances.get().get("fragment")?.children).toEqual([
      { type: "id", value: "box" },
      { type: "id", value: expect.any(String) },
      { type: "id", value: "heading" },
    ]);
  });
});

describe("getPageActionTarget", () => {
  test("uses the open page settings target", () => {
    resetPageActionStores();
    const pages = createDefaultPages({
      homePageId: "page-id",
      rootInstanceId: "body-id",
    });
    $pages.set(pages);
    $editingPageId.set("page-id");

    expect(getPageActionTarget()).toEqual({ type: "page", id: "page-id" });
  });

  test("uses the open folder settings target", () => {
    resetPageActionStores();
    const pages = createDefaultPages({
      homePageId: "page-id",
      rootInstanceId: "body-id",
    });
    pages.folders.set("folder-id", {
      id: "folder-id",
      name: "Folder",
      slug: "folder",
      children: [],
    });
    $pages.set(pages);
    $editingPageId.set("folder-id");

    expect(getPageActionTarget()).toEqual({
      type: "folder",
      id: "folder-id",
    });
  });

  test("uses the open template settings target", () => {
    resetPageActionStores();
    const pages = createDefaultPages({
      homePageId: "page-id",
      rootInstanceId: "body-id",
    });
    const template: PageTemplate = {
      id: "template-id",
      name: "Template",
      title: `"Template"`,
      rootInstanceId: "template-root",
      meta: {},
    };
    pages.pageTemplates = new Map([[template.id, template]]);
    $pages.set(pages);
    $editingTemplateId.set("template-id");

    expect(getPageActionTarget()).toEqual({
      type: "template",
      id: "template-id",
    });
  });

  test("uses open page settings over stale template settings", () => {
    resetPageActionStores();
    const pages = createDefaultPages({
      homePageId: "page-id",
      rootInstanceId: "body-id",
    });
    const template: PageTemplate = {
      id: "template-id",
      name: "Template",
      title: `"Template"`,
      rootInstanceId: "template-root",
      meta: {},
    };
    pages.pageTemplates = new Map([[template.id, template]]);
    $pages.set(pages);
    $editingTemplateId.set("template-id");
    $editingPageId.set("page-id");

    expect(getPageActionTarget()).toEqual({ type: "page", id: "page-id" });
  });

  test("uses the selected page root target", () => {
    resetPageActionStores();
    const pages = createDefaultPages({
      homePageId: "page-id",
      rootInstanceId: "body-id",
    });
    const body: Instance = {
      type: "instance",
      id: "body-id",
      component: "Body",
      children: [],
    };
    $pages.set(pages);
    $instances.set(new Map([[body.id, body]]));
    selectPage("page-id");

    expect(getPageActionTarget()).toEqual({ type: "page", id: "page-id" });
  });
});

describe("getDeletablePageActionTarget", () => {
  test("returns selected non-home page root", () => {
    resetPageActionStores();
    const pages = createDefaultPages({
      homePageId: "home-page",
      rootInstanceId: "home-root",
    });
    pages.pages.set("page-id", {
      id: "page-id",
      name: "Page",
      path: "/page",
      title: `"Page"`,
      rootInstanceId: "body-id",
      meta: {},
    });
    const body: Instance = {
      type: "instance",
      id: "body-id",
      component: "Body",
      children: [],
    };
    $pages.set(pages);
    $instances.set(new Map([[body.id, body]]));
    selectPage("page-id");

    expect(getDeletablePageActionTarget()).toEqual({
      type: "page",
      id: "page-id",
    });
  });

  test("returns open folder settings target", () => {
    resetPageActionStores();
    const pages = createDefaultPages({
      homePageId: "home-page",
      rootInstanceId: "home-root",
    });
    pages.folders.set("folder-id", {
      id: "folder-id",
      name: "Folder",
      slug: "folder",
      children: [],
    });
    $pages.set(pages);
    $editingPageId.set("folder-id");

    expect(getDeletablePageActionTarget()).toEqual({
      type: "folder",
      id: "folder-id",
    });
  });

  test("returns open template settings target", () => {
    resetPageActionStores();
    const pages = createDefaultPages({
      homePageId: "home-page",
      rootInstanceId: "home-root",
    });
    const template: PageTemplate = {
      id: "template-id",
      name: "Template",
      title: `"Template"`,
      rootInstanceId: "template-root",
      meta: {},
    };
    pages.pageTemplates = new Map([[template.id, template]]);
    $pages.set(pages);
    $editingTemplateId.set("template-id");

    expect(getDeletablePageActionTarget()).toEqual({
      type: "template",
      id: "template-id",
    });
  });

  test("does not return the home page", () => {
    resetPageActionStores();
    const pages = createDefaultPages({
      homePageId: "home-page",
      rootInstanceId: "home-root",
    });
    const body: Instance = {
      type: "instance",
      id: "home-root",
      component: "Body",
      children: [],
    };
    $pages.set(pages);
    $instances.set(new Map([[body.id, body]]));
    selectPage("home-page");

    expect(getDeletablePageActionTarget()).toBeUndefined();
  });
});
