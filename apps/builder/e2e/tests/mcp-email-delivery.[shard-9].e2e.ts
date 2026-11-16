import { createServer } from "node:http";
import { expect } from "@playwright/test";
import { createBuilderEditingProject } from "../fixtures/builder-editing-project";
import { loadDevBuild } from "../db";
import { startFormDeliveryReceiver } from "../flows/generated-form-delivery";
import { withMcpEmailHttpPreview } from "../flows/mcp-email-http-preview";
import type { CapturedEmail } from "../flows/mcp-email-preview";
import { runFormAuthor } from "../flows/mcp-form-author";
import { configureSavedWebhookForm } from "../flows/webhook-form-action";
import { test } from "../test";
import {
  startPreviewFormMcpClient,
  submitPreviewFormViaMcp,
} from "../flows/mcp-preview-submit";

type CapturedMessage = CapturedEmail & {
  headers: { "X-Message-ID": string };
};

test("Builder and MCP Form actions deliver from generated Preview", async ({
  context,
  page,
}) => {
  test.setTimeout(240_000);
  await startPreviewFormMcpClient();
  const fixture = await createBuilderEditingProject({
    context,
    page,
    name: "mcp-email-scenarios",
  });
  await test.step("save the legacy Webhook Form action through Builder", async () => {
    await configureSavedWebhookForm({ page, fixture });
  });
  const { stdout } = await runFormAuthor(
    "mcp-managed-form-author",
    fixture.projectId,
    "email",
    "email-isolation",
    "email-http-combination"
  );
  const [standard, isolated, combined] = stdout
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line)) as [
    { formId: string; emailResourceIds?: string[] },
    {
      formId: string;
      secondFormId?: string;
      emailResourceIdsByForm?: [string, string];
    },
    { formId: string; emailResourceId: string; httpResourceId: string },
  ];
  const emailResourceIds = standard.emailResourceIds;
  const isolatedResourceIds = isolated.emailResourceIdsByForm;
  if (
    emailResourceIds === undefined ||
    isolatedResourceIds === undefined ||
    isolated.secondFormId === undefined
  ) {
    throw new Error("Expected authored Email Forms and Resources");
  }
  expect(emailResourceIds).toHaveLength(2);
  expect(isolated.secondFormId).toBeDefined();
  expect(isolated.formId).not.toBe(isolated.secondFormId);
  expect(isolatedResourceIds).toHaveLength(2);
  expect(isolatedResourceIds[0]).not.toBe(isolatedResourceIds[1]);

  const authoredBuild = await loadDevBuild({ projectId: fixture.projectId });
  const authoredResources = JSON.parse(authoredBuild.resources) as Array<{
    id: string;
    name: string;
    email?: Record<string, unknown>;
  }>;
  const authoredEmailResources = authoredResources.filter(({ id }) =>
    emailResourceIds.includes(id)
  );
  expect(authoredEmailResources).toHaveLength(2);
  expect(
    authoredEmailResources.find(({ name }) => name === "Email to visitor")
      ?.email
  ).toMatchObject({
    recipientMode: "visitor",
    visitorEmailField: "email",
  });
  expect(JSON.parse(authoredBuild.projectSettings)).toMatchObject({
    meta: {
      contactEmail: "owner@mcp.test",
      emailSender: "Contact Form <forms@mcp.test>",
    },
  });

  const messages: CapturedMessage[] = [];
  let rejectNext = false;
  const receiver = createServer(async (request, response) => {
    if (request.method !== "POST" || request.url !== "/send") {
      response.writeHead(404).end();
      return;
    }
    const chunks: Buffer[] = [];
    for await (const chunk of request) {
      chunks.push(Buffer.from(chunk));
    }
    const message = JSON.parse(
      Buffer.concat(chunks).toString("utf8")
    ) as CapturedMessage;
    messages.push(message);
    const reject = rejectNext;
    rejectNext = false;
    response.writeHead(reject ? 503 : 200, {
      "content-type": "application/json",
    });
    response.end(
      JSON.stringify(
        reject
          ? {
              error: {
                code: "temporary_failure",
                message: "Temporary local E2E failure",
              },
            }
          : { id: "local-email-" + messages.length }
      )
    );
  });
  const httpReceiver = await startFormDeliveryReceiver();
  try {
    await new Promise<void>((resolve, reject) => {
      receiver.once("error", reject);
      receiver.listen(0, "127.0.0.1", resolve);
    });
    const address = receiver.address();
    if (address === null || typeof address === "string") {
      throw new Error("Expected a local Email Service receiver port");
    }
    await withMcpEmailHttpPreview({
      projectId: fixture.projectId,
      emailPort: address.port,
      httpPort: httpReceiver.port,
      callback: async ({ url }) => {
        await test.step("saved Webhook Form submits once in generated Preview", async () => {
          await page.goto(url);
          expect(httpReceiver.deliveries).toHaveLength(0);
          const webhook = page.locator("form:not([data-ws-managed-form-id])");
          await webhook.locator('input[name="name"]').fill("Ada");
          await webhook.locator('input[name="email"]').fill("ada@example.com");
          await webhook.getByRole("button", { name: "Submit" }).click();
          await expect(
            webhook.getByText("Thank you for getting in touch!", {
              exact: true,
            })
          ).toBeVisible();
          expect(httpReceiver.deliveries).toHaveLength(1);
          expect(httpReceiver.deliveries[0]?.method).toBe("POST");
          expect(
            JSON.parse(httpReceiver.deliveries[0]?.body ?? "null")
          ).toEqual({
            name: "Ada",
            email: "ada@example.com",
          });
          httpReceiver.deliveries.length = 0;
        });
        await test.step("customized owner and visitor Email", async () => {
          const submission = await submitPreviewFormViaMcp({
            url,
            input: {
              path: "/",
              selector: '[data-ws-managed-form-id="' + standard.formId + '"]',
              values: [
                { name: "name", value: "Ada Lovelace" },
                { name: "email", value: "ada@example.test" },
                { name: "subject", value: "MCP email test" },
                {
                  name: "message",
                  value: "This submission should become two local messages.",
                },
                {
                  name: "upload",
                  file: {
                    name: "notes.txt",
                    type: "text/plain",
                    base64: Buffer.from("MCP attachment payload").toString(
                      "base64"
                    ),
                  },
                },
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
          expect(submission.data.results).toEqual(
            emailResourceIds.map((resourceId) =>
              expect.objectContaining({ resourceId, status: 200 })
            )
          );
          expect(messages).toHaveLength(2);
          const ownerMessage = messages.find((message) =>
            message.to.some(({ address }) => address === "owner@mcp.test")
          );
          const visitorMessage = messages.find((message) =>
            message.to.some(({ address }) => address === "ada@example.test")
          );
          expect(ownerMessage).toBeDefined();
          expect(visitorMessage).toBeDefined();
          expect(ownerMessage).toMatchObject({
            subject: "Contact form: MCP email test",
            text: expect.stringContaining("Name: Ada Lovelace"),
            replyTo: { address: "forms@mcp.test", name: "Contact Form" },
            attachments: [
              {
                filename: "notes.txt",
                contentType: "text/plain",
                contentBase64: Buffer.from("MCP attachment payload").toString(
                  "base64"
                ),
              },
            ],
          });
          expect(ownerMessage?.text).toContain("Email: ada@example.test");
          expect(ownerMessage?.text).toContain("Subject: MCP email test");
          expect(ownerMessage?.text).toContain("Page: http://127.0.0.1:");
          expect(visitorMessage?.subject).toBe(
            "Contact Form received your email: We received your message"
          );
          expect(visitorMessage?.text).toBe(
            "Thanks for contacting us. We will reply soon."
          );
          expect(visitorMessage?.attachments ?? []).toEqual([]);
          messages.splice(0);
        });

        await test.step("custom recipients remain isolated between Forms", async () => {
          for (const [id, expected] of [
            [isolated.formId, { subject: "First Form message" }],
            [isolated.secondFormId, { subject: "Second Form message" }],
          ] as const) {
            const submission = await submitPreviewFormViaMcp({
              url,
              input: {
                path: "/",
                selector: '[data-ws-managed-form-id="' + id + '"]',
                values: [
                  { name: "name", value: "MCP E2E visitor" },
                  { name: "email", value: "visitor@example.test" },
                  {
                    name: "subject",
                    value: "Visitor subject: " + expected.subject,
                  },
                  {
                    name: "message",
                    value: "Submitted through " + expected.subject,
                  },
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
                resourceId: isolatedResourceIds[id === isolated.formId ? 0 : 1],
                status: 200,
              }),
            ]);
          }
          await expect.poll(() => messages.length).toBe(2);
          expect(messages).toEqual([
            expect.objectContaining({
              to: [expect.objectContaining({ address: "first-form@mcp.test" })],
              subject: expect.stringContaining("First Form message"),
              text: "Body override for the first Form.",
            }),
            expect.objectContaining({
              to: [
                expect.objectContaining({ address: "second-form@mcp.test" }),
              ],
              subject: expect.stringContaining("Second Form message"),
              text: "Body override for the second Form.",
            }),
          ]);
          messages.splice(0);
        });

        await test.step("provider failure does not replay and new submission has a new message ID", async () => {
          const submit = async (name: string, message: string) =>
            await submitPreviewFormViaMcp({
              url,
              input: {
                path: "/",
                selector: '[data-ws-managed-form-id="' + standard.formId + '"]',
                values: [
                  { name: "name", value: name },
                  { name: "email", value: "visitor@example.test" },
                  { name: "subject", value: "Message ID test" },
                  { name: "message", value: message },
                ],
                submitter: "button[type=submit]",
                timeout: 30_000,
              },
            });
          rejectNext = true;
          const firstSubmission = await submit(
            "First local submission",
            "First submission"
          );
          expect(firstSubmission.data).toMatchObject({
            status: "submitted",
            formState: "error",
            results: [
              expect.objectContaining({
                resourceId: emailResourceIds[0],
                status: 503,
              }),
              expect.objectContaining({
                resourceId: emailResourceIds[1],
                status: 200,
              }),
            ],
            errors: [expect.objectContaining({ status: 503 })],
          });
          expect(messages).toHaveLength(2);
          const secondSubmission = await submit(
            "Second local submission",
            "Second submission"
          );
          expect(secondSubmission.data).toMatchObject({
            status: "submitted",
            formState: "success",
            errors: [],
          });
          expect(secondSubmission.data.results).toEqual(
            emailResourceIds.map((resourceId) =>
              expect.objectContaining({ resourceId, status: 200 })
            )
          );
          expect(messages).toHaveLength(4);

          const firstMessageId = messages[0].headers["X-Message-ID"];
          expect(firstMessageId).not.toBe("");
          expect(messages[1].headers["X-Message-ID"]).toBe(firstMessageId);
          const expectedSubjects = new Set([
            "Contact form: Message ID test",
            "Contact Form received your email: We received your message",
          ]);
          expect(
            new Set(messages.slice(0, 2).map(({ subject }) => subject))
          ).toEqual(expectedSubjects);
          const secondMessageIds = messages
            .slice(2)
            .map(({ headers }) => headers["X-Message-ID"]);
          expect(secondMessageIds[0]).toBe(secondMessageIds[1]);
          expect(secondMessageIds[0]).not.toBe(firstMessageId);
          expect(
            new Set(messages.slice(2).map(({ subject }) => subject))
          ).toEqual(expectedSubjects);
          expect(
            new Set(messages.slice(0, 2).map(({ to }) => to[0]?.address))
          ).toEqual(new Set(["owner@mcp.test", "visitor@example.test"]));
          expect(
            new Set(messages.slice(2).map(({ to }) => to[0]?.address))
          ).toEqual(new Set(["owner@mcp.test", "visitor@example.test"]));
        });

        await test.step("Email and HTTP Actions return results in configured order", async () => {
          messages.splice(0);
          expect(httpReceiver.deliveries).toHaveLength(0);
          const submission = await submitPreviewFormViaMcp({
            url,
            input: {
              path: "/",
              selector: `[data-ws-managed-form-id="${combined.formId}"]`,
              values: [
                { name: "name", value: "Ada Lovelace" },
                { name: "email", value: "ada@example.test" },
                { name: "subject", value: "Combined delivery" },
                { name: "message", value: "One Form, two Actions" },
              ],
              submitter: "button[type=submit]",
              timeout: 30_000,
            },
          });
          expect(submission.ok).toBe(true);
          expect(submission.data).toMatchObject({
            status: "submitted",
            formState: "success",
            errors: [],
          });
          expect(submission.data.results).toEqual([
            expect.objectContaining({
              resourceId: combined.emailResourceId,
              resourceName: "Email to owner",
              status: 200,
            }),
            expect.objectContaining({
              resourceId: combined.httpResourceId,
              resourceName: "Combined HTTP action",
              status: 200,
            }),
          ]);
          expect(submission.data.exchanges).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                status: 200,
                url: expect.stringContaining("/__ws-form"),
              }),
            ])
          );

          expect(messages).toHaveLength(1);
          expect(messages[0]?.to).toEqual([{ address: "combined@mcp.test" }]);
          expect(messages[0]?.text).toBe("Combined action exact body.");
          expect(httpReceiver.deliveries).toHaveLength(1);
          expect(httpReceiver.deliveries[0]).toMatchObject({
            pathname: "/submit",
            method: "POST",
          });
          expect(httpReceiver.deliveries[0]?.contentType).toContain(
            "application/json"
          );
          expect(
            JSON.parse(httpReceiver.deliveries[0]?.body ?? "null")
          ).toEqual({
            name: "Ada Lovelace",
            email: "ada@example.test",
            subject: "Combined delivery",
            message: "One Form, two Actions",
          });
        });
      },
    });
  } finally {
    await Promise.all([
      new Promise<void>((resolve) => receiver.close(() => resolve())),
      httpReceiver.close(),
    ]);
  }
});
