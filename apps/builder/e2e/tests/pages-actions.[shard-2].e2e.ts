import type { Page } from "playwright";
import {
  openProjectBuilder,
  waitForCanvasText,
  waitForCanvasTextHidden,
} from "../flows/builder";
import { selectCanvasTextInstance } from "../flows/canvas-selection";
import { openNavigatorPanel } from "../flows/navigator";
import { openPage } from "../flows/pages-panel";
import {
  waitForChangeToBeSaved,
  waitForSyncStatus,
} from "../flows/sync-status";
import { createContentModeProject } from "../fixtures/content-mode-suite";
import type { SeededContentModeProject } from "../fixtures/content-mode-project";
import { newIsolatedPage, test } from "../harness";
import { measure } from "../perf";
import { loadDevBuild } from "../db";

let fixture: SeededContentModeProject;
let navigatorStructuralFixture: SeededContentModeProject;

type BuildInstanceChild = {
  type: string;
  value?: string;
};

type BuildInstance = {
  id: string;
  component?: string;
  tag?: string;
  label?: string;
  children?: BuildInstanceChild[];
};

const fragmentArrays = {
  assets: [],
  dataSources: [],
  resources: [],
  props: [],
  breakpoints: [],
  styleSourceSelections: [],
  styleSources: [],
  styles: [],
};

const createInstanceTransfer = ({ id, text }: { id: string; text: string }) =>
  JSON.stringify({
    "@webstudio/instance/v0.1": {
      instanceSelector: [id, "source-body"],
      children: [{ type: "id", value: id }],
      instances: [
        {
          type: "instance",
          id,
          component: "ws:element",
          tag: "p",
          children: [{ type: "text", value: text }],
        },
      ],
      ...fragmentArrays,
    },
  });

const loadBuildInstances = async (fixture: SeededContentModeProject) => {
  const build = await loadDevBuild({ projectId: fixture.projectId });
  return JSON.parse(build.instances) as BuildInstance[];
};

const createBuildInspector = (instances: BuildInstance[]) => {
  const instancesById = new Map(
    instances.map((instance) => [instance.id, instance])
  );
  const parentByChildId = new Map<string, string>();

  for (const instance of instances) {
    for (const child of instance.children ?? []) {
      if (child.type === "id" && child.value !== undefined) {
        parentByChildId.set(child.value, instance.id);
      }
    }
  }

  const instanceContainsText = (instanceId: string, text: string): boolean => {
    const instance = instancesById.get(instanceId);
    if (instance === undefined) {
      return false;
    }
    return (
      instance.children?.some((child) => {
        if (child.type === "text") {
          return child.value?.includes(text);
        }
        if (child.type === "id" && child.value !== undefined) {
          return instanceContainsText(child.value, text);
        }
        return false;
      }) ?? false
    );
  };

  const collectText = (instanceId: string): string => {
    const instance = instancesById.get(instanceId);
    if (instance === undefined) {
      return "";
    }
    return (instance.children ?? [])
      .map((child) => {
        if (child.type === "text") {
          return child.value ?? "";
        }
        if (child.type === "id" && child.value !== undefined) {
          return collectText(child.value);
        }
        return "";
      })
      .join(" ");
  };

  return {
    countComponent: (component: string) =>
      instances.filter((instance) => instance.component === component).length,
    countElementTag: (tag: string) =>
      instances.filter(
        (instance) =>
          instance.component === "ws:element" && instance.tag === tag
      ).length,
    countElementTagWithText: ({ tag, text }: { tag: string; text: string }) =>
      instances.filter(
        (instance) =>
          instance.component === "ws:element" &&
          instance.tag === tag &&
          instanceContainsText(instance.id, text)
      ).length,
    countInstancesWithText: (text: string) =>
      instances.filter((instance) => instanceContainsText(instance.id, text))
        .length,
    countExactTextChildren: (text: string) =>
      instances.reduce((count, instance) => {
        return (
          count +
          (instance.children?.filter(
            (child) => child.type === "text" && child.value === text
          ).length ?? 0)
        );
      }, 0),
    getElementWithTextParentTag: ({
      tag,
      text,
    }: {
      tag: string;
      text: string;
    }) => {
      const instance = instances.find(
        (instance) =>
          instance.component === "ws:element" &&
          instance.tag === tag &&
          instanceContainsText(instance.id, text)
      );
      const parentId =
        instance === undefined ? undefined : parentByChildId.get(instance.id);
      return parentId === undefined
        ? undefined
        : instancesById.get(parentId)?.tag;
    },
    getDirectChildTextOrder: ({
      parentTag,
      texts,
    }: {
      parentTag: string;
      texts: string[];
    }) => {
      const parent = instances.find(
        (instance) =>
          instance.component === "ws:element" && instance.tag === parentTag
      );
      if (parent === undefined) {
        return [];
      }
      return (parent.children ?? [])
        .flatMap((child, index) => {
          if (child.type !== "id" || child.value === undefined) {
            return [];
          }
          const content = collectText(child.value);
          return texts
            .filter((text) => content.includes(text))
            .map((text) => ({ text, index }));
        })
        .sort((left, right) => left.index - right.index)
        .map(({ text }) => text);
    },
    countLabel: (label: string) =>
      instances.filter((instance) => instance.label === label).length,
  };
};

const inspectBuild = async (fixture: SeededContentModeProject) =>
  createBuildInspector(await loadBuildInstances(fixture));

const getInstanceComponentCount = async ({
  fixture,
  component,
}: {
  fixture: SeededContentModeProject;
  component: string;
}) => {
  return (await inspectBuild(fixture)).countComponent(component);
};

const getElementTagCount = async ({
  fixture,
  tag,
}: {
  fixture: SeededContentModeProject;
  tag: string;
}) => {
  return (await inspectBuild(fixture)).countElementTag(tag);
};

const getElementTagWithTextCount = async ({
  fixture,
  tag,
  text,
}: {
  fixture: SeededContentModeProject;
  tag: string;
  text: string;
}) => {
  return (await inspectBuild(fixture)).countElementTagWithText({ tag, text });
};

const getExactTextChildCount = async ({
  fixture,
  text,
}: {
  fixture: SeededContentModeProject;
  text: string;
}) => {
  return (await inspectBuild(fixture)).countExactTextChildren(text);
};

const getElementWithTextParentTag = async ({
  fixture,
  tag,
  text,
}: {
  fixture: SeededContentModeProject;
  tag: string;
  text: string;
}) => {
  return (await inspectBuild(fixture)).getElementWithTextParentTag({
    tag,
    text,
  });
};

const getDirectChildTextOrder = async ({
  fixture,
  parentTag,
  texts,
}: {
  fixture: SeededContentModeProject;
  parentTag: string;
  texts: string[];
}) => {
  return (await inspectBuild(fixture)).getDirectChildTextOrder({
    parentTag,
    texts,
  });
};

const getInstanceLabelCount = async ({
  fixture,
  label,
}: {
  fixture: SeededContentModeProject;
  label: string;
}) => {
  return (await inspectBuild(fixture)).countLabel(label);
};

const pastePlainTextFromClipboardShortcut = async ({
  page,
  text,
}: {
  page: Page;
  text: string;
}) => {
  await page.evaluate(async (text) => {
    await navigator.clipboard.writeText(text);
  }, text);
  const save = waitForChangeToBeSaved({ page });
  await page.keyboard.press("ControlOrMeta+V");
  await save;
  await waitForSyncStatus({ page, status: "idle" });
};

const pasteFromClipboardShortcut = async ({ page }: { page: Page }) => {
  const save = waitForChangeToBeSaved({ page }).catch(() => undefined);
  await page.keyboard.press("ControlOrMeta+V");
  await save;
  await waitForSyncStatus({ page, status: "idle" });
};

const cutSelectedInstanceShortcut = async ({ page }: { page: Page }) => {
  const save = waitForChangeToBeSaved({ page });
  await page.keyboard.press("ControlOrMeta+X");
  await save;
  await waitForSyncStatus({ page, status: "idle" });
};

const pasteTextFromClipboardShortcutWithoutSave = async ({
  page,
  text,
}: {
  page: Page;
  text: string;
}) => {
  await page.evaluate(async (text) => {
    await navigator.clipboard.writeText(text);
  }, text);
  await page.keyboard.press("ControlOrMeta+V");
  await waitForSyncStatus({ page, status: "idle" });
};

const waitForClipboardTextIncludes = async ({
  page,
  text,
}: {
  page: Page;
  text: string;
}) => {
  await page.waitForFunction(async (text) => {
    try {
      return (await navigator.clipboard.readText()).includes(text as string);
    } catch {
      return false;
    }
  }, text);
};

const pasteClipboardData = async ({
  page,
  data,
  waitForSave = true,
}: {
  page: Page;
  data: Record<string, string>;
  waitForSave?: boolean;
}) => {
  const save = waitForSave ? waitForChangeToBeSaved({ page }) : undefined;
  await page.evaluate((data) => {
    const clipboardData = new DataTransfer();
    for (const [mimeType, value] of Object.entries(data)) {
      clipboardData.setData(mimeType, value);
    }
    document.dispatchEvent(
      new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData,
      })
    );
  }, data);
  await save;
  await waitForSyncStatus({ page, status: "idle" });
};

const moveSelectedNavigatorInstance = async ({
  page,
  shortcut,
}: {
  page: Page;
  shortcut: "Control+ArrowLeft" | "Control+ArrowRight" | "Control+ArrowUp";
}) => {
  const save = waitForChangeToBeSaved({ page });
  await page.keyboard.press(shortcut);
  await save;
  await waitForSyncStatus({ page, status: "idle" });
};

const openComponentsPanel = async ({ page }: { page: Page }) => {
  await page.getByRole("tab", { name: "Components" }).click();
  await page.getByPlaceholder("Find components").waitFor();
};

const searchComponentsPanel = async ({
  page,
  text,
}: {
  page: Page;
  text: string;
}) => {
  const search = page.getByPlaceholder("Find components");
  await search.fill(text);
};

const insertComponentPanelOption = async ({
  page,
  name,
}: {
  page: Page;
  name: string;
}) => {
  await searchComponentsPanel({ page, text: name });
  await page.getByRole("option", { name, exact: true }).click();
  await waitForSyncStatus({ page, status: "idle" });
};

const openCommandPanel = async ({ page }: { page: Page }) => {
  await page.keyboard.press("ControlOrMeta+K");
  await page
    .getByPlaceholder("Type a command or search...", { exact: true })
    .waitFor();
};

const selectCommandPanelItem = async ({
  page,
  text,
}: {
  page: Page;
  text: string;
}) => {
  const item = page.locator("[cmdk-item]").filter({ hasText: text }).first();
  await item.waitFor({ state: "visible" });
  await item.dblclick();
};

const runCommandPanelStructuralAction = async ({
  page,
  command,
  option,
}: {
  page: Page;
  command: "Wrap" | "Convert" | "Unwrap";
  option?: string;
}) => {
  await openCommandPanel({ page });
  const commandInput = page.getByPlaceholder("Type a command or search...", {
    exact: true,
  });
  await commandInput.fill(command);
  await selectCommandPanelItem({ page, text: command });
  if (option === undefined) {
    await waitForChangeToBeSaved({ page });
    return;
  }

  const optionInput = page
    .getByPlaceholder(
      command === "Wrap"
        ? "Search components to wrap with..."
        : "Search components to convert...",
      { exact: true }
    )
    .first();
  await optionInput.waitFor();
  await optionInput.fill(option);
  await selectCommandPanelItem({ page, text: option });
  await waitForChangeToBeSaved({ page });
};

const runCommandPanelTagInsertion = async ({
  page,
  tag,
}: {
  page: Page;
  tag: string;
}) => {
  await openCommandPanel({ page });
  const commandInput = page.getByPlaceholder("Type a command or search...", {
    exact: true,
  });
  await commandInput.fill(tag);
  await selectCommandPanelItem({ page, text: `<${tag}>` });
  await waitForChangeToBeSaved({ page });
};

const selectCommandPanelInstance = async ({
  page,
  label,
}: {
  page: Page;
  label: string;
}) => {
  await openCommandPanel({ page });
  const commandInput = page.getByPlaceholder("Type a command or search...", {
    exact: true,
  });
  await commandInput.fill(label);
  await selectCommandPanelItem({ page, text: label });
};

const selectNavigatorItem = async ({
  page,
  itemName,
}: {
  page: Page;
  itemName: string;
}) => {
  const item = page
    .locator("[data-navigator-tree] [data-tree-button]")
    .filter({ hasText: itemName })
    .last();
  await item.waitFor({ state: "visible" });
  await item.click();
  await item.click();
};

const selectBodyInNavigator = async ({ page }: { page: Page }) => {
  await openNavigatorPanel({ page });
  await selectNavigatorItem({ page, itemName: "Body" });
};

const editSelectedNavigatorLabel = async ({
  page,
  label,
}: {
  page: Page;
  label: string;
}) => {
  await page.keyboard.press("ControlOrMeta+E");
  const editableLabel = page.locator('[contenteditable="plaintext-only"]');
  await editableLabel.waitFor({ state: "visible" });
  await editableLabel.fill(label);
  await editableLabel.press("Enter");
  await waitForChangeToBeSaved({ page });
};

test.beforeAll(async () => {
  fixture = await createContentModeProject({
    email: "pages-actions-e2e@webstudio.test",
    title: "Pages Actions E2E",
    assetNamePrefix: "pages-actions-",
    editorToken: "pages-actions-e2e-editor-token",
    builderToken: "pages-actions-e2e-builder-token",
  });
  navigatorStructuralFixture = await createContentModeProject({
    email: "pages-actions-navigator-structural-e2e@webstudio.test",
    title: "Pages Actions Navigator Structural E2E",
    assetNamePrefix: "pages-actions-navigator-structural-",
    editorToken: "pages-actions-navigator-structural-e2e-editor-token",
    builderToken: "pages-actions-navigator-structural-e2e-builder-token",
  });
});

test("Builder Navigator keyboard move, reparent, and reorder persist after reload", async () => {
  const { page, close } = await newIsolatedPage();
  const sectionText = "Navigator move section";
  const asideText = "Navigator move aside";
  const html = `
    <section>
      <h2>${sectionText}</h2>
    </section>
    <aside>
      <p>${asideText}</p>
    </aside>
  `;

  try {
    await measure(
      "pages actions open builder for navigator keyboard moves",
      async () => {
        await openProjectBuilder({
          page,
          projectId: navigatorStructuralFixture.projectId,
          authToken: navigatorStructuralFixture.builderToken,
        });
      }
    );
    await waitForCanvasText({ page, text: "Initial content" });

    await measure("pages actions paste navigator move siblings", async () => {
      await openNavigatorPanel({ page });
      await selectNavigatorItem({ page, itemName: "Body" });
      await pastePlainTextFromClipboardShortcut({ page, text: html });
    });
    await waitForCanvasText({ page, text: sectionText });
    await waitForCanvasText({ page, text: asideText });

    await measure(
      "pages actions move navigator item into previous sibling",
      async () => {
        await openNavigatorPanel({ page });
        await selectNavigatorItem({ page, itemName: "aside" });
        await moveSelectedNavigatorInstance({
          page,
          shortcut: "Control+ArrowRight",
        });
      }
    );
    const reparentedParentTag = await getElementWithTextParentTag({
      fixture: navigatorStructuralFixture,
      tag: "aside",
      text: asideText,
    });
    if (reparentedParentTag !== "section") {
      throw new Error(
        `Expected Navigator move-in to reparent aside into section, found parent ${reparentedParentTag}`
      );
    }

    await measure("pages actions move navigator item back out", async () => {
      await openNavigatorPanel({ page });
      await selectNavigatorItem({ page, itemName: "aside" });
      await moveSelectedNavigatorInstance({
        page,
        shortcut: "Control+ArrowLeft",
      });
    });
    const outdentedParentTag = await getElementWithTextParentTag({
      fixture: navigatorStructuralFixture,
      tag: "aside",
      text: asideText,
    });
    if (outdentedParentTag !== "body") {
      throw new Error(
        `Expected Navigator move-out to reparent aside back to body, found parent ${outdentedParentTag}`
      );
    }

    await measure(
      "pages actions reorder navigator item above previous sibling",
      async () => {
        await openNavigatorPanel({ page });
        await selectNavigatorItem({ page, itemName: "aside" });
        await moveSelectedNavigatorInstance({
          page,
          shortcut: "Control+ArrowUp",
        });
      }
    );
    const reorderedTextOrder = await getDirectChildTextOrder({
      fixture: navigatorStructuralFixture,
      parentTag: "body",
      texts: [sectionText, asideText],
    });
    if (reorderedTextOrder.join("|") !== `${asideText}|${sectionText}`) {
      throw new Error(
        `Expected Navigator move-up to place aside before section, found order ${reorderedTextOrder.join(" -> ")}`
      );
    }

    await measure("pages actions reload navigator keyboard moves", async () => {
      await openProjectBuilder({
        page,
        projectId: navigatorStructuralFixture.projectId,
        authToken: navigatorStructuralFixture.builderToken,
      });
    });
    await waitForCanvasText({ page, text: sectionText });
    await waitForCanvasText({ page, text: asideText });
    const reloadedParentTag = await getElementWithTextParentTag({
      fixture: navigatorStructuralFixture,
      tag: "aside",
      text: asideText,
    });
    const reloadedTextOrder = await getDirectChildTextOrder({
      fixture: navigatorStructuralFixture,
      parentTag: "body",
      texts: [sectionText, asideText],
    });
    if (reloadedParentTag !== "body") {
      throw new Error(
        `Expected reload to preserve moved aside under body, found parent ${reloadedParentTag}`
      );
    }
    if (reloadedTextOrder.join("|") !== `${asideText}|${sectionText}`) {
      throw new Error(
        `Expected reload to preserve Navigator reorder, found order ${reloadedTextOrder.join(" -> ")}`
      );
    }
  } finally {
    await close();
  }
});

test("Builder command panel structural mutations persist after reload", async () => {
  const { page, close } = await newIsolatedPage();
  const anchorText = "Initial content";
  const componentName = "Image";

  try {
    await measure(
      "pages actions open builder for command structural actions",
      async () => {
        await openProjectBuilder({
          page,
          projectId: fixture.projectId,
          authToken: fixture.builderToken,
        });
      }
    );
    await waitForCanvasText({ page, text: anchorText });
    await selectCanvasTextInstance({ page, text: anchorText });

    await measure(
      "pages actions insert component before structural actions",
      async () => {
        await openComponentsPanel({ page });
        await insertComponentPanelOption({ page, name: componentName });
      }
    );
    const insertedImageCount = await getInstanceComponentCount({
      fixture,
      component: componentName,
    });

    const initialDivCount = await getElementTagCount({
      fixture,
      tag: "div",
    });
    const initialSectionCount = await getElementTagCount({
      fixture,
      tag: "section",
    });

    await measure(
      "pages actions wrap selected instance from command panel",
      async () => {
        await runCommandPanelStructuralAction({
          page,
          command: "Wrap",
          option: "div",
        });
      }
    );
    const wrappedDivCount = await getElementTagCount({
      fixture,
      tag: "div",
    });
    if (wrappedDivCount !== initialDivCount + 1) {
      throw new Error(
        `Expected command panel Wrap to add one div. Before ${initialDivCount}, after ${wrappedDivCount}`
      );
    }
    await openNavigatorPanel({ page });
    await selectNavigatorItem({ page, itemName: "div" });

    await measure(
      "pages actions convert wrapper from command panel",
      async () => {
        await runCommandPanelStructuralAction({
          page,
          command: "Convert",
          option: "section",
        });
      }
    );
    const convertedDivCount = await getElementTagCount({
      fixture,
      tag: "div",
    });
    const convertedSectionCount = await getElementTagCount({
      fixture,
      tag: "section",
    });
    if (convertedDivCount !== initialDivCount) {
      throw new Error(
        `Expected command panel Convert to replace the wrapper div. Before ${initialDivCount}, after ${convertedDivCount}`
      );
    }
    if (convertedSectionCount !== initialSectionCount + 1) {
      throw new Error(
        `Expected command panel Convert to add one section. Before ${initialSectionCount}, after ${convertedSectionCount}`
      );
    }
    await measure(
      "pages actions reload command structural actions",
      async () => {
        await openProjectBuilder({
          page,
          projectId: fixture.projectId,
          authToken: fixture.builderToken,
        });
      }
    );
    await waitForCanvasText({ page, text: anchorText });
    const reloadedSectionCount = await getElementTagCount({
      fixture,
      tag: "section",
    });
    const reloadedImageCount = await getInstanceComponentCount({
      fixture,
      component: componentName,
    });
    if (reloadedSectionCount !== initialSectionCount + 1) {
      throw new Error(
        `Expected reload to preserve command panel converted section wrapper. Before ${initialSectionCount}, after ${reloadedSectionCount}`
      );
    }
    if (reloadedImageCount !== insertedImageCount) {
      throw new Error(
        `Expected reload to preserve command panel target ${componentName}. Before ${insertedImageCount}, after ${reloadedImageCount}`
      );
    }
  } finally {
    await close();
  }
});

test("Builder Navigator label and command unwrap persist after reload", async () => {
  const { page, close } = await newIsolatedPage();
  const anchorText = "Initial content";
  const componentName = "Image";
  const renamedLabel = "Hero media";

  try {
    await measure(
      "pages actions open builder for label and unwrap",
      async () => {
        await openProjectBuilder({
          page,
          projectId: fixture.projectId,
          authToken: fixture.builderToken,
        });
      }
    );
    await waitForCanvasText({ page, text: anchorText });
    await selectCanvasTextInstance({ page, text: anchorText });

    await measure(
      "pages actions insert component before label and unwrap",
      async () => {
        await openComponentsPanel({ page });
        await insertComponentPanelOption({ page, name: componentName });
      }
    );
    const insertedImageCount = await getInstanceComponentCount({
      fixture,
      component: componentName,
    });
    const initialDivCount = await getElementTagCount({
      fixture,
      tag: "div",
    });

    await measure("pages actions edit navigator label", async () => {
      await openNavigatorPanel({ page });
      await selectNavigatorItem({ page, itemName: componentName });
      await editSelectedNavigatorLabel({ page, label: renamedLabel });
    });
    const renamedCount = await getInstanceLabelCount({
      fixture,
      label: renamedLabel,
    });
    if (renamedCount !== 1) {
      throw new Error(
        `Expected one Navigator label "${renamedLabel}" after rename, found ${renamedCount}`
      );
    }

    await measure(
      "pages actions wrap renamed component before unwrap",
      async () => {
        await runCommandPanelStructuralAction({
          page,
          command: "Wrap",
          option: "div",
        });
      }
    );
    const wrappedDivCount = await getElementTagCount({
      fixture,
      tag: "div",
    });
    if (wrappedDivCount !== initialDivCount + 1) {
      throw new Error(
        `Expected wrap before unwrap to add one div. Before ${initialDivCount}, after ${wrappedDivCount}`
      );
    }

    await measure(
      "pages actions unwrap renamed component from command panel",
      async () => {
        await selectCommandPanelInstance({ page, label: renamedLabel });
        await runCommandPanelStructuralAction({
          page,
          command: "Unwrap",
        });
      }
    );
    const unwrappedDivCount = await getElementTagCount({
      fixture,
      tag: "div",
    });
    const unwrappedImageCount = await getInstanceComponentCount({
      fixture,
      component: componentName,
    });
    if (unwrappedDivCount !== initialDivCount) {
      throw new Error(
        `Expected unwrap to remove the wrapper div. Before ${initialDivCount}, after ${unwrappedDivCount}`
      );
    }
    if (unwrappedImageCount !== insertedImageCount) {
      throw new Error(
        `Expected unwrap to preserve ${componentName}. Before ${insertedImageCount}, after ${unwrappedImageCount}`
      );
    }

    await measure("pages actions reload label and unwrap", async () => {
      await openProjectBuilder({
        page,
        projectId: fixture.projectId,
        authToken: fixture.builderToken,
      });
    });
    const reloadedLabelCount = await getInstanceLabelCount({
      fixture,
      label: renamedLabel,
    });
    const reloadedDivCount = await getElementTagCount({
      fixture,
      tag: "div",
    });
    const reloadedImageCount = await getInstanceComponentCount({
      fixture,
      component: componentName,
    });
    if (reloadedLabelCount !== 1) {
      throw new Error(
        `Expected reload to preserve Navigator label "${renamedLabel}", found ${reloadedLabelCount}`
      );
    }
    if (reloadedDivCount !== initialDivCount) {
      throw new Error(
        `Expected reload to preserve unwrapped tree. Before ${initialDivCount}, after ${reloadedDivCount}`
      );
    }
    if (reloadedImageCount !== insertedImageCount) {
      throw new Error(
        `Expected reload to preserve unwrapped ${componentName}. Before ${insertedImageCount}, after ${reloadedImageCount}`
      );
    }
  } finally {
    await close();
  }
});

test("Builder command panel tag insertion persists after reload", async () => {
  const { page, close } = await newIsolatedPage();
  const anchorText = "Initial content";
  const tag = "aside";

  try {
    await measure(
      "pages actions open builder for command tag insertion",
      async () => {
        await openProjectBuilder({
          page,
          projectId: fixture.projectId,
          authToken: fixture.builderToken,
        });
      }
    );
    await waitForCanvasText({ page, text: anchorText });

    const initialAsideCount = await getElementTagCount({
      fixture,
      tag,
    });

    await measure(
      "pages actions select body before command tag insertion",
      async () => {
        await openNavigatorPanel({ page });
        await selectNavigatorItem({ page, itemName: "Body" });
      }
    );

    await measure("pages actions insert tag from command panel", async () => {
      await runCommandPanelTagInsertion({ page, tag });
    });
    const insertedAsideCount = await getElementTagCount({
      fixture,
      tag,
    });
    if (insertedAsideCount !== initialAsideCount + 1) {
      throw new Error(
        `Expected command panel tag insertion to add one ${tag}. Before ${initialAsideCount}, after ${insertedAsideCount}`
      );
    }

    await measure("pages actions reload command tag insertion", async () => {
      await openProjectBuilder({
        page,
        projectId: fixture.projectId,
        authToken: fixture.builderToken,
      });
    });
    const reloadedAsideCount = await getElementTagCount({
      fixture,
      tag,
    });
    if (reloadedAsideCount !== initialAsideCount + 1) {
      throw new Error(
        `Expected reload to preserve command panel ${tag} insertion. Before ${initialAsideCount}, after ${reloadedAsideCount}`
      );
    }
  } finally {
    await close();
  }
});

test("Builder pastes external HTML fragments through clipboard and reloads them", async () => {
  const { page, close } = await newIsolatedPage();
  const pastedHeading = "External paste heading";
  const pastedLink = "External paste link";
  const html = `
    <section>
      <article>
        <h2>${pastedHeading}</h2>
        <p>Nested external paste paragraph.</p>
        <a href="/external-paste">${pastedLink}</a>
      </article>
    </section>
  `;

  try {
    await measure(
      "pages actions open builder for external html paste",
      async () => {
        await openProjectBuilder({
          page,
          projectId: fixture.projectId,
          authToken: fixture.builderToken,
        });
      }
    );
    await waitForCanvasText({ page, text: "Initial content" });

    const initialSectionCount = await getElementTagCount({
      fixture,
      tag: "section",
    });
    const initialArticleCount = await getElementTagCount({
      fixture,
      tag: "article",
    });

    await measure("pages actions paste external html into body", async () => {
      await openNavigatorPanel({ page });
      await selectNavigatorItem({ page, itemName: "Body" });
      await pastePlainTextFromClipboardShortcut({ page, text: html });
    });
    await waitForCanvasText({ page, text: pastedHeading });
    await waitForCanvasText({ page, text: pastedLink });

    const pastedSectionCount = await getElementTagWithTextCount({
      fixture,
      tag: "section",
      text: pastedHeading,
    });
    const pastedArticleCount = await getElementTagWithTextCount({
      fixture,
      tag: "article",
      text: pastedLink,
    });
    if (pastedSectionCount !== 1) {
      throw new Error(
        `Expected pasted HTML to create one section containing "${pastedHeading}", found ${pastedSectionCount}`
      );
    }
    if (pastedArticleCount !== 1) {
      throw new Error(
        `Expected pasted HTML to create one article containing "${pastedLink}", found ${pastedArticleCount}`
      );
    }

    await measure("pages actions reload external html paste", async () => {
      await openProjectBuilder({
        page,
        projectId: fixture.projectId,
        authToken: fixture.builderToken,
      });
    });
    await waitForCanvasText({ page, text: pastedHeading });
    await waitForCanvasText({ page, text: pastedLink });

    const reloadedSectionCount = await getElementTagCount({
      fixture,
      tag: "section",
    });
    const reloadedArticleCount = await getElementTagCount({
      fixture,
      tag: "article",
    });
    if (reloadedSectionCount !== initialSectionCount + 1) {
      throw new Error(
        `Expected reload to preserve pasted section. Before ${initialSectionCount}, after ${reloadedSectionCount}`
      );
    }
    if (reloadedArticleCount !== initialArticleCount + 1) {
      throw new Error(
        `Expected reload to preserve pasted article. Before ${initialArticleCount}, after ${reloadedArticleCount}`
      );
    }
  } finally {
    await close();
  }
});

test("Builder copies, pastes, and cuts instances through browser shortcuts", async () => {
  const { page, close } = await newIsolatedPage();
  const text = "Initial content";

  try {
    await measure(
      "pages actions open builder for instance clipboard shortcuts",
      async () => {
        await openProjectBuilder({
          page,
          projectId: fixture.projectId,
          authToken: fixture.builderToken,
        });
      }
    );
    await waitForCanvasText({ page, text });
    await waitForSyncStatus({ page, status: "idle" });

    const initialTextCount = await getExactTextChildCount({ fixture, text });
    await selectCanvasTextInstance({ page, text });
    await page.keyboard.press("ControlOrMeta+C");
    await waitForClipboardTextIncludes({
      page,
      text: "@webstudio/instance/v0.1",
    });

    await pasteFromClipboardShortcut({ page });
    const pastedFromCanvasSelectionCount = await getExactTextChildCount({
      fixture,
      text,
    });
    if (pastedFromCanvasSelectionCount !== initialTextCount + 1) {
      throw new Error(
        `Expected paste from canvas selection to duplicate text. Before ${initialTextCount}, after ${pastedFromCanvasSelectionCount}`
      );
    }

    await cutSelectedInstanceShortcut({ page });
    const afterCutCount = await getExactTextChildCount({ fixture, text });
    if (afterCutCount !== initialTextCount) {
      throw new Error(
        `Expected cut shortcut to remove selected pasted instance. Before ${initialTextCount}, after ${afterCutCount}`
      );
    }
  } finally {
    await close();
  }
});

test("Builder pastes instance data into page templates", async () => {
  const { page, close } = await newIsolatedPage();
  const templatePasteText = "Template instance paste heading";

  try {
    await measure("pages actions open builder for template paste", async () => {
      await openProjectBuilder({
        page,
        projectId: fixture.projectId,
        authToken: fixture.builderToken,
      });
    });
    await openPage({
      page,
      pageName: fixture.pageTemplateName,
      canvasText: fixture.pageTemplateText,
    });

    await selectBodyInNavigator({ page });
    await pasteClipboardData({
      page,
      data: {
        "application/json": createInstanceTransfer({
          id: "template-instance-json-paste",
          text: templatePasteText,
        }),
      },
    });
    await waitForCanvasText({ page, text: templatePasteText });

    const pastedTextCount = await getElementTagWithTextCount({
      fixture,
      tag: "p",
      text: templatePasteText,
    });
    if (pastedTextCount !== 1) {
      throw new Error(
        `Expected template paste to create one paragraph containing "${templatePasteText}", found ${pastedTextCount}`
      );
    }
  } finally {
    await close();
  }
});

test("Builder does not insert malformed Webstudio paste data as text", async () => {
  const { page, close } = await newIsolatedPage();
  const malformedData =
    '{"@webstudio/instance/v0.1":{"instanceSelector":["missing","body"]';

  try {
    await measure(
      "pages actions open builder for malformed paste",
      async () => {
        await openProjectBuilder({
          page,
          projectId: fixture.projectId,
          authToken: fixture.builderToken,
        });
      }
    );
    await waitForCanvasText({ page, text: "Initial content" });
    await selectBodyInNavigator({ page });

    await pasteTextFromClipboardShortcutWithoutSave({
      page,
      text: malformedData,
    });
    await waitForCanvasTextHidden({ page, text: malformedData });
    const malformedTextCount = await getExactTextChildCount({
      fixture,
      text: malformedData,
    });
    if (malformedTextCount !== 0) {
      throw new Error(
        `Expected malformed Webstudio data not to be inserted as text, found ${malformedTextCount}`
      );
    }
  } finally {
    await close();
  }
});

test("Builder allows native paste inside focused builder inputs", async () => {
  const { page, close } = await newIsolatedPage();
  const pastedText = "<section>Native input paste</section>";

  try {
    await measure(
      "pages actions open builder for native input paste",
      async () => {
        await openProjectBuilder({
          page,
          projectId: fixture.projectId,
          authToken: fixture.builderToken,
        });
      }
    );
    await waitForCanvasText({ page, text: "Initial content" });

    await openCommandPanel({ page });
    const commandInput = page.getByPlaceholder("Type a command or search...", {
      exact: true,
    });
    await page.evaluate(async (text) => {
      await navigator.clipboard.writeText(text);
    }, pastedText);
    await page.keyboard.press("ControlOrMeta+V");
    await commandInput.waitFor();
    const value = await commandInput.inputValue();
    if (value !== pastedText) {
      throw new Error(
        `Expected native input paste to preserve text "${pastedText}", got "${value}"`
      );
    }
    await page.keyboard.press("Escape");
    await waitForCanvasTextHidden({ page, text: pastedText });
  } finally {
    await close();
  }
});
