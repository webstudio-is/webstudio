import { afterEach, describe, expect, test, vi } from "vitest";
import { createDefaultPages } from "@webstudio-is/project-build";
import {
  blockTemplateComponent,
  type Instance,
  type PageTemplate,
} from "@webstudio-is/sdk";
import type { Project } from "@webstudio-is/project";
import {
  $allSelectedInstanceSelectors,
  $editingItemSelector,
  $editingPageId,
  $editingTemplateId,
  $folderIdToDelete,
  $builderMode,
  $pageIdToDelete,
  $selectedPageId,
  $selectedInstanceSelector,
  $templateIdToDelete,
  selectInstance,
  selectInstances,
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
import { expectSlotsShareFragment } from "~/shared/slot-test-utils";
import { __testing__, emitCommand, subscribeCommands } from "./commands";
import { $activeInspectorPanel } from "./nano-states";

const {
  canRunDesignModeCommand,
  canRunDesignOrContentModeCommand,
  guardDesignModeCommand,
  guardDesignOrContentModeCommand,
} = __testing__;

registerContainers();

afterEach(() => {
  vi.unstubAllGlobals();
});

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
  $builderMode.set("design");
};

const setupMoveInstanceProject = () => {
  resetDataStores();
  const instances = new Map<Instance["id"], Instance>([
    [
      "body",
      {
        type: "instance",
        id: "body",
        component: "Body",
        children: [
          { type: "id", value: "box" },
          { type: "id", value: "heading" },
          { type: "id", value: "paragraph" },
        ],
      },
    ],
    [
      "box",
      {
        type: "instance",
        id: "box",
        component: "Box",
        children: [{ type: "id", value: "nested" }],
      },
    ],
    [
      "nested",
      {
        type: "instance",
        id: "nested",
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
    [
      "paragraph",
      {
        type: "instance",
        id: "paragraph",
        component: "Paragraph",
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
};

describe("canRunDesignModeCommand", () => {
  test("keeps design commands design-only", () => {
    expect(canRunDesignModeCommand({ isDesignMode: true })).toBe(true);
    expect(canRunDesignModeCommand({ isDesignMode: false })).toBe(false);
  });
});

describe("canRunDesignOrContentModeCommand", () => {
  test("allows commands in design and content modes only", () => {
    expect(
      canRunDesignOrContentModeCommand({
        isContentMode: false,
        isDesignMode: true,
      })
    ).toBe(true);
    expect(
      canRunDesignOrContentModeCommand({
        isContentMode: true,
        isDesignMode: false,
      })
    ).toBe(true);
    expect(
      canRunDesignOrContentModeCommand({
        isContentMode: false,
        isDesignMode: false,
      })
    ).toBe(false);
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

describe("guardDesignOrContentModeCommand", () => {
  test("allows content mode commands without showing a message", () => {
    const messages: string[] = [];

    expect(
      guardDesignOrContentModeCommand({
        isContentMode: true,
        isDesignMode: false,
        message: "Blocked",
        toastInfo: (message) => messages.push(message),
      })
    ).toBe(true);
    expect(messages).toEqual([]);
  });

  test("blocks commands outside design and content modes", () => {
    const messages: string[] = [];

    expect(
      guardDesignOrContentModeCommand({
        isContentMode: false,
        isDesignMode: false,
        message: "Blocked",
        toastInfo: (message) => messages.push(message),
      })
    ).toBe(false);
    expect(messages).toEqual(["Blocked"]);
  });
});

describe("single-instance-only commands", () => {
  const setupMultiSelectionProject = () => {
    resetDataStores();
    const instances = new Map<Instance["id"], Instance>([
      [
        "body",
        {
          type: "instance",
          id: "body",
          component: "Body",
          children: [
            { type: "id", value: "box1" },
            { type: "id", value: "box2" },
          ],
        },
      ],
      [
        "box1",
        {
          type: "instance",
          id: "box1",
          component: "Box",
          children: [],
        },
      ],
      [
        "box2",
        {
          type: "instance",
          id: "box2",
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
    selectInstances([
      ["box1", "body"],
      ["box2", "body"],
    ]);
  };

  test("does not open settings or style source input for multi-selection", () => {
    setupMultiSelectionProject();
    $activeInspectorPanel.set("style");

    emitCommand("openSettingsPanel");
    emitCommand("focusStyleSources");

    expect($activeInspectorPanel.get()).toBe("style");
  });

  test("does not toggle visibility or edit label for multi-selection", () => {
    setupMultiSelectionProject();

    emitCommand("toggleShow");
    emitCommand("editInstanceLabel");

    expect($props.get()).toEqual(new Map());
    expect($editingItemSelector.get()).toBeUndefined();
  });
});

describe("cut", () => {
  test("cuts multiple selected sibling instances through command", async () => {
    resetDataStores();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      ...navigator,
      clipboard: { writeText },
    });
    const instances = new Map<Instance["id"], Instance>([
      [
        "body",
        {
          type: "instance",
          id: "body",
          component: "Body",
          children: [
            { type: "id", value: "box1" },
            { type: "id", value: "box2" },
          ],
        },
      ],
      [
        "box1",
        {
          type: "instance",
          id: "box1",
          component: "Box",
          children: [],
        },
      ],
      [
        "box2",
        {
          type: "instance",
          id: "box2",
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
    selectInstances([
      ["box1", "body"],
      ["box2", "body"],
    ]);

    emitCommand("cut");
    await Promise.resolve();

    expect(JSON.parse(writeText.mock.calls[0]?.[0] ?? "")).toMatchObject({
      "@webstudio/instances/v0.1": {
        rootInstanceIds: ["box1", "box2"],
      },
    });
    expect($instances.get().get("body")?.children).toEqual([]);
    expect($instances.get().has("box1")).toBe(false);
    expect($instances.get().has("box2")).toBe(false);
  });
});

describe("duplicateInstance", () => {
  test("does nothing when no page item or instance is selected", () => {
    resetDataStores();
    $project.set({ id: "project-id" } as Project);
    const instances = new Map<Instance["id"], Instance>([
      [
        "body",
        {
          type: "instance",
          id: "body",
          component: "Body",
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
    $instances.set(instances);
    selectInstance(undefined);

    emitCommand("duplicateInstance");

    expect($instances.get()).toEqual(instances);
    expect($selectedInstanceSelector.get()).toBeUndefined();
  });

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

    expectSlotsShareFragment($instances.get(), ["slot1", "slot2"]);
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

    expectSlotsShareFragment($instances.get(), ["slot1", "slot2"]);
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

    expectSlotsShareFragment($instances.get(), ["slot1", "slot2"]);
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

  test("duplicates legacy shared slot child in shared slot content", () => {
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
          children: [
            { type: "id", value: "box" },
            { type: "id", value: "heading" },
          ],
        },
      ],
      [
        "slot2",
        {
          type: "instance",
          id: "slot2",
          component: "Slot",
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
    selectInstance(["box", "slot1", "body"]);

    emitCommand("duplicateInstance");

    const fragmentId = expectSlotsShareFragment($instances.get(), [
      "slot1",
      "slot2",
    ]);
    const duplicateId = $instances.get().get(fragmentId ?? "")
      ?.children[1]?.value;
    expect($instances.get().get(fragmentId ?? "")?.children).toEqual([
      { type: "id", value: "box" },
      { type: "id", value: expect.any(String) },
      { type: "id", value: "heading" },
    ]);
    expect(duplicateId).toEqual(expect.any(String));
    expect(duplicateId).not.toBe("box");
    expect($selectedInstanceSelector.get()).toEqual([
      duplicateId,
      fragmentId,
      "slot1",
      "body",
    ]);
  });

  test("duplicates multiple selected sibling instances", () => {
    resetDataStores();
    const instances = new Map<Instance["id"], Instance>([
      [
        "body",
        {
          type: "instance",
          id: "body",
          component: "Body",
          children: [
            { type: "id", value: "box1" },
            { type: "id", value: "box2" },
          ],
        },
      ],
      [
        "box1",
        {
          type: "instance",
          id: "box1",
          component: "Box",
          children: [],
        },
      ],
      [
        "box2",
        {
          type: "instance",
          id: "box2",
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
    selectInstances([
      ["box1", "body"],
      ["box2", "body"],
    ]);

    emitCommand("duplicateInstance");

    const bodyChildren = $instances.get().get("body")?.children;
    const duplicateIds = [bodyChildren?.[1]?.value, bodyChildren?.[3]?.value];
    expect(bodyChildren).toEqual([
      { type: "id", value: "box1" },
      { type: "id", value: expect.any(String) },
      { type: "id", value: "box2" },
      { type: "id", value: expect.any(String) },
    ]);
    expect(duplicateIds[0]).not.toBe("box1");
    expect(duplicateIds[1]).not.toBe("box2");
    expect($allSelectedInstanceSelectors.get()).toEqual([
      [duplicateIds[0], "body"],
      [duplicateIds[1], "body"],
    ]);
  });

  test("duplicates multiple selected sibling instances through keyboard shortcut", () => {
    resetDataStores();
    const unsubscribe = subscribeCommands();
    const instances = new Map<Instance["id"], Instance>([
      [
        "body",
        {
          type: "instance",
          id: "body",
          component: "Body",
          children: [
            { type: "id", value: "box1" },
            { type: "id", value: "box2" },
          ],
        },
      ],
      [
        "box1",
        {
          type: "instance",
          id: "box1",
          component: "Box",
          children: [],
        },
      ],
      [
        "box2",
        {
          type: "instance",
          id: "box2",
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
    selectInstances([
      ["box1", "body"],
      ["box2", "body"],
    ]);

    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "d",
        metaKey: true,
        bubbles: true,
        cancelable: true,
      })
    );

    const bodyChildren = $instances.get().get("body")?.children;
    const duplicateIds = [bodyChildren?.[1]?.value, bodyChildren?.[3]?.value];
    expect(bodyChildren).toEqual([
      { type: "id", value: "box1" },
      { type: "id", value: expect.any(String) },
      { type: "id", value: "box2" },
      { type: "id", value: expect.any(String) },
    ]);
    expect(duplicateIds[0]).not.toBe("box1");
    expect(duplicateIds[1]).not.toBe("box2");
    unsubscribe();
  });

  test("duplicates only detachable roots when multi-selection includes non-detachable roots", () => {
    resetDataStores();
    const instances = new Map<Instance["id"], Instance>([
      [
        "body",
        {
          type: "instance",
          id: "body",
          component: "Body",
          children: [
            { type: "id", value: "template" },
            { type: "id", value: "box" },
          ],
        },
      ],
      [
        "template",
        {
          type: "instance",
          id: "template",
          component: blockTemplateComponent,
          children: [],
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
    selectInstances([
      ["template", "body"],
      ["box", "body"],
    ]);

    emitCommand("duplicateInstance");

    const bodyChildren = $instances.get().get("body")?.children;
    const duplicateId = bodyChildren?.[2]?.value;
    expect(bodyChildren).toEqual([
      { type: "id", value: "template" },
      { type: "id", value: "box" },
      { type: "id", value: expect.any(String) },
    ]);
    expect(duplicateId).not.toBe("template");
    expect(duplicateId).not.toBe("box");
    expect($instances.get().get("template")).toEqual(instances.get("template"));
    expect($selectedInstanceSelector.get()).toEqual([duplicateId, "body"]);
  });

  test("does not duplicate when no multi-selected root is detachable", () => {
    resetDataStores();
    const instances = new Map<Instance["id"], Instance>([
      [
        "body",
        {
          type: "instance",
          id: "body",
          component: "Body",
          children: [
            { type: "id", value: "template1" },
            { type: "id", value: "template2" },
          ],
        },
      ],
      [
        "template1",
        {
          type: "instance",
          id: "template1",
          component: blockTemplateComponent,
          children: [],
        },
      ],
      [
        "template2",
        {
          type: "instance",
          id: "template2",
          component: blockTemplateComponent,
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
    selectInstances([
      ["template1", "body"],
      ["template2", "body"],
    ]);

    emitCommand("duplicateInstance");

    expect($instances.get()).toEqual(instances);
    expect($allSelectedInstanceSelectors.get()).toEqual([
      ["template1", "body"],
      ["template2", "body"],
    ]);
  });
});

describe("deleteInstanceBuilder", () => {
  test("does nothing when no page item or instance is selected", () => {
    resetDataStores();
    const instances = new Map<Instance["id"], Instance>([
      [
        "body",
        {
          type: "instance",
          id: "body",
          component: "Body",
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
    $instances.set(instances);
    selectInstance(undefined);

    emitCommand("deleteInstanceBuilder");

    expect($instances.get()).toEqual(instances);
    expect($selectedInstanceSelector.get()).toBeUndefined();
  });

  test("deletes multiple selected sibling instances", () => {
    resetDataStores();
    const instances = new Map<Instance["id"], Instance>([
      [
        "body",
        {
          type: "instance",
          id: "body",
          component: "Body",
          children: [
            { type: "id", value: "box1" },
            { type: "id", value: "box2" },
          ],
        },
      ],
      [
        "box1",
        {
          type: "instance",
          id: "box1",
          component: "Box",
          children: [],
        },
      ],
      [
        "box2",
        {
          type: "instance",
          id: "box2",
          component: "Box",
          children: [],
        },
      ],
    ]);
    $instances.set(instances);
    selectInstances([
      ["box1", "body"],
      ["box2", "body"],
    ]);

    emitCommand("deleteInstanceBuilder");

    expect($instances.get().get("body")?.children).toEqual([]);
    expect($instances.get().has("box1")).toBe(false);
    expect($instances.get().has("box2")).toBe(false);
    expect($allSelectedInstanceSelectors.get()).toEqual([]);
  });

  test("deletes only detachable roots when multi-selection includes non-detachable roots", () => {
    resetDataStores();
    const instances = new Map<Instance["id"], Instance>([
      [
        "body",
        {
          type: "instance",
          id: "body",
          component: "Body",
          children: [
            { type: "id", value: "template" },
            { type: "id", value: "box" },
          ],
        },
      ],
      [
        "template",
        {
          type: "instance",
          id: "template",
          component: blockTemplateComponent,
          children: [],
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
    $instances.set(instances);
    selectInstances([
      ["template", "body"],
      ["box", "body"],
    ]);

    emitCommand("deleteInstanceBuilder");

    expect($instances.get().get("body")?.children).toEqual([
      { type: "id", value: "template" },
    ]);
    expect($instances.get().has("template")).toBe(true);
    expect($instances.get().has("box")).toBe(false);
    expect($allSelectedInstanceSelectors.get()).toEqual([]);
  });

  test("does not delete when no multi-selected root is detachable", () => {
    resetDataStores();
    const instances = new Map<Instance["id"], Instance>([
      [
        "body",
        {
          type: "instance",
          id: "body",
          component: "Body",
          children: [
            { type: "id", value: "template1" },
            { type: "id", value: "template2" },
          ],
        },
      ],
      [
        "template1",
        {
          type: "instance",
          id: "template1",
          component: blockTemplateComponent,
          children: [],
        },
      ],
      [
        "template2",
        {
          type: "instance",
          id: "template2",
          component: blockTemplateComponent,
          children: [],
        },
      ],
    ]);
    $instances.set(instances);
    selectInstances([
      ["template1", "body"],
      ["template2", "body"],
    ]);

    emitCommand("deleteInstanceBuilder");

    expect($instances.get()).toEqual(instances);
    expect($allSelectedInstanceSelectors.get()).toEqual([
      ["template1", "body"],
      ["template2", "body"],
    ]);
  });
});

describe("move instance commands", () => {
  test("extends instance selection with shift arrows when navigator is not focused", () => {
    setupMoveInstanceProject();
    const unsubscribe = subscribeCommands();
    selectInstance(["box", "body"]);

    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "ArrowDown",
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      })
    );
    expect($allSelectedInstanceSelectors.get()).toEqual([
      ["box", "body"],
      ["heading", "body"],
    ]);

    document.body.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "ArrowDown",
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      })
    );
    expect($allSelectedInstanceSelectors.get()).toEqual([
      ["box", "body"],
      ["heading", "body"],
      ["paragraph", "body"],
    ]);

    unsubscribe();
  });

  test("selects all siblings with command-a when navigator is not focused", () => {
    setupMoveInstanceProject();
    const unsubscribe = subscribeCommands();
    selectInstance(["heading", "body"]);

    document.body.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "a",
        metaKey: true,
        bubbles: true,
        cancelable: true,
      })
    );

    expect($allSelectedInstanceSelectors.get()).toEqual([
      ["box", "body"],
      ["heading", "body"],
      ["paragraph", "body"],
    ]);
    unsubscribe();
  });

  test("moves the selected instance above the previous sibling", () => {
    setupMoveInstanceProject();
    selectInstance(["heading", "body"]);

    emitCommand("moveInstanceUp");

    expect($instances.get().get("body")?.children).toEqual([
      { type: "id", value: "heading" },
      { type: "id", value: "box" },
      { type: "id", value: "paragraph" },
    ]);
  });

  test("moves the first child above its parent", () => {
    setupMoveInstanceProject();
    selectInstance(["nested", "box", "body"]);

    emitCommand("moveInstanceUp");

    expect($instances.get().get("body")?.children).toEqual([
      { type: "id", value: "nested" },
      { type: "id", value: "box" },
      { type: "id", value: "heading" },
      { type: "id", value: "paragraph" },
    ]);
    expect($instances.get().get("box")?.children).toEqual([]);
  });

  test("moves the selected instance below the next sibling", () => {
    setupMoveInstanceProject();
    selectInstance(["heading", "body"]);

    emitCommand("moveInstanceDown");

    expect($instances.get().get("body")?.children).toEqual([
      { type: "id", value: "box" },
      { type: "id", value: "paragraph" },
      { type: "id", value: "heading" },
    ]);
  });

  test("moves the last child below its parent", () => {
    setupMoveInstanceProject();
    selectInstance(["nested", "box", "body"]);

    emitCommand("moveInstanceDown");

    expect($instances.get().get("body")?.children).toEqual([
      { type: "id", value: "box" },
      { type: "id", value: "nested" },
      { type: "id", value: "heading" },
      { type: "id", value: "paragraph" },
    ]);
    expect($instances.get().get("box")?.children).toEqual([]);
  });

  test("moves the selected instance into the previous sibling", () => {
    setupMoveInstanceProject();
    selectInstance(["heading", "body"]);

    emitCommand("moveInstanceIntoPreviousSibling");

    expect($instances.get().get("body")?.children).toEqual([
      { type: "id", value: "box" },
      { type: "id", value: "paragraph" },
    ]);
    expect($instances.get().get("box")?.children).toEqual([
      { type: "id", value: "nested" },
      { type: "id", value: "heading" },
    ]);
  });

  test("moves a middle child out after its parent", () => {
    resetDataStores();
    const instances = new Map<Instance["id"], Instance>([
      [
        "body",
        {
          type: "instance",
          id: "body",
          component: "Body",
          children: [
            { type: "id", value: "box" },
            { type: "id", value: "paragraph" },
          ],
        },
      ],
      [
        "box",
        {
          type: "instance",
          id: "box",
          component: "Box",
          children: [
            { type: "id", value: "nested" },
            { type: "id", value: "middle" },
            { type: "id", value: "heading" },
          ],
        },
      ],
      [
        "nested",
        {
          type: "instance",
          id: "nested",
          component: "Box",
          children: [],
        },
      ],
      [
        "middle",
        {
          type: "instance",
          id: "middle",
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
      [
        "paragraph",
        {
          type: "instance",
          id: "paragraph",
          component: "Paragraph",
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
    selectInstance(["middle", "box", "body"]);

    emitCommand("moveInstanceOut");

    expect($instances.get().get("body")?.children).toEqual([
      { type: "id", value: "box" },
      { type: "id", value: "middle" },
      { type: "id", value: "paragraph" },
    ]);
    expect($instances.get().get("box")?.children).toEqual([
      { type: "id", value: "nested" },
      { type: "id", value: "heading" },
    ]);
  });

  test("moves the first child out above its parent", () => {
    resetDataStores();
    const instances = new Map<Instance["id"], Instance>([
      [
        "body",
        {
          type: "instance",
          id: "body",
          component: "Body",
          children: [
            { type: "id", value: "box" },
            { type: "id", value: "paragraph" },
          ],
        },
      ],
      [
        "box",
        {
          type: "instance",
          id: "box",
          component: "Box",
          children: [
            { type: "id", value: "nested" },
            { type: "id", value: "heading" },
          ],
        },
      ],
      [
        "nested",
        {
          type: "instance",
          id: "nested",
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
      [
        "paragraph",
        {
          type: "instance",
          id: "paragraph",
          component: "Paragraph",
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
    selectInstance(["nested", "box", "body"]);

    emitCommand("moveInstanceOut");

    expect($instances.get().get("body")?.children).toEqual([
      { type: "id", value: "nested" },
      { type: "id", value: "box" },
      { type: "id", value: "paragraph" },
    ]);
    expect($instances.get().get("box")?.children).toEqual([
      { type: "id", value: "heading" },
    ]);
  });

  test("moves the last child out below its parent", () => {
    resetDataStores();
    const instances = new Map<Instance["id"], Instance>([
      [
        "body",
        {
          type: "instance",
          id: "body",
          component: "Body",
          children: [
            { type: "id", value: "box" },
            { type: "id", value: "paragraph" },
          ],
        },
      ],
      [
        "box",
        {
          type: "instance",
          id: "box",
          component: "Box",
          children: [
            { type: "id", value: "nested" },
            { type: "id", value: "heading" },
          ],
        },
      ],
      [
        "nested",
        {
          type: "instance",
          id: "nested",
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
      [
        "paragraph",
        {
          type: "instance",
          id: "paragraph",
          component: "Paragraph",
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
    selectInstance(["heading", "box", "body"]);

    emitCommand("moveInstanceOut");

    expect($instances.get().get("body")?.children).toEqual([
      { type: "id", value: "box" },
      { type: "id", value: "heading" },
      { type: "id", value: "paragraph" },
    ]);
    expect($instances.get().get("box")?.children).toEqual([
      { type: "id", value: "nested" },
    ]);
  });

  test("moves a shared slot child into the previous sibling in every slot occurrence", () => {
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
    selectInstance(["heading", "fragment", "slot1", "body"]);

    emitCommand("moveInstanceIntoPreviousSibling");

    expectSlotsShareFragment($instances.get(), ["slot1", "slot2"]);
    expect($instances.get().get("fragment")?.children).toEqual([
      { type: "id", value: "box" },
    ]);
    expect($instances.get().get("box")?.children).toEqual([
      { type: "id", value: "heading" },
    ]);
  });

  test("moves a direct shared slot child out of all slot occurrences", () => {
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
    selectInstance(["heading", "fragment", "slot1", "body"]);

    emitCommand("moveInstanceOut");

    const fragmentId = expectSlotsShareFragment($instances.get(), [
      "slot1",
      "slot2",
    ]);
    const bodyChildren = $instances.get().get("body")?.children;
    const movedHeadingId = bodyChildren?.[1]?.value;
    expect(bodyChildren).toEqual([
      { type: "id", value: "slot1" },
      { type: "id", value: "heading" },
      { type: "id", value: "slot2" },
    ]);
    expect(movedHeadingId).toBe("heading");
    expect($instances.get().get(fragmentId ?? "")?.children).toEqual([
      { type: "id", value: "box" },
    ]);
  });

  test("moves the first direct shared slot child out of all slot occurrences above the slot", () => {
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

    emitCommand("moveInstanceOut");

    const fragmentId = expectSlotsShareFragment($instances.get(), [
      "slot1",
      "slot2",
    ]);
    const bodyChildren = $instances.get().get("body")?.children;
    const movedBoxId = bodyChildren?.[0]?.value;
    expect(bodyChildren).toEqual([
      { type: "id", value: "box" },
      { type: "id", value: "slot1" },
      { type: "id", value: "slot2" },
    ]);
    expect(movedBoxId).toBe("box");
    expect($instances.get().get(movedBoxId ?? "")?.component).toBe("Box");
    expect($instances.get().get(fragmentId ?? "")?.children).toEqual([
      { type: "id", value: "heading" },
    ]);
  });

  test("moves the first direct shared slot child above all slot occurrences", () => {
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

    emitCommand("moveInstanceUp");

    const fragmentId = expectSlotsShareFragment($instances.get(), [
      "slot1",
      "slot2",
    ]);
    const bodyChildren = $instances.get().get("body")?.children;
    const movedBoxId = bodyChildren?.[0]?.value;
    expect(bodyChildren).toEqual([
      { type: "id", value: "box" },
      { type: "id", value: "slot1" },
      { type: "id", value: "slot2" },
    ]);
    expect(movedBoxId).toBe("box");
    expect($instances.get().get(movedBoxId ?? "")?.component).toBe("Box");
    expect($instances.get().get(fragmentId ?? "")?.children).toEqual([
      { type: "id", value: "heading" },
    ]);
  });

  test("moves the last direct shared slot child below all slot occurrences", () => {
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
    selectInstance(["heading", "fragment", "slot1", "body"]);

    emitCommand("moveInstanceDown");

    const fragmentId = expectSlotsShareFragment($instances.get(), [
      "slot1",
      "slot2",
    ]);
    const bodyChildren = $instances.get().get("body")?.children;
    const movedHeadingId = bodyChildren?.[1]?.value;
    expect(bodyChildren).toEqual([
      { type: "id", value: "slot1" },
      { type: "id", value: "heading" },
      { type: "id", value: "slot2" },
    ]);
    expect(movedHeadingId).toBe("heading");
    expect($instances.get().get(movedHeadingId ?? "")?.component).toBe(
      "Heading"
    );
    expect($instances.get().get(fragmentId ?? "")?.children).toEqual([
      { type: "id", value: "box" },
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
