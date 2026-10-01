import { createServer } from "node:http";
import { expect, type Page } from "@playwright/test";
import { encodeDataVariableId } from "@webstudio-is/sdk";
import { loadDevBuild } from "../db";
import {
  createHttpResourceVariable,
  createStringVariable,
} from "../flows/data-variables";
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
import { withGeneratedPreview } from "../flows/generated-app";
import { test } from "../test";
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

const selectResourceAction = async ({
  page,
  name,
}: {
  page: Page;
  name: string;
}) => {
  await page.getByRole("tab", { name: "Settings" }).click();
  await page.getByRole("combobox", { name: "Action source" }).click();
  const save = waitForChangeToBeSaved({ page });
  await page.getByRole("option", { name, exact: true }).click();
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
  name,
}: {
  projectId: string;
  url: string;
  name: string;
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
  const dataSources = JSON.parse(build.dataSources) as Array<{
    id: string;
    name: string;
    type: string;
    value?: { value: string };
    resourceId?: string;
  }>;
  const endpoint = dataSources.find(
    (source) => source.name === "Endpoint" && source.value?.value === url
  );
  const resource = resources.find(
    (resource) =>
      resource.name === name &&
      resource.method === "post" &&
      resource.url ===
        (endpoint ? encodeDataVariableId(endpoint.id) : JSON.stringify(url))
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
  if (
    !dataSources.some(
      (dataSource) =>
        dataSource.type === "resource" && dataSource.resourceId === resource.id
    )
  ) {
    throw new Error(
      `Expected Webhook Form action to reference a Resource variable for "${url}". Data sources: ${JSON.stringify(dataSources)}`
    );
  }
};

const startWebhookServer = async () => {
  const requests: Array<{
    method: string | undefined;
    url: string | undefined;
    accept: string | undefined;
    body: unknown;
  }> = [];
  const server = createServer(async (request, response) => {
    const chunks: Buffer[] = [];
    for await (const chunk of request) {
      chunks.push(Buffer.from(chunk));
    }
    const bodyText = Buffer.concat(chunks).toString("utf8");
    requests.push({
      method: request.method,
      url: request.url,
      accept: request.headers.accept,
      body: bodyText === "" ? undefined : JSON.parse(bodyText),
    });
    response.writeHead(200, {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json",
    });
    response.end(JSON.stringify({ success: true }));
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (address === null || typeof address === "string") {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    throw new Error("Expected a numeric webhook server port.");
  }
  return {
    requests,
    url: `http://127.0.0.1:${address.port}/submit`,
    close: async () =>
      await new Promise<void>((resolve) => server.close(() => resolve())),
  };
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

test("Webhook Form Resource variable submits once and persists after reload", async ({
  page,
  context,
}) => {
  const fixture = await createContentModeProject({
    context: context,
    email: "props-runtime@webstudio.test",
    title: "Props Runtime",
    assetNamePrefix: "props-runtime-",
    editorToken: "props-runtime-editor-token",
    builderToken: "props-runtime-builder-token",
  });
  const webhook = await startWebhookServer();
  const text = "Initial content";
  const actionUrl = webhook.url;
  const resourceName = "Webhook request";

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
    await selectNavigatorItem({ page, itemName: "Body" });
    await createStringVariable({ page, name: "Endpoint", value: actionUrl });

    await measure("props runtime select Resource variable action", async () => {
      await createHttpResourceVariable({
        page,
        name: resourceName,
        url: `curl -X POST -H 'Content-Type: application/json' --data '{}' '${actionUrl}?source=review'`,
      });
      await selectNavigatorItem({ page, itemName: "Webhook Form" });
      await selectResourceAction({ page, name: resourceName });
      await page
        .getByRole("button", { name: "Edit Resource variable" })
        .click();
      await expect(
        page.getByRole("textbox", { name: "URL", exact: true })
      ).toBeFocused();
      await page.getByRole("button", { name: "Add another header" }).click();
      await page
        .locator('input[name="header-name"]:not([type="hidden"])')
        .fill("Acc");
      await page.getByRole("option", { name: "Accept", exact: true }).click();
      await page
        .locator('input[name="header-value-validator"]')
        .fill("application/");
      await page
        .getByRole("option", { name: "application/json", exact: true })
        .click();
      // Bind through the full shared Resource editor, then introduce a same-name
      // variable on the form. The request must keep its ancestor's binding.
      await page.getByText("URL", { exact: true }).hover();
      await page
        .getByText("URL", { exact: true })
        .locator("xpath=following::button[@data-variant][1]")
        .click();
      const bindingDialog = page.getByRole("dialog", { name: "Binding" });
      const expressionEditor = bindingDialog.locator(".cm-content").last();
      await expressionEditor.click();
      await page.keyboard.press("ControlOrMeta+A");
      await page.keyboard.insertText("Endpoint");
      await page.keyboard.press("ControlOrMeta+Enter");
      await bindingDialog
        .getByRole("button", { name: "Close", exact: true })
        .click();
      await bindingDialog.waitFor({ state: "hidden" });
      const save = waitForChangeToBeSaved({ page });
      await page
        .getByRole("dialog", { name: "Edit variable", exact: true })
        .getByRole("button", { name: "Close", exact: true })
        .click();
      await save;
      await waitForSyncStatus({ page, status: "idle" });
      await createStringVariable({
        page,
        name: "Endpoint",
        value: `${actionUrl}/wrong`,
      });
    });
    await expectPersistedActionResource({
      projectId: fixture.projectId,
      url: actionUrl,
      name: resourceName,
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
      name: resourceName,
    });

    await measure("props runtime submit generated webhook form", async () => {
      await withGeneratedPreview({
        projectId: fixture.projectId,
        callback: async ({ url }) => {
          await page.goto(url);
          if (webhook.requests.length !== 0) {
            throw new Error(
              `Expected no webhook requests before submission, received ${JSON.stringify(webhook.requests)}`
            );
          }
          await page.locator('input[name="name"]').fill("Ada");
          await page.locator('input[name="email"]').fill("ada@example.com");
          await page.getByRole("button", { name: "Submit" }).click();
          await page
            .getByText("Thank you for getting in touch!", { exact: true })
            .waitFor();
        },
      });
    });
    if (
      JSON.stringify(webhook.requests) !==
      JSON.stringify([
        {
          method: "POST",
          url: "/submit?source=review",
          accept: "application/json",
          body: { name: "Ada", email: "ada@example.com" },
        },
      ])
    ) {
      throw new Error(
        `Expected one populated webhook submission, received ${JSON.stringify(webhook.requests)}`
      );
    }
  } finally {
    await webhook.close();
  }
});

for (const mode of ["URL", "URL binding"] as const) {
  test(`Webhook Form ${mode} submits once after reload`, async ({
    page,
    context,
  }) => {
    const fixture = await createContentModeProject({
      context,
      email: `webhook-${mode.replaceAll(" ", "-")}@webstudio.test`,
      title: `Webhook ${mode}`,
      assetNamePrefix: "webhook-url-",
      editorToken: "webhook-url-editor-token",
      builderToken: "webhook-url-builder-token",
    });
    const webhook = await startWebhookServer();
    try {
      await openProjectBuilder({
        page,
        projectId: fixture.projectId,
        authToken: fixture.builderToken,
        features: ["resourceProp"],
      });
      await waitForCanvasText({ page, text: "Initial content" });
      await selectCanvasTextInstance({ page, text: "Initial content" });
      await openComponentsPanel({ page });
      await insertComponentPanelOption({ page, name: "Webhook Form" });
      await selectNavigatorItem({ page, itemName: "Webhook Form" });
      await page.getByRole("tab", { name: "Settings" }).click();
      if (mode === "URL binding") {
        await createStringVariable({
          page,
          name: "Endpoint",
          value: webhook.url,
        });
        await bindSelectedPropertyToExpression({
          page,
          label: "Action",
          expression: "Endpoint",
        });
      } else {
        const input = page.getByRole("textbox", { name: "Action URL" });
        await input.fill(webhook.url);
        const save = waitForChangeToBeSaved({ page });
        await input.press("Enter");
        await save;
        await waitForSyncStatus({ page, status: "idle" });
      }
      await openProjectBuilder({
        page,
        projectId: fixture.projectId,
        authToken: fixture.builderToken,
        features: ["resourceProp"],
      });
      await waitForCanvasText({ page, text: "Initial content" });
      await selectCanvasTextInstance({ page, text: "Submit" });
      await selectNavigatorItem({ page, itemName: "Webhook Form" });
      await page.getByRole("tab", { name: "Settings" }).click();
      await expect(
        page.getByRole("textbox", { name: "Action URL" })
      ).toHaveValue(webhook.url);
      await withGeneratedPreview({
        projectId: fixture.projectId,
        callback: async ({ url }) => {
          await page.goto(url);
          expect(webhook.requests).toEqual([]);
          await page.locator('input[name="name"]').fill("Ada");
          await page.locator('input[name="email"]').fill("ada@example.com");
          await page.getByRole("button", { name: "Submit" }).click();
          await page
            .getByText("Thank you for getting in touch!", { exact: true })
            .waitFor();
          expect(webhook.requests).toEqual([
            {
              method: "POST",
              url: "/submit",
              accept: "*/*",
              body: { name: "Ada", email: "ada@example.com" },
            },
          ]);
        },
      });
    } finally {
      await webhook.close();
    }
  });
}

test("Webhook Form retries after an expired submission", async ({
  page,
  context,
}) => {
  const fixture = await createContentModeProject({
    context,
    email: "webhook-retry@webstudio.test",
    title: "Webhook retry",
    assetNamePrefix: "webhook-retry-",
    editorToken: "webhook-retry-editor-token",
    builderToken: "webhook-retry-builder-token",
  });
  const webhook = await startWebhookServer();
  try {
    await openProjectBuilder({
      page,
      projectId: fixture.projectId,
      authToken: fixture.builderToken,
      features: ["resourceProp"],
    });
    await waitForCanvasText({ page, text: "Initial content" });
    await selectCanvasTextInstance({ page, text: "Initial content" });
    await openComponentsPanel({ page });
    await insertComponentPanelOption({ page, name: "Webhook Form" });
    await selectNavigatorItem({ page, itemName: "Webhook Form" });
    await page.getByRole("tab", { name: "Settings" }).click();
    const input = page.getByRole("textbox", { name: "Action URL" });
    await input.fill(webhook.url);
    const save = waitForChangeToBeSaved({ page });
    await input.press("Enter");
    await save;
    await waitForSyncStatus({ page, status: "idle" });

    await withGeneratedPreview({
      projectId: fixture.projectId,
      callback: async ({ url }) => {
        await page.goto(url);
        await page.locator('input[name="name"]').fill("Ada");
        await page.locator('input[name="email"]').fill("ada@example.com");
        // Expire the first timestamp without a five-minute wait. The server
        // must still reject it; a subsequent fresh submission must succeed.
        await page.clock.setFixedTime(Date.now() - 6 * 60_000);
        await page.getByRole("button", { name: "Submit" }).click();
        await expect(
          page.getByText("Sorry, something went wrong.", { exact: true })
        ).toBeVisible();
        expect(webhook.requests).toEqual([]);

        await page.clock.setFixedTime(Date.now());
        await page.getByRole("button", { name: "Submit" }).click();
        await expect(
          page.getByText("Thank you for getting in touch!", { exact: true })
        ).toBeVisible();
        expect(webhook.requests).toEqual([
          {
            method: "POST",
            url: "/submit",
            accept: "*/*",
            body: { name: "Ada", email: "ada@example.com" },
          },
        ]);
      },
    });
  } finally {
    await webhook.close();
  }
});

test("Props panel expression binding persists after reload", async ({
  page,
  context,
}) => {
  const fixture = await createContentModeProject({
    context: context,
    email: "props-expression-runtime@webstudio.test",
    title: "Props Expression Runtime",
    assetNamePrefix: "props-expression-runtime-",
    editorToken: "props-expression-runtime-editor-token",
    builderToken: "props-expression-runtime-builder-token",
  });
  const anchorText = "Expression-bound link";
  const expression = '"/props-expression-link"';

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
});

test("Props panel boolean prop persists after reload", async ({
  page,
  context,
}) => {
  const fixture = await createContentModeProject({
    context: context,
    email: "props-boolean-runtime@webstudio.test",
    title: "Props Boolean Runtime",
    assetNamePrefix: "props-boolean-runtime-",
    editorToken: "props-boolean-runtime-editor-token",
    builderToken: "props-boolean-runtime-builder-token",
  });

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
});
