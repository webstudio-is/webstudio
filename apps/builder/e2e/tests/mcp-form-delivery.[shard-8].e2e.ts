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
import { test } from "../test";

test("MCP-authored Forms deliver email attachments and ordered HTTP Actions in generated Preview", async ({
  context,
}) => {
  // Author the HTTP and Email scenarios before building their shared Preview.
  test.setTimeout(180_000);

  await startPreviewFormMcpClient();
  const fixture = await createContentModeProject({
    context,
    email: "mcp-email-attachments@webstudio.test",
    title: "MCP Form delivery",
    assetNamePrefix: "mcp-email-attachments-",
    builderToken: "mcp-email-attachments-builder-token",
  });
  await runFormAuthor(
    "mcp-form-callbacks-author",
    fixture.projectId,
    "managed",
    "https://mcp-delivery.example/submit",
    "field-change"
  );
  const { stdout: actionsOutput } = await runFormAuthor(
    "mcp-form-action-combination-author",
    fixture.projectId,
    "ten-actions"
  );
  const { formId, resourceIds, rejectedResourceId } = JSON.parse(
    actionsOutput
  ) as {
    formId: string;
    resourceIds: string[];
    rejectedResourceId: string;
  };
  expect(resourceIds).toHaveLength(10);
  expect(new Set([...resourceIds, rejectedResourceId]).size).toBe(11);

  const { stdout: emailOutput } = await runFormAuthor(
    "mcp-managed-form-author",
    fixture.projectId,
    "email-attachments"
  );
  const { formId: emailFormId, emailResourceIds } = JSON.parse(emailOutput) as {
    formId: string;
    emailResourceIds: string[];
  };
  expect(emailResourceIds).toHaveLength(2);
  const build = await loadDevBuild({ projectId: fixture.projectId });
  const resources = JSON.parse(build.resources) as Array<{
    id: string;
    name: string;
    email?: { includeAttachments?: boolean };
  }>;
  const ownerResource = resources.find(
    ({ id, name }) => emailResourceIds.includes(id) && name === "Email to owner"
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
      await withMcpEmailHttpPreview({
        projectId: fixture.projectId,
        emailPort: emailReceiver.port,
        httpPort: receiver.port,
        callback: async ({ url }) => {
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
              message.to.some(({ address }) => address === "ada@example.test")
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
    } finally {
      await receiver.close();
    }
  } finally {
    await emailReceiver.close();
  }
});
