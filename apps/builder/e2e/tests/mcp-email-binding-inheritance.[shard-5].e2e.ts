import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { expect } from "@playwright/test";
import { createContentModeProject } from "../fixtures/content-mode-suite";
import {
  startLocalEmailReceiver,
  withMcpEmailPreview,
} from "../flows/mcp-email-preview";
import { test } from "../test";
import { submitPreviewFormViaMcp } from "../flows/mcp-preview-submit";

// Both tests run two MCP authoring and generated preview phases.
const twoPhaseTimeout = 240_000;

const execFileAsync = promisify(execFile);
const reactGlobalPath = fileURLToPath(
  new URL("../../../../scripts/register-react-global.ts", import.meta.url)
);
const cliTsconfigPath = fileURLToPath(
  new URL("../../../../packages/cli/tsconfig.local.json", import.meta.url)
);
const initialAuthorPath = fileURLToPath(
  new URL("../fixtures/mcp-managed-form-author.ts", import.meta.url)
);
const bindingAuthorPath = fileURLToPath(
  new URL("../fixtures/mcp-email-binding-author.ts", import.meta.url)
);
const author = async (
  projectId: string,
  path: string,
  mode: string,
  formId?: string
) => {
  const { stdout } = await execFileAsync(
    process.execPath,
    [
      "--import",
      "tsx",
      "--import",
      reactGlobalPath,
      "--conditions=webstudio",
      path,
      projectId,
      mode,
      ...(formId === undefined ? [] : [formId]),
    ],
    {
      timeout: 60_000,
      env: { ...process.env, TSX_TSCONFIG_PATH: cliTsconfigPath },
    }
  );
  return JSON.parse(stdout) as { formId: string };
};

test("MCP Email bindings deliver values and full reset restores project recipients and reply-to", async ({
  context,
}) => {
  test.setTimeout(twoPhaseTimeout);
  const fixture = await createContentModeProject({
    context,
    email: "mcp-email-binding@webstudio.test",
    title: "MCP Email binding and inheritance",
    assetNamePrefix: "mcp-email-binding-",
    builderToken: "mcp-email-binding-builder-token",
  });
  const { formId } = await author(
    fixture.projectId,
    initialAuthorPath,
    "email"
  );
  await author(fixture.projectId, bindingAuthorPath, "bind", formId);
  const receiver = await startLocalEmailReceiver();
  try {
    const submit = async (url: string) => {
      const submission = await submitPreviewFormViaMcp({
        url,
        input: {
          path: "/",
          selector: `[data-ws-managed-form-id="${formId}"]`,
          values: [
            { name: "name", value: "Ada Lovelace" },
            { name: "email", value: "ada@example.test" },
            { name: "subject", value: "Account question" },
            { name: "message", value: "Please send the project details." },
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

    await withMcpEmailPreview({
      projectId: fixture.projectId,
      emailPort: receiver.port,
      callback: async ({ url }) => submit(url),
    });
    await expect.poll(() => receiver.messages.length).toBe(1);
    expect(receiver.messages[0]).toMatchObject({
      to: [{ address: "ada@example.test" }],
      subject: expect.stringContaining("Bound: Account question"),
      text: "Message from Ada Lovelace: Please send the project details.",
      replyTo: { address: "ada@example.test" },
    });

    await author(fixture.projectId, bindingAuthorPath, "reset", formId);
    await withMcpEmailPreview({
      projectId: fixture.projectId,
      emailPort: receiver.port,
      callback: async ({ url }) => submit(url),
    });
    await expect.poll(() => receiver.messages.length).toBe(2);
    expect(receiver.messages[1]).toMatchObject({
      to: [{ address: "owner@mcp.test" }],
      subject: expect.stringContaining("New form submission"),
      text: expect.stringContaining("Form data:"),
      replyTo: { address: "forms@mcp.test", name: "Contact Form" },
    });
  } finally {
    await receiver.close();
  }
});

test("MCP partial Email body updates preserve recipient, sender, and attachment settings", async ({
  context,
}) => {
  test.setTimeout(twoPhaseTimeout);
  const fixture = await createContentModeProject({
    context,
    email: "mcp-email-partial@webstudio.test",
    title: "MCP partial Email update",
    assetNamePrefix: "mcp-email-partial-",
    builderToken: "mcp-email-partial-builder-token",
  });
  const { formId } = await author(
    fixture.projectId,
    initialAuthorPath,
    "email"
  );
  await author(fixture.projectId, bindingAuthorPath, "partial", formId);
  const receiver = await startLocalEmailReceiver();
  try {
    const submit = async (url: string) => {
      const submission = await submitPreviewFormViaMcp({
        url,
        input: {
          path: "/",
          selector: `[data-ws-managed-form-id="${formId}"]`,
          values: [
            { name: "name", value: "Ada Lovelace" },
            { name: "email", value: "ada@example.test" },
            { name: "subject", value: "Account question" },
            { name: "message", value: "Hello" },
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
    await withMcpEmailPreview({
      projectId: fixture.projectId,
      emailPort: receiver.port,
      callback: async ({ url }) => submit(url),
    });
    await expect.poll(() => receiver.messages.length).toBe(1);
    expect(receiver.messages[0]).toMatchObject({
      to: [{ address: "ada@example.test" }],
      text: "Custom confirmation",
      replyTo: { address: "team@example.test", name: "Contact Team" },
      fromName: "Contact Team",
    });
    expect(receiver.messages[0]?.attachments ?? []).toEqual([]);

    await author(fixture.projectId, bindingAuthorPath, "empty", formId);
    await withMcpEmailPreview({
      projectId: fixture.projectId,
      emailPort: receiver.port,
      callback: async ({ url }) => submit(url),
    });
    await expect.poll(() => receiver.messages.length).toBe(2);
    expect(receiver.messages[1]).toMatchObject({
      to: [{ address: "ada@example.test" }],
      text: "",
      replyTo: { address: "team@example.test", name: "Contact Team" },
      fromName: "Contact Team",
    });
    expect(receiver.messages[1]?.attachments ?? []).toEqual([]);
  } finally {
    await receiver.close();
  }
});
