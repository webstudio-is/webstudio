import { expect } from "@playwright/test";
import { createContentModeProject } from "../fixtures/content-mode-suite";
import { runFormAuthor } from "../flows/mcp-form-author";
import {
  startLocalEmailReceiver,
  withMcpEmailPreview,
} from "../flows/mcp-email-preview";
import { test } from "../test";
import {
  startPreviewFormMcpClient,
  submitPreviewFormViaMcp,
} from "../flows/mcp-preview-submit";

const twoPhaseTimeout = 240_000;

test("MCP Email binding changes share two production Preview phases", async ({
  context,
}) => {
  test.setTimeout(twoPhaseTimeout);
  await startPreviewFormMcpClient();
  const fixture = await createContentModeProject({
    context,
    email: "mcp-email-binding-scenarios@webstudio.test",
    title: "MCP Email binding scenarios",
    assetNamePrefix: "mcp-email-binding-scenarios-",
    builderToken: "mcp-email-binding-scenarios-builder-token",
  });
  const { stdout } = await runFormAuthor(
    "mcp-email-binding-author",
    fixture.projectId,
    "initial"
  );
  const { boundFormId, partialFormId } = JSON.parse(stdout) as {
    boundFormId: string;
    partialFormId: string;
  };

  const receiver = await startLocalEmailReceiver();
  const submit = async (url: string, formId: string, withUpload: boolean) => {
    const submission = await submitPreviewFormViaMcp({
      url,
      input: {
        path: "/",
        selector: '[data-ws-managed-form-id="' + formId + '"]',
        values: [
          { name: "name", value: "Ada Lovelace" },
          { name: "email", value: "ada@example.test" },
          { name: "subject", value: "Account question" },
          {
            name: "message",
            value: withUpload ? "Hello" : "Please send the project details.",
          },
          ...(withUpload
            ? [
                {
                  name: "upload",
                  file: {
                    name: "private-note.txt",
                    type: "text/plain",
                    base64: Buffer.from("Do not attach this file").toString(
                      "base64"
                    ),
                  },
                },
              ]
            : []),
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
      expect.objectContaining({ status: 200 }),
    ]);
  };

  try {
    await withMcpEmailPreview({
      projectId: fixture.projectId,
      emailPort: receiver.port,
      callback: async ({ url }) => {
        await test.step("bound values and recipients", async () => {
          await submit(url, boundFormId, false);
          await expect.poll(() => receiver.messages.length).toBe(1);
          expect(receiver.messages[0]).toMatchObject({
            to: [{ address: "ada@example.test" }],
            subject: expect.stringContaining("Bound: Account question"),
            text: "Message from Ada Lovelace: Please send the project details.",
            replyTo: { address: "ada@example.test" },
          });
        });
        await test.step("partial body update keeps sender and attachment settings", async () => {
          await submit(url, partialFormId, true);
          await expect.poll(() => receiver.messages.length).toBe(2);
          expect(receiver.messages[1]).toMatchObject({
            to: [{ address: "ada@example.test" }],
            text: "Custom confirmation",
            replyTo: { address: "team@example.test", name: "Contact Team" },
            fromName: "Contact Team",
          });
          expect(receiver.messages[1]?.attachments ?? []).toEqual([]);
        });
      },
    });

    await runFormAuthor(
      "mcp-email-binding-author",
      fixture.projectId,
      "updated",
      boundFormId,
      partialFormId
    );
    await withMcpEmailPreview({
      projectId: fixture.projectId,
      emailPort: receiver.port,
      callback: async ({ url }) => {
        await test.step("full reset restores project recipient and reply-to", async () => {
          await submit(url, boundFormId, false);
          await expect.poll(() => receiver.messages.length).toBe(3);
          expect(receiver.messages[2]).toMatchObject({
            to: [{ address: "owner@mcp.test" }],
            subject: expect.stringContaining("New form submission"),
            text: expect.stringContaining("Form data:"),
            replyTo: { address: "forms@mcp.test", name: "Contact Form" },
          });
        });
        await test.step("empty body keeps recipient and sender settings", async () => {
          await submit(url, partialFormId, true);
          await expect.poll(() => receiver.messages.length).toBe(4);
          expect(receiver.messages[3]).toMatchObject({
            to: [{ address: "ada@example.test" }],
            text: "",
            replyTo: { address: "team@example.test", name: "Contact Team" },
            fromName: "Contact Team",
          });
          expect(receiver.messages[3]?.attachments ?? []).toEqual([]);
        });
      },
    });
  } finally {
    await receiver.close();
  }
});
