import { expect, type Request } from "@playwright/test";
import { createId, type Instance } from "@webstudio-is/sdk";
import { loadDevBuild, updateBuild } from "../db";
import { createContentModeProject } from "../fixtures/content-mode-suite";
import { waitForCanvasFrame } from "../flows/builder";
import { getProjectBuilderUrl, test } from "../test";

test("Preview Form posts to the authenticated Builder and displays the server result without publishing", async ({
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
        id: `${formId}:submission`,
        instanceId: formId,
        name: "submission",
        type: "json",
        value: { destinations: [variableId] },
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
  await expect(form.getByRole("alert")).toHaveText(
    "Resource destination is not allowed"
  );
  expect(submissions).toHaveLength(1);
  expect(submissions[0].method()).toBe("POST");
  expect(submissions[0].postData()).toContain("preview reaches backend");
});
