import { expect, type Request } from "@playwright/test";
import { createId, type Instance } from "@webstudio-is/sdk";
import { loadDevBuild, updateBuild } from "../db";
import { createContentModeProject } from "../fixtures/content-mode-suite";
import { waitForCanvasFrame } from "../flows/builder";
import { getProjectBuilderUrl, test } from "../test";

test("Preview Form posts to the authenticated Builder and sets error state without publishing", async ({
  page,
  context,
}) => {
  const fixture = await createContentModeProject({
    context,
    email: "preview-managed-form@webstudio.test",
    title: "Preview managed Form",
    assetNamePrefix: "preview-managed-form-",
    builderToken: "preview-managed-form-builder-token",
  });
  const build = await loadDevBuild({ projectId: fixture.projectId });
  const instances = JSON.parse(build.instances) as Instance[];
  const body = instances.find((instance) => instance.id === "body");
  if (!body) {
    throw new Error("Expected the fixture's body instance");
  }
  const formId = createId("nano");
  const inputId = createId("nano");
  const buttonId = createId("nano");
  const resourceId = createId("nano");
  const variableId = createId("nano");
  body.children.push({ type: "id", value: formId });
  const formInstances: Instance[] = [
    {
      type: "instance",
      id: formId,
      component: "NativeForm",
      children: [inputId, buttonId].map((value) => ({ type: "id", value })),
    },
    {
      type: "instance",
      id: inputId,
      component: "ws:element",
      tag: "input",
      children: [],
    },
    {
      type: "instance",
      id: buttonId,
      component: "ws:element",
      tag: "button",
      children: [{ type: "text", value: "Test Preview submission" }],
    },
  ];
  await updateBuild(build.id, {
    instances: JSON.stringify([...instances, ...formInstances]),
    props: JSON.stringify([
      ...JSON.parse(build.props),
      {
        id: `${formId}:action`,
        instanceId: formId,
        name: "action",
        type: "json",
        value: [{ dataSourceId: variableId, enabled: true }],
      },
      {
        id: `${formId}:successRedirect`,
        instanceId: formId,
        name: "successRedirect",
        type: "string",
        value: "/must-not-redirect",
      },
      {
        id: `${inputId}:name`,
        instanceId: inputId,
        name: "name",
        type: "string",
        value: "previewCheck",
      },
    ]),
    dataSources: JSON.stringify([
      ...JSON.parse(build.dataSources),
      {
        id: variableId,
        type: "resource",
        name: "Preview destination",
        scopeInstanceId: formId,
        resourceId,
      },
    ]),
    resources: JSON.stringify([
      ...JSON.parse(build.resources),
      {
        id: resourceId,
        name: "Preview destination",
        method: "post",
        // The existing policy rejects this host before any outbound request.
        // This tests the real transport and handler without sending email or a webhook.
        url: '"https://apps.webstudio.is/preview-e2e-must-not-run"',
        headers: [],
      },
    ]),
  });
  const submissions: Request[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/rest/preview-form") {
      submissions.push(request);
    }
  });
  await page.goto(
    getProjectBuilderUrl({
      projectId: fixture.projectId,
      authToken: fixture.builderToken,
      mode: "preview",
    })
  );
  const canvas = await waitForCanvasFrame({ page });
  const form = canvas.locator(`[data-ws-managed-form-id="${formId}"]`);
  await form
    .locator('input[name="previewCheck"]')
    .fill("preview reaches backend");
  const responsePromise = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/rest/preview-form" &&
      response.request().method() === "POST"
  );
  await form.getByRole("button", { name: "Test Preview submission" }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(400);
  expect(await response.json()).toMatchObject({
    success: false,
    errors: [{ message: "Resource destination is not allowed" }],
  });
  await expect(form).toHaveAttribute("data-state", "error");
  await expect(form).toBeVisible();
  // This fixture has no authored Error Message; Forms do not render raw errors.
  await expect(form.getByRole("alert")).toHaveCount(0);
  expect(submissions).toHaveLength(1);
  expect(submissions[0].method()).toBe("POST");
  expect(submissions[0].postData()).toContain("preview reaches backend");
});

test("Preview Form success redirects navigate matched pages and keep feedback for missing pages", async ({
  page,
  context,
}) => {
  const fixture = await createContentModeProject({
    context,
    email: "preview-redirect@webstudio.test",
    title: "Preview Form redirects",
    assetNamePrefix: "preview-redirect-",
    builderToken: "preview-redirect-builder-token",
  });
  const build = await loadDevBuild({ projectId: fixture.projectId });
  const pages = JSON.parse(build.pages) as {
    homePageId: string;
    rootFolderId: string;
    pages: Array<{
      id: string;
      name: string;
      title: string;
      path: string;
      rootInstanceId: string;
      meta: Record<string, unknown>;
    }>;
    folders: Array<{ id: string; children: string[] }>;
  };
  const instances = JSON.parse(build.instances) as Instance[];
  const home = pages.pages.find((item) => item.id === pages.homePageId);
  const body = instances.find((item) => item.id === home?.rootInstanceId);
  if (!body) {
    throw new Error("Expected the fixture's home body instance");
  }
  const formId = createId("nano");
  const buttonId = createId("nano");
  const thanksBodyId = createId("nano");
  const targetId = createId("nano");
  const variableId = createId("nano");
  const resourceId = createId("nano");
  const thanksPageId = createId("nano");
  body.children.push({ type: "id", value: formId });
  pages.pages.push({
    id: thanksPageId,
    name: "Thanks",
    title: "Thanks",
    path: "/thanks",
    rootInstanceId: thanksBodyId,
    meta: {},
  });
  pages.folders
    .find((folder) => folder.id === pages.rootFolderId)
    ?.children.push(thanksPageId);
  await updateBuild(build.id, {
    pages: JSON.stringify(pages),
    instances: JSON.stringify([
      ...instances,
      {
        type: "instance",
        id: formId,
        component: "NativeForm",
        children: [{ type: "id", value: buttonId }],
      },
      {
        type: "instance",
        id: buttonId,
        component: "ws:element",
        tag: "button",
        children: [{ type: "text", value: "Send" }],
      },
      {
        type: "instance",
        id: thanksBodyId,
        component: "ws:element",
        tag: "body",
        children: [{ type: "id", value: targetId }],
      },
      {
        type: "instance",
        id: targetId,
        component: "ws:element",
        tag: "div",
        children: [{ type: "text", value: "Redirect target" }],
      },
    ]),
    props: JSON.stringify([
      ...JSON.parse(build.props),
      {
        id: `${formId}:action`,
        instanceId: formId,
        name: "action",
        type: "json",
        value: [{ dataSourceId: variableId, enabled: true }],
      },
      {
        id: `${targetId}:id`,
        instanceId: targetId,
        name: "id",
        type: "string",
        value: "done",
      },
    ]),
    dataSources: JSON.stringify([
      ...JSON.parse(build.dataSources),
      {
        id: variableId,
        type: "resource",
        name: "Preview destination",
        scopeInstanceId: formId,
        resourceId,
      },
    ]),
    resources: JSON.stringify([
      ...JSON.parse(build.resources),
      {
        id: resourceId,
        name: "Preview destination",
        method: "post",
        url: '"https://apps.webstudio.is/preview-e2e-must-not-run"',
        headers: [],
      },
    ]),
  });
  const builderUrl = getProjectBuilderUrl({
    projectId: fixture.projectId,
    authToken: fixture.builderToken,
    mode: "preview",
  });
  await page.route("**/rest/preview-form?**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        status: 200,
        results: [],
        errors: [],
      }),
    });
  });
  const submitWithRedirect = async (redirect: string) => {
    const current = await loadDevBuild({ projectId: fixture.projectId });
    const props = JSON.parse(current.props) as Array<{
      instanceId: string;
      name: string;
    }>;
    await updateBuild(current.id, {
      props: JSON.stringify([
        ...props.filter(
          (prop) =>
            prop.instanceId !== formId || prop.name !== "successRedirect"
        ),
        {
          id: `${formId}:successRedirect`,
          instanceId: formId,
          name: "successRedirect",
          type: "string",
          value: redirect,
        },
      ]),
    });
    await page.goto(builderUrl);
    const canvas = await waitForCanvasFrame({ page });
    const form = canvas.locator(`[data-ws-managed-form-id="${formId}"]`);
    await form.getByRole("button", { name: "Send" }).click();
    return { canvas, form };
  };

  const matched = await submitWithRedirect("thanks");
  await expect(matched.canvas.getByText("Redirect target")).toBeVisible();
  await expect(
    matched.canvas.locator(`[data-ws-managed-form-id="${formId}"]`)
  ).toHaveCount(0);

  const missing = await submitWithRedirect("/missing");
  await expect(missing.form).toHaveAttribute("data-state", "success");
  await expect(missing.canvas.getByText("Redirect target")).toHaveCount(0);

  const current = await loadDevBuild({ projectId: fixture.projectId });
  const props = JSON.parse(current.props) as Array<{
    instanceId: string;
    name: string;
  }>;
  await updateBuild(current.id, {
    props: JSON.stringify([
      ...props.filter(
        (prop) => prop.instanceId !== formId || prop.name !== "successRedirect"
      ),
      {
        id: `${formId}:successRedirect`,
        instanceId: formId,
        name: "successRedirect",
        type: "string",
        value: "/thanks#done",
      },
    ]),
  });
  await page.goto(builderUrl);
  const canvas = await waitForCanvasFrame({ page });
  await canvas.evaluate(() => {
    (window as Window & { __scrolledIds?: string[] }).__scrolledIds = [];
    Element.prototype.scrollIntoView = function () {
      (window as Window & { __scrolledIds?: string[] }).__scrolledIds?.push(
        this.id
      );
    };
  });
  await canvas
    .locator(`[data-ws-managed-form-id="${formId}"]`)
    .getByRole("button", { name: "Send" })
    .click();
  await expect(canvas.getByText("Redirect target")).toBeVisible();
  await expect
    .poll(() =>
      canvas.evaluate(
        () => (window as Window & { __scrolledIds?: string[] }).__scrolledIds
      )
    )
    .toContain("done");
});
