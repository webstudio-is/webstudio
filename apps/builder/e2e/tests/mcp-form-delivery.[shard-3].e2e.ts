import { createServer } from "node:http";
import { expect } from "@playwright/test";
import { loadDevBuild } from "../db";
import { createContentModeProject } from "../fixtures/content-mode-suite";
import { startFormDeliveryReceiver } from "../flows/generated-form-delivery";
import { withMcpEmailHttpPreview } from "../flows/mcp-email-http-preview";
import { startLocalEmailReceiver } from "../flows/mcp-email-preview";
import { runFormAuthor } from "../flows/mcp-form-author";
import {
  startPreviewFormMcpClient,
  submitPreviewFormViaMcp,
} from "../flows/mcp-preview-submit";
import { withSavedProjectRedirect } from "../flows/project-settings-runtime";
import { e2eEmailPlanName } from "../plans";
import { test } from "../test";

test("Project redirects and MCP-authored Forms run in the same generated production Preview", async ({
  page,
  context,
}) => {
  test.setTimeout(240_000);

  await startPreviewFormMcpClient();
  const fixture = await createContentModeProject({
    context,
    email: "mcp-email-attachments@webstudio.test",
    title: "MCP Form delivery and project settings",
    devPlan: e2eEmailPlanName,
    assetNamePrefix: "mcp-email-attachments-",
    builderToken: "mcp-email-attachments-builder-token",
  });
  const requests: Array<{ method: string; url: string }> = [];
  const server = createServer((request, response) => {
    if (new URL(request.url ?? "", "http://127.0.0.1").pathname === "/search") {
      requests.push({ method: request.method ?? "", url: request.url ?? "" });
    }
    response.writeHead(200, { "content-type": "text/html" });
    response.end('<!doctype html><p id="received">Received</p>');
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  try {
    const address = server.address();
    if (address === null || typeof address === "string") {
      throw new Error("Expected local receiver port");
    }
    const receiverUrl = `http://127.0.0.1:${address.port}/search`;
    const { stdout } = await runFormAuthor(
      "mcp-managed-native-form-author",
      fixture.projectId,
      receiverUrl
    );
    const { callbackForm, actionForm, blockedForm, emailForm, nativeFormId } =
      JSON.parse(stdout) as {
        callbackForm: { formId: string };
        actionForm: {
          formId: string;
          resourceIds: string[];
          rejectedResourceId: string;
        };
        blockedForm: { formId: string; resourceId: string };
        emailForm: { formId: string; emailResourceIds: string[] };
        nativeFormId: string;
      };
    const { formId: blockedFormId } = blockedForm;
    const { formId: emailFormId, emailResourceIds } = emailForm;
    expect(emailResourceIds).toHaveLength(2);
    const { formId: callbackFormId } = callbackForm;
    const { formId, resourceIds, rejectedResourceId } = actionForm;
    expect(resourceIds).toHaveLength(10);
    expect(new Set([...resourceIds, rejectedResourceId]).size).toBe(11);
    const build = await loadDevBuild({ projectId: fixture.projectId });
    const formIds = [
      blockedFormId,
      emailFormId,
      formId,
      callbackFormId,
      nativeFormId,
    ];
    expect(new Set(formIds).size).toBe(formIds.length);
    expect(
      (JSON.parse(build.instances) as Array<{ id: string }>).map(({ id }) => id)
    ).toEqual(expect.arrayContaining(formIds));
    const resources = JSON.parse(build.resources) as Array<{
      id: string;
      name: string;
      url?: string;
      email?: { includeAttachments?: boolean };
    }>;
    expect(resources.find(({ id }) => id === blockedForm.resourceId)?.url).toBe(
      JSON.stringify("http://127.0.0.1/preview-e2e-must-not-run")
    );
    const ownerResource = resources.find(
      ({ id, name }) =>
        emailResourceIds.includes(id) && name === "Email to owner"
    );
    const visitorResource = resources.find(
      ({ id, name }) =>
        emailResourceIds.includes(id) && name === "Email to visitor"
    );
    expect(ownerResource?.email?.includeAttachments).toBe(true);
    expect(visitorResource?.email?.includeAttachments).toBe(false);

    const files = [
      {
        name: "café-notes.txt",
        mimeType: "text/plain",
        buffer: Buffer.from("First attachment: café\n", "utf8"),
      },
      {
        name: "sample.bin",
        mimeType: "application/octet-stream",
        buffer: Buffer.from([0, 1, 127, 128, 254, 255]),
      },
    ];
    const emailReceiver = await startLocalEmailReceiver();
    try {
      const receiver = await startFormDeliveryReceiver();
      try {
        const verifyPreview: Parameters<
          typeof withSavedProjectRedirect
        >[0]["verifyPreview"] = ({ redirect, build }) =>
          withMcpEmailHttpPreview({
            build,
            emailPort: emailReceiver.port,
            httpPort: receiver.port,
            callback: async ({ url }) => {
              await test.step("Builder redirect returns 301 in generated production Preview", async () => {
                const response = await fetch(new URL(redirect.from, url), {
                  redirect: "manual",
                });
                expect(response.status).toBe(301);
                expect(response.headers.get("location")).toBe(redirect.to);
              });
              const previewPage = await context.newPage();
              await previewPage.route("**/*", (route) =>
                new URL(route.request().url()).hostname === "127.0.0.1"
                  ? route.continue()
                  : route.abort()
              );
              await previewPage.goto(url);

              await test.step("Managed Form requires fields and reports a blocked HTTP action", async () => {
                const rendered = previewPage.locator(
                  `[data-ws-managed-form-id="${blockedFormId}"]`
                );
                await rendered.getByRole("button", { name: "Submit" }).click();
                expect(
                  await rendered
                    .locator('input[name="name"]')
                    .evaluate(
                      (input: HTMLInputElement) => input.validity.valueMissing
                    )
                ).toBe(true);
                const bytes = Buffer.from([0, 1, 127, 128, 255]);
                const submission = (
                  await submitPreviewFormViaMcp({
                    url,
                    input: {
                      path: "/",
                      selector: `[data-ws-managed-form-id="${blockedFormId}"]`,
                      values: [
                        { name: "name", value: "Ada" },
                        { name: "email", value: "ada@example.com" },
                        { name: "subject", value: "MCP Preview" },
                        { name: "message", value: "Hello from MCP" },
                        { name: "tag", value: "first tag" },
                        { name: "tag", value: "second tag" },
                        {
                          name: "upload",
                          file: {
                            name: "sample.bin",
                            type: "application/octet-stream",
                            base64: bytes.toString("base64"),
                          },
                        },
                      ],
                      submitter: "button[type=submit]",
                      timeout: 30_000,
                    },
                  })
                ).data;
                expect(submission).toMatchObject({
                  status: "submitted",
                  formState: "error",
                  results: [],
                });
                expect(submission.errors).toEqual([
                  expect.objectContaining({ status: 400 }),
                ]);
                expect(submission.exchanges).toEqual(
                  expect.arrayContaining([
                    expect.objectContaining({
                      status: 400,
                      url: expect.stringContaining("/__ws-form"),
                    }),
                  ])
                );
                expect(receiver.deliveries).toHaveLength(0);
              });

              await test.step("Native GET form submits repeated fields to a local receiver", async () => {
                const form = previewPage.locator("#native-get-form");
                await expect(form).toHaveAttribute("method", "get");
                await expect(form).toHaveAttribute("action", receiverUrl);
                const invalid = await submitPreviewFormViaMcp({
                  url,
                  input: {
                    path: "/",
                    selector: "#native-get-form",
                    values: [],
                    submitter: 'button[type="submit"]',
                    timeout: 30_000,
                  },
                });
                expect(invalid.ok).toBe(true);
                expect(invalid.data).toMatchObject({
                  status: "validation_failed",
                  formState: "invalid",
                  results: [],
                  exchanges: [],
                });
                await expect(previewPage).toHaveURL(url);
                expect(requests).toHaveLength(0);

                const submitted = await submitPreviewFormViaMcp({
                  url,
                  input: {
                    path: "/",
                    selector: "#native-get-form",
                    values: [
                      { name: "tag", value: "second" },
                      { name: "tag", value: "first" },
                    ],
                    submitter: 'button[type="submit"]',
                    timeout: 30_000,
                  },
                });
                expect(submitted.ok).toBe(true);
                expect(submitted.data).toMatchObject({
                  status: "submitted",
                  results: [],
                  errors: [],
                  redirect: receiverUrl,
                });
                expect(submitted.data.exchanges).toEqual(
                  expect.arrayContaining([
                    expect.objectContaining({ status: 200 }),
                  ])
                );
                expect(submitted.data.pageUrl).toBe(receiverUrl);
                expect(requests).toHaveLength(1);
                expect(requests[0].method).toBe("GET");
                expect(
                  new URL(requests[0].url, receiverUrl).searchParams.getAll(
                    "tag"
                  )
                ).toEqual(["second", "first"]);
              });

              await test.step("authored field-change effect runs before submission", async () => {
                const callbackSubmission = (
                  await submitPreviewFormViaMcp({
                    url,
                    input: {
                      path: "/",
                      selector: "#callback-form",
                      values: [{ name: "outcome", value: "success" }],
                      submitter: "button[type=submit]",
                      timeout: 30_000,
                    },
                  })
                ).data;
                expect(callbackSubmission).toMatchObject({
                  status: "submitted",
                  formState: "success",
                });
                expect(
                  receiver.deliveries.map(({ body }) => JSON.parse(body))
                ).toEqual([{ outcome: "success", changeCount: "1" }]);
              });
              receiver.deliveries.length = 0;

              await test.step("ten Actions run in order and an eleventh is rejected", async () => {
                const submission = (
                  await submitPreviewFormViaMcp({
                    url,
                    input: {
                      path: "/",
                      selector: `[data-ws-managed-form-id="${formId}"]`,
                      values: [
                        { name: "name", value: "Ada" },
                        { name: "email", value: "ada@example.com" },
                        { name: "subject", value: "Ten actions" },
                        { name: "message", value: "All actions" },
                      ],
                      submitter: "button[type=submit]",
                      timeout: 30_000,
                    },
                  })
                ).data;
                expect(submission).toMatchObject({
                  status: "submitted",
                  formState: "success",
                  errors: [],
                });
                expect(submission.exchanges).toEqual(
                  expect.arrayContaining([
                    expect.objectContaining({
                      status: 200,
                      url: expect.stringContaining("/__ws-form"),
                    }),
                  ])
                );
                expect(submission.results).toEqual(
                  resourceIds.map((resourceId, index) =>
                    expect.objectContaining({
                      resourceId,
                      resourceName: `HTTP action ${index + 1}`,
                      status: 200,
                    })
                  )
                );
                expect(JSON.stringify(submission)).not.toContain(
                  rejectedResourceId
                );
                expect(receiver.deliveries).toHaveLength(10);
                expect(
                  receiver.deliveries
                    .map(
                      ({ body }) =>
                        JSON.parse(body) as { index: number; name: string }
                    )
                    .sort((left, right) => left.index - right.index)
                ).toEqual(
                  Array.from({ length: 10 }, (_, index) => ({
                    index: index + 1,
                    name: "Ada",
                  }))
                );
              });

              await test.step("email Resources deliver multiple files and honor attachment opt-out", async () => {
                const submission = await submitPreviewFormViaMcp({
                  url,
                  input: {
                    path: "/",
                    selector: `[data-ws-managed-form-id="${emailFormId}"]`,
                    values: [
                      { name: "name", value: "Ada Lovelace" },
                      { name: "email", value: "ada@example.test" },
                      { name: "subject", value: "Attachment opt-out test" },
                      {
                        name: "message",
                        value: "Checking separate file delivery settings.",
                      },
                      ...files.map((file) => ({
                        name: "upload",
                        file: {
                          name: file.name,
                          type: file.mimeType,
                          base64: file.buffer.toString("base64"),
                        },
                      })),
                    ],
                    submitter: "button[type=submit]",
                    timeout: 30_000,
                  },
                });
                expect(submission.data).toMatchObject({
                  status: "submitted",
                  formState: "success",
                  errors: [],
                });
                expect(submission.data.results).toEqual([
                  expect.objectContaining({
                    resourceId: emailResourceIds[0],
                    status: 200,
                  }),
                  expect.objectContaining({
                    resourceId: emailResourceIds[1],
                    status: 200,
                  }),
                ]);
                expect(emailReceiver.messages).toHaveLength(2);

                const owner = emailReceiver.messages.find((message) =>
                  message.to.some(({ address }) => address === "owner@mcp.test")
                );
                const visitor = emailReceiver.messages.find((message) =>
                  message.to.some(
                    ({ address }) => address === "ada@example.test"
                  )
                );
                expect(owner).toBeDefined();
                expect(visitor).toBeDefined();
                expect(owner?.attachments).toHaveLength(files.length);
                for (const [index, file] of files.entries()) {
                  const attachment = owner?.attachments?.[index];
                  expect(attachment?.filename).toBe(file.name);
                  expect(attachment?.contentType).toBe(file.mimeType);
                  expect(
                    Buffer.from(attachment?.contentBase64 ?? "", "base64")
                  ).toEqual(file.buffer);
                }
                expect(visitor?.attachments).toBeUndefined();
              });
            },
          });
        await withSavedProjectRedirect({ page, fixture, verifyPreview });
      } finally {
        await receiver.close();
      }
    } finally {
      await emailReceiver.close();
    }
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
