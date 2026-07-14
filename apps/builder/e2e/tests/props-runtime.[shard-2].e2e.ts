import type { Page } from "playwright";
import { loadDevBuild } from "../db";
import { openProjectBuilder, waitForCanvasText } from "../flows/builder";
import { selectCanvasTextInstance } from "../flows/canvas-selection";
import { openNavigatorPanel } from "../flows/navigator";
import {
  resetSelectedProperty,
  setSelectedBooleanProperty,
  waitForSelectedBooleanPropertyValue,
} from "../flows/props-panel";
import {
  waitForChangeToBeSaved,
  waitForSyncStatus,
} from "../flows/sync-status";
import { createContentModeProject } from "../fixtures/content-mode-suite";
import { newIsolatedPage, test } from "../harness";
import { measure } from "../perf";

const openComponentsPanel = async ({ page }: { page: Page }) => {
  await page.getByRole("tab", { name: "Components" }).click();
  await page.getByPlaceholder("Find components").waitFor();
};

const insertComponentPanelOption = async ({
  page,
  name,
  component,
}: {
  page: Page;
  name: string;
  component?: string;
}) => {
  const search = page.getByPlaceholder("Find components");
  await search.fill(name);
  const option =
    component === undefined
      ? page.getByRole("option", { name, exact: true })
      : page.locator(`[data-drag-component="${component}"]`);
  await option.click();
  await waitForSyncStatus({ page, status: "idle" });
};

const selectNavigatorItem = async ({
  page,
  itemName,
}: {
  page: Page;
  itemName: string;
}) => {
  await openNavigatorPanel({ page });
  const item = page
    .locator("[data-navigator-tree] [data-tree-button]")
    .filter({ hasText: itemName })
    .last();
  await item.waitFor({ state: "visible" });
  await item.click();
  await item.click();
};

const selectFirstNavigatorChild = async ({
  page,
  parentLabel,
}: {
  page: Page;
  parentLabel: string;
}) => {
  await openNavigatorPanel({ page });
  const parent = page
    .locator("[data-navigator-tree] [data-tree-button]")
    .filter({ hasText: parentLabel })
    .first();
  await parent.waitFor({ state: "visible" });
  await parent.press("ArrowRight");
  const child = parent.locator("xpath=following::button[@data-tree-button][1]");
  await child.waitFor({ state: "visible" });
  await child.click();
  await child.click();
};

const updateResourceActionUrl = async ({
  page,
  url,
}: {
  page: Page;
  url: string;
}) => {
  await page.getByRole("tab", { name: "Settings" }).click();
  await page.getByText("Action", { exact: true }).first().waitFor({
    state: "visible",
    timeout: 10_000,
  });
  const input = page.locator("input:not([placeholder])").last();
  await input.waitFor({ state: "visible", timeout: 10_000 });
  await input.fill(url);
  const save = waitForChangeToBeSaved({ page });
  await input.blur();
  await save;
  await waitForSyncStatus({ page, status: "idle" });
};

const pastePlainTextFromClipboardShortcut = async ({
  page,
  text,
}: {
  page: Page;
  text: string;
}) => {
  const save = waitForChangeToBeSaved({ page });
  await page.evaluate((text) => {
    const clipboardData = new DataTransfer();
    clipboardData.setData("text/plain", text);
    document.dispatchEvent(
      new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData,
      })
    );
  }, text);
  await save;
  await waitForSyncStatus({ page, status: "idle" });
};

const bindSelectedPropertyToExpression = async ({
  page,
  label,
  expression,
}: {
  page: Page;
  label: string;
  expression: string;
}) => {
  await page.getByRole("tab", { name: "Settings" }).click();
  await page.getByText(label, { exact: true }).waitFor({
    state: "visible",
    timeout: 10_000,
  });
  await page.getByText(label, { exact: true }).hover();
  await page
    .getByText(label, { exact: true })
    .locator("xpath=following::button[@data-variant][1]")
    .click();

  const bindingDialog = page.getByRole("dialog", { name: "Binding" });
  await bindingDialog.waitFor();
  const expressionEditor = bindingDialog.locator(".cm-content").last();
  await expressionEditor.click();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.type(expression);

  const save = waitForChangeToBeSaved({ page });
  await page.keyboard.press("ControlOrMeta+Enter");
  await save;
  await waitForSyncStatus({ page, status: "idle" });
  await page.keyboard.press("Escape");
};

const expectPersistedActionResource = async ({
  projectId,
  url,
}: {
  projectId: string;
  url: string;
}) => {
  const build = await loadDevBuild({ projectId });
  const props = JSON.parse(build.props) as Array<{
    name: string;
    type: string;
    value?: string;
  }>;
  const resources = JSON.parse(build.resources) as Array<{
    id: string;
    name: string;
    method: string;
    url: string;
  }>;
  const resource = resources.find(
    (resource) =>
      resource.name === "action" &&
      resource.method === "post" &&
      resource.url === JSON.stringify(url)
  );
  const actionProp = props.find(
    (prop) =>
      prop.name === "action" &&
      prop.type === "resource" &&
      prop.value === resource?.id
  );

  if (actionProp === undefined || resource === undefined) {
    throw new Error(
      `Expected Webhook Form action prop to persist resource "${url}". Props: ${JSON.stringify(props)} Resources: ${JSON.stringify(resources)}`
    );
  }
};

const expectPersistedExpressionProp = async ({
  projectId,
  tag,
  text,
  name,
  expression,
}: {
  projectId: string;
  tag: string;
  text: string;
  name: string;
  expression: string;
}) => {
  const build = await loadDevBuild({ projectId });
  const instances = JSON.parse(build.instances) as Array<{
    id: string;
    component: string;
    tag?: string;
    children?: Array<{ type: string; value?: string }>;
  }>;
  const props = JSON.parse(build.props) as Array<{
    instanceId: string;
    name: string;
    type: string;
    value?: string;
  }>;
  const instancesById = new Map(
    instances.map((instance) => [instance.id, instance])
  );

  const instanceContainsText = (instanceId: string): boolean => {
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
          return instanceContainsText(child.value);
        }
        return false;
      }) ?? false
    );
  };

  const instance = instances.find(
    (instance) =>
      instance.component === "ws:element" &&
      instance.tag === tag &&
      instanceContainsText(instance.id)
  );
  const prop = props.find(
    (prop) =>
      prop.instanceId === instance?.id &&
      prop.name === name &&
      prop.type === "expression" &&
      prop.value === expression
  );

  if (instance === undefined || prop === undefined) {
    throw new Error(
      `Expected ${tag} "${text}" to persist expression prop ${name}=${expression}. Props: ${JSON.stringify(props)} Instances: ${JSON.stringify(instances)}`
    );
  }
};

const expectPersistedBooleanProp = async ({
  projectId,
  component,
  name,
  value,
}: {
  projectId: string;
  component: string;
  name: string;
  value: boolean;
}) => {
  const build = await loadDevBuild({ projectId });
  const instances = JSON.parse(build.instances) as Array<{
    id: string;
    component: string;
  }>;
  const props = JSON.parse(build.props) as Array<{
    instanceId: string;
    name: string;
    type: string;
    value?: unknown;
  }>;
  const instanceIds = new Set(
    instances
      .filter((instance) => instance.component === component)
      .map((instance) => instance.id)
  );
  const prop = props.find(
    (prop) =>
      instanceIds.has(prop.instanceId) &&
      prop.name === name &&
      prop.type === "boolean" &&
      prop.value === value
  );
  if (prop === undefined) {
    throw new Error(
      `Expected ${component} ${name}=${value} to persist. Props: ${JSON.stringify(props)}`
    );
  }
};

const expectBooleanPropDeleted = async ({
  projectId,
  component,
  name,
}: {
  projectId: string;
  component: string;
  name: string;
}) => {
  const build = await loadDevBuild({ projectId });
  const instances = JSON.parse(build.instances) as Array<{
    id: string;
    component: string;
  }>;
  const props = JSON.parse(build.props) as Array<{
    instanceId: string;
    name: string;
  }>;
  const instanceIds = new Set(
    instances
      .filter((instance) => instance.component === component)
      .map((instance) => instance.id)
  );
  if (
    props.some((prop) => instanceIds.has(prop.instanceId) && prop.name === name)
  ) {
    throw new Error(
      `Expected ${component} ${name} prop to be deleted. Props: ${JSON.stringify(props)}`
    );
  }
};

test("Props panel resource action persists after reload", async () => {
  const fixture = await createContentModeProject({
    email: "props-runtime@webstudio.test",
    title: "Props Runtime",
    assetNamePrefix: "props-runtime-",
    editorToken: "props-runtime-editor-token",
    builderToken: "props-runtime-builder-token",
  });
  const { page, close } = await newIsolatedPage();
  const text = "Initial content";
  const actionUrl = "/$resources/current-date";

  try {
    await measure("props runtime open builder", async () => {
      await openProjectBuilder({
        page,
        projectId: fixture.projectId,
        authToken: fixture.builderToken,
        features: ["resourceProp"],
      });
    });
    await waitForCanvasText({ page, text });
    await selectCanvasTextInstance({ page, text });

    await measure("props runtime insert webhook form", async () => {
      await openComponentsPanel({ page });
      await insertComponentPanelOption({ page, name: "Webhook Form" });
    });
    await selectNavigatorItem({ page, itemName: "Webhook Form" });

    await measure("props runtime update resource action", async () => {
      await updateResourceActionUrl({ page, url: actionUrl });
    });
    await expectPersistedActionResource({
      projectId: fixture.projectId,
      url: actionUrl,
    });

    await measure("props runtime reload builder", async () => {
      await openProjectBuilder({
        page,
        projectId: fixture.projectId,
        authToken: fixture.builderToken,
        features: ["resourceProp"],
      });
    });
    await waitForCanvasText({ page, text });
    await expectPersistedActionResource({
      projectId: fixture.projectId,
      url: actionUrl,
    });
  } finally {
    await close();
  }
});

test("Props panel expression binding persists after reload", async () => {
  const fixture = await createContentModeProject({
    email: "props-expression-runtime@webstudio.test",
    title: "Props Expression Runtime",
    assetNamePrefix: "props-expression-runtime-",
    editorToken: "props-expression-runtime-editor-token",
    builderToken: "props-expression-runtime-builder-token",
  });
  const { page, close } = await newIsolatedPage();
  const anchorText = "Expression-bound link";
  const expression = '"/props-expression-link"';

  try {
    await measure("props expression runtime open builder", async () => {
      await openProjectBuilder({
        page,
        projectId: fixture.projectId,
        authToken: fixture.builderToken,
      });
    });
    await waitForCanvasText({ page, text: "Initial content" });

    await measure("props expression runtime paste anchor", async () => {
      await openNavigatorPanel({ page });
      await selectNavigatorItem({ page, itemName: "Body" });
      await pastePlainTextFromClipboardShortcut({
        page,
        text: `<a href="/initial-props-link">${anchorText}</a>`,
      });
    });
    await waitForCanvasText({ page, text: anchorText });

    await measure("props expression runtime bind href", async () => {
      await selectNavigatorItem({ page, itemName: "a" });
      await bindSelectedPropertyToExpression({
        page,
        label: "Href",
        expression,
      });
    });
    await expectPersistedExpressionProp({
      projectId: fixture.projectId,
      tag: "a",
      text: anchorText,
      name: "href",
      expression,
    });

    await measure("props expression runtime reload builder", async () => {
      await openProjectBuilder({
        page,
        projectId: fixture.projectId,
        authToken: fixture.builderToken,
      });
    });
    await waitForCanvasText({ page, text: anchorText });
    await expectPersistedExpressionProp({
      projectId: fixture.projectId,
      tag: "a",
      text: anchorText,
      name: "href",
      expression,
    });
  } finally {
    await close();
  }
});

test("Props panel boolean prop persists after reload", async () => {
  const fixture = await createContentModeProject({
    email: "props-boolean-runtime@webstudio.test",
    title: "Props Boolean Runtime",
    assetNamePrefix: "props-boolean-runtime-",
    editorToken: "props-boolean-runtime-editor-token",
    builderToken: "props-boolean-runtime-builder-token",
  });
  const { page, close } = await newIsolatedPage();

  try {
    await measure("props boolean runtime open builder", async () => {
      await openProjectBuilder({
        page,
        projectId: fixture.projectId,
        authToken: fixture.builderToken,
      });
    });
    await waitForCanvasText({ page, text: "Initial content" });

    await measure("props boolean runtime insert checkbox", async () => {
      await openComponentsPanel({ page });
      await insertComponentPanelOption({
        page,
        name: "Checkbox",
        component: "@webstudio-is/sdk-components-react-radix:Checkbox",
      });
    });
    await selectFirstNavigatorChild({
      page,
      parentLabel: "Checkbox Field",
    });
    await page.getByRole("tab", { name: "Settings" }).click();

    await measure("props boolean runtime set checked", async () => {
      await setSelectedBooleanProperty({
        page,
        label: "Checked",
        checked: true,
      });
    });
    await expectPersistedBooleanProp({
      projectId: fixture.projectId,
      component: "@webstudio-is/sdk-components-react-radix:Checkbox",
      name: "checked",
      value: true,
    });

    await measure("props boolean runtime reload builder", async () => {
      await openProjectBuilder({
        page,
        projectId: fixture.projectId,
        authToken: fixture.builderToken,
      });
    });
    await selectFirstNavigatorChild({
      page,
      parentLabel: "Checkbox Field",
    });
    await page.getByRole("tab", { name: "Settings" }).click();
    await waitForSelectedBooleanPropertyValue({
      page,
      label: "Checked",
      checked: true,
    });
    await expectPersistedBooleanProp({
      projectId: fixture.projectId,
      component: "@webstudio-is/sdk-components-react-radix:Checkbox",
      name: "checked",
      value: true,
    });

    await measure("props boolean runtime reset checked", async () => {
      await resetSelectedProperty({ page, label: "Checked" });
    });
    await expectBooleanPropDeleted({
      projectId: fixture.projectId,
      component: "@webstudio-is/sdk-components-react-radix:Checkbox",
      name: "checked",
    });

    await measure("props boolean runtime reload after reset", async () => {
      await openProjectBuilder({
        page,
        projectId: fixture.projectId,
        authToken: fixture.builderToken,
      });
    });
    await selectFirstNavigatorChild({
      page,
      parentLabel: "Checkbox Field",
    });
    await page.getByRole("tab", { name: "Settings" }).click();
    await waitForSelectedBooleanPropertyValue({
      page,
      label: "Checked",
      checked: false,
    });
    await expectBooleanPropDeleted({
      projectId: fixture.projectId,
      component: "@webstudio-is/sdk-components-react-radix:Checkbox",
      name: "checked",
    });
  } finally {
    await close();
  }
});
