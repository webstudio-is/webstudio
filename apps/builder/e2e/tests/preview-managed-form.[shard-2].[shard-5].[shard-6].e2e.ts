import { expect, type Request } from "@playwright/test";
import {
  createId,
  encodeDataSourceVariable,
  type Instance,
} from "@webstudio-is/sdk";
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

test("Preview Form preserves browser FormData and renders configured failure results", async ({
  page,
  context,
}) => {
  const fixture = await createContentModeProject({
    context,
    email: "preview-form-matrix@webstudio.test",
    title: "Preview Form matrix",
    assetNamePrefix: "preview-form-matrix-",
    builderToken: "preview-form-matrix-builder-token",
  });
  const build = await loadDevBuild({ projectId: fixture.projectId });
  const instances = JSON.parse(build.instances) as Instance[];
  const body = instances.find((instance) => instance.id === "body");
  if (!body) {
    throw new Error("Expected the fixture's body instance");
  }
  const id = () => createId("nano");
  const formId = id();
  const firstInputId = id();
  const secondInputId = id();
  const fileInputId = id();
  const buttonId = id();
  const successId = id();
  const errorId = id();
  const stateId = id();
  const resultsId = id();
  const errorsId = id();
  const state = encodeDataSourceVariable(stateId);
  const results = encodeDataSourceVariable(resultsId);
  const errors = encodeDataSourceVariable(errorsId);
  const actions = ["First", "Disabled", "Last"].map((name) => ({
    name,
    dataSourceId: id(),
    resourceId: id(),
  }));
  body.children.push({ type: "id", value: formId });
  await updateBuild(build.id, {
    instances: JSON.stringify([
      ...instances,
      {
        type: "instance",
        id: formId,
        component: "NativeForm",
        children: [
          firstInputId,
          secondInputId,
          fileInputId,
          buttonId,
          successId,
          errorId,
        ].map((value) => ({ type: "id", value })),
      },
      ...[firstInputId, secondInputId, fileInputId].map((inputId) => ({
        type: "instance" as const,
        id: inputId,
        component: "ws:element",
        tag: "input",
        children: [],
      })),
      {
        type: "instance",
        id: buttonId,
        component: "ws:element",
        tag: "button",
        children: [{ type: "text", value: "Send matrix" }],
      },
      {
        type: "instance",
        id: successId,
        component: "ws:element",
        tag: "div",
        children: [{ type: "text", value: "Sent successfully" }],
      },
      {
        type: "instance",
        id: errorId,
        component: "ws:element",
        tag: "div",
        children: [
          { type: "text", value: "Submission failed" },
          { type: "expression", value: `${errors}[0]?.message` },
          {
            type: "expression",
            value: `${results}.map(item => item.resourceName).join(',')`,
          },
        ],
      },
    ]),
    props: JSON.stringify([
      ...JSON.parse(build.props),
      {
        id: `${formId}:action`,
        instanceId: formId,
        name: "action",
        type: "json",
        value: actions.map(({ dataSourceId }, index) => ({
          dataSourceId,
          enabled: index !== 1,
        })),
      },
      {
        id: `${formId}:state`,
        instanceId: formId,
        name: "state",
        type: "expression",
        mode: "read",
        value: state,
      },
      {
        id: `${formId}:onStateChange`,
        instanceId: formId,
        name: "onStateChange",
        type: "action",
        value: [{ type: "execute", args: ["state"], code: `${state} = state` }],
      },
      {
        id: `${formId}:onResultChange`,
        instanceId: formId,
        name: "onResultChange",
        type: "action",
        value: [
          {
            type: "execute",
            args: ["result"],
            code: `({results: ${results} = result.results, errors: ${errors} = result.errors})`,
          },
        ],
      },
      ...[firstInputId, secondInputId].map((instanceId) => ({
        id: `${instanceId}:name`,
        instanceId,
        name: "name",
        type: "string",
        value: "tag",
      })),
      {
        id: `${fileInputId}:name`,
        instanceId: fileInputId,
        name: "name",
        type: "string",
        value: "upload",
      },
      {
        id: `${fileInputId}:type`,
        instanceId: fileInputId,
        name: "type",
        type: "string",
        value: "file",
      },
      {
        id: `${errorId}:role`,
        instanceId: errorId,
        name: "role",
        type: "string",
        value: "alert",
      },
      ...[
        { instanceId: successId, value: `${state} === 'success'` },
        { instanceId: errorId, value: `${state} === 'error'` },
      ].map(({ instanceId, value }) => ({
        id: `${instanceId}:data-ws-show`,
        instanceId,
        name: "data-ws-show",
        type: "expression",
        mode: "read",
        value,
      })),
    ]),
    dataSources: JSON.stringify([
      ...JSON.parse(build.dataSources),
      {
        id: stateId,
        type: "variable",
        name: "formState",
        scopeInstanceId: formId,
        value: { type: "string", value: "initial" },
      },
      ...[
        { id: resultsId, name: "results" },
        { id: errorsId, name: "errors" },
      ].map(({ id: sourceId, name }) => ({
        id: sourceId,
        type: "variable",
        name,
        scopeInstanceId: formId,
        value: { type: "json", value: [] },
      })),
      ...actions.map(({ name, dataSourceId, resourceId }) => ({
        id: dataSourceId,
        type: "resource",
        name,
        scopeInstanceId: formId,
        resourceId,
      })),
    ]),
    resources: JSON.stringify([
      ...JSON.parse(build.resources),
      ...actions.map(({ name, resourceId }) => ({
        id: resourceId,
        name,
        method: "post",
        // The protected transport rejects loopback before opening a connection.
        url: '"http://127.0.0.1/preview-e2e-must-not-run"',
        headers: [],
      })),
    ]),
  });

  await page.addInitScript(() => {
    const originalFetch = window.fetch;
    window.fetch = async (input, init) => {
      const formData = init?.body as FormData | undefined;
      if (
        new URL(
          input instanceof Request ? input.url : String(input),
          window.location.href
        ).pathname === "/rest/preview-form" &&
        typeof formData?.getAll === "function"
      ) {
        const upload = formData.get("upload") as File | null;
        const submission = {
          tags: formData.getAll("tag"),
          fileName: upload?.name,
          fileBytes:
            typeof upload?.arrayBuffer === "function"
              ? Array.from(new Uint8Array(await upload.arrayBuffer()))
              : undefined,
        };
        (
          window as Window & { __previewSubmission?: typeof submission }
        ).__previewSubmission = submission;
      }
      return originalFetch(input, init);
    };
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
  const tags = form.locator('input[name="tag"]');
  await tags.nth(0).fill("first value");
  await tags.nth(1).fill("second value");
  const bytes = Buffer.from([0, 1, 127, 128, 255]);
  await form.locator('input[name="upload"]').setInputFiles({
    name: "sample.bin",
    mimeType: "application/octet-stream",
    buffer: bytes,
  });
  const responsePromise = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/rest/preview-form" &&
      response.request().method() === "POST"
  );
  await form.getByRole("button", { name: "Send matrix" }).click();
  const response = await responsePromise;
  const result = await response.json();
  expect(result.success).toBe(false);
  expect(
    result.results.map(
      ({ resourceName }: { resourceName: string }) => resourceName
    )
  ).toEqual(["First", "Last"]);
  expect(
    result.errors.map(
      ({ resourceName }: { resourceName: string }) => resourceName
    )
  ).toEqual(["First", "Last"]);
  expect(submissions).toHaveLength(1);
  const captured = await Promise.all(
    page
      .frames()
      .map((frame) =>
        frame.evaluate(
          () =>
            (window as Window & { __previewSubmission?: unknown })
              .__previewSubmission
        )
      )
  );
  expect(captured.find((value) => value !== undefined)).toEqual({
    tags: ["first value", "second value"],
    fileName: "sample.bin",
    fileBytes: Array.from(bytes),
  });
  await expect(form).toHaveAttribute("data-state", "error");
  await expect(form.getByRole("alert")).toBeVisible();
  await expect(form.getByText("Submission failed")).toBeVisible();
  await expect(form.getByRole("alert")).toContainText(result.errors[0].message);
  await expect(form.getByText("First,Last")).toBeVisible();
  await expect(form.getByText("Sent successfully")).toHaveCount(0);
});
