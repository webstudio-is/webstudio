import { expect, type Page } from "@playwright/test";
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
  waitForSyncComplete,
} from "../flows/sync-status";
import {
  createBuilderEditingProject,
  pageTemplateName,
  pageTemplateText,
} from "../fixtures/builder-editing-project";
import { test } from "../test";
import { measure } from "../perf";
import { loadDevBuild } from "../db";

type Project = Awaited<ReturnType<typeof createBuilderEditingProject>>;

test.describe.configure({ mode: "parallel" });

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

const loadBuildInstances = async (fixture: Project) => {
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

const inspectBuild = async (fixture: Project) =>
  createBuildInspector(await loadBuildInstances(fixture));

const getElementTagCount = async ({
  fixture,
  tag,
}: {
  fixture: Project;
  tag: string;
}) => {
  return (await inspectBuild(fixture)).countElementTag(tag);
};

const getElementTagWithTextCount = async ({
  fixture,
  tag,
  text,
}: {
  fixture: Project;
  tag: string;
  text: string;
}) => {
  return (await inspectBuild(fixture)).countElementTagWithText({ tag, text });
};

const getExactTextChildCount = async ({
  fixture,
  text,
}: {
  fixture: Project;
  text: string;
}) => {
  return (await inspectBuild(fixture)).countExactTextChildren(text);
};

const getElementWithTextParentTag = async ({
  fixture,
  tag,
  text,
}: {
  fixture: Project;
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
  fixture: Project;
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
  fixture: Project;
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
};

const pasteFromClipboardShortcut = async ({ page }: { page: Page }) => {
  const save = waitForChangeToBeSaved({ page });
  await page.keyboard.press("ControlOrMeta+V");
  await save;
};

const cutSelectedInstanceShortcut = async ({ page }: { page: Page }) => {
  const save = waitForChangeToBeSaved({ page });
  await page.keyboard.press("ControlOrMeta+X");
  await save;
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
  await waitForSyncComplete({ page });
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
}: {
  page: Page;
  data: Record<string, string>;
}) => {
  const save = waitForChangeToBeSaved({ page });
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
};

test("Builder Navigator keyboard move, reparent, and reorder persist after reload", async ({
  page,
  context,
}) => {
  const fixture = await createBuilderEditingProject({
    context,
    page,
    name: "navigator-keyboard",
  });
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

  await measure(
    "pages actions open builder for navigator keyboard moves",
    async () => {
      await openProjectBuilder({
        page,
        projectId: fixture.projectId,
        authToken: fixture.builderToken,
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
    fixture,
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
    fixture,
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
    fixture,
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
      projectId: fixture.projectId,
      authToken: fixture.builderToken,
    });
  });
  await waitForCanvasText({ page, text: sectionText });
  await waitForCanvasText({ page, text: asideText });
  const reloadedParentTag = await getElementWithTextParentTag({
    fixture,
    tag: "aside",
    text: asideText,
  });
  const reloadedTextOrder = await getDirectChildTextOrder({
    fixture,
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
});

test("Builder Navigator and command panel edits persist after reload", async ({
  page,
  context,
}) => {
  const fixture = await createBuilderEditingProject({
    context,
    page,
    name: "navigator-commands",
  });
  const anchorText = "Initial content";
  const componentName = "Image";
  const renamedLabel = "Hero media";

  await measure("pages actions open builder for structural edits", async () => {
    await openProjectBuilder({
      page,
      projectId: fixture.projectId,
      authToken: fixture.builderToken,
    });
  });
  await waitForCanvasText({ page, text: anchorText });
  await selectCanvasTextInstance({ page, text: anchorText });

  const initial = await inspectBuild(fixture);
  const imageCount = initial.countComponent(componentName) + 1;
  const divCount = initial.countElementTag("div");
  const sectionCount = initial.countElementTag("section");
  const asideCount = initial.countElementTag("aside");
  await openComponentsPanel({ page });
  await insertComponentPanelOption({ page, name: componentName });
  await expect
    .poll(async () =>
      (await inspectBuild(fixture)).countComponent(componentName)
    )
    .toBe(imageCount);

  await test.step("rename, wrap, and unwrap the Image", async () => {
    await openNavigatorPanel({ page });
    await selectNavigatorItem({ page, itemName: componentName });
    await editSelectedNavigatorLabel({ page, label: renamedLabel });
    await expect
      .poll(() => getInstanceLabelCount({ fixture, label: renamedLabel }))
      .toBe(1);

    await runCommandPanelStructuralAction({
      page,
      command: "Wrap",
      option: "div",
    });
    await expect
      .poll(() => getElementTagCount({ fixture, tag: "div" }))
      .toBe(divCount + 1);

    await selectCommandPanelInstance({ page, label: renamedLabel });
    await runCommandPanelStructuralAction({ page, command: "Unwrap" });
    await expect
      .poll(async () => {
        const unwrapped = await inspectBuild(fixture);
        return {
          divs: unwrapped.countElementTag("div"),
          images: unwrapped.countComponent(componentName),
        };
      })
      .toEqual({ divs: divCount, images: imageCount });
  });

  await test.step("convert a new wrapper to a section", async () => {
    await selectCommandPanelInstance({ page, label: renamedLabel });
    await runCommandPanelStructuralAction({
      page,
      command: "Wrap",
      option: "div",
    });
    await expect
      .poll(() => getElementTagCount({ fixture, tag: "div" }))
      .toBe(divCount + 1);

    await openNavigatorPanel({ page });
    await selectNavigatorItem({ page, itemName: "div" });
    await runCommandPanelStructuralAction({
      page,
      command: "Convert",
      option: "section",
    });
    await expect
      .poll(async () => {
        const converted = await inspectBuild(fixture);
        return {
          divs: converted.countElementTag("div"),
          sections: converted.countElementTag("section"),
        };
      })
      .toEqual({ divs: divCount, sections: sectionCount + 1 });
  });

  await test.step("insert an aside using the command panel", async () => {
    await selectBodyInNavigator({ page });
    await runCommandPanelTagInsertion({ page, tag: "aside" });
    await expect
      .poll(() => getElementTagCount({ fixture, tag: "aside" }))
      .toBe(asideCount + 1);
  });

  await waitForSyncComplete({ page });
  await measure("pages actions reload structural edits", async () => {
    await openProjectBuilder({
      page,
      projectId: fixture.projectId,
      authToken: fixture.builderToken,
    });
  });
  await waitForCanvasText({ page, text: anchorText });
  const reloaded = await inspectBuild(fixture);
  expect(reloaded.countLabel(renamedLabel)).toBe(1);
  expect(reloaded.countComponent(componentName)).toBe(imageCount);
  expect(reloaded.countElementTag("div")).toBe(divCount);
  expect(reloaded.countElementTag("section")).toBe(sectionCount + 1);
  expect(reloaded.countElementTag("aside")).toBe(asideCount + 1);
});

test("Builder clipboard shortcuts and paste targets preserve saved content", async ({
  page,
  context,
}) => {
  const fixture = await createBuilderEditingProject({
    context,
    page,
    name: "builder-clipboard",
    includePageTemplate: true,
  });
  await measure("pages actions open builder for clipboard cases", async () => {
    await openProjectBuilder({
      page,
      projectId: fixture.projectId,
      authToken: fixture.builderToken,
    });
  });
  await waitForCanvasText({ page, text: "Initial content" });

  await test.step("reject malformed Webstudio clipboard data", async () => {
    const malformedData =
      '{"@webstudio/instance/v0.1":{"instanceSelector":["missing","body"]';

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
  });

  await test.step("paste text into a focused Builder input", async () => {
    const pastedText = "<section>Native input paste</section>";

    await openCommandPanel({ page });
    const commandInput = page.getByPlaceholder("Type a command or search...", {
      exact: true,
    });
    await page.evaluate(async (text) => {
      await navigator.clipboard.writeText(text);
    }, pastedText);
    await page.keyboard.press("ControlOrMeta+V");
    await expect(commandInput).toHaveValue(pastedText);
    await page.keyboard.press("Escape");
    await waitForCanvasTextHidden({ page, text: pastedText });
  });

  await test.step("copy, paste, and cut with keyboard shortcuts", async () => {
    const text = "Initial content";

    await waitForCanvasText({ page, text });
    await waitForSyncComplete({ page });

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
  });

  await test.step("paste and reload external HTML", async () => {
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

    const initialSectionCount = await getElementTagCount({
      fixture,
      tag: "section",
    });
    const initialArticleCount = await getElementTagCount({
      fixture,
      tag: "article",
    });

    await measure("pages actions paste external html into body", async () => {
      await selectBodyInNavigator({ page });
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
  });

  await test.step("paste instance data into a page template", async () => {
    const templatePasteText = "Template instance paste heading";

    await openPage({
      page,
      pageName: pageTemplateName,
      canvasText: pageTemplateText,
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
  });
});
