import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { expect } from "@playwright/test";
import { loadDevBuild } from "../db";
import { createContentModeProject } from "../fixtures/content-mode-suite";
import {
  startLocalEmailReceiver,
  withMcpEmailPreview,
} from "../flows/mcp-email-preview";
import { test } from "../test";
import { submitPreviewFormViaMcp } from "../flows/mcp-preview-submit";

const execFileAsync = promisify(execFile);
const authorPath = fileURLToPath(
  new URL("../fixtures/mcp-managed-form-author.ts", import.meta.url)
);
const reactGlobalPath = fileURLToPath(
  new URL("../../../../scripts/register-react-global.ts", import.meta.url)
);
const cliTsconfigPath = fileURLToPath(
  new URL("../../../../packages/cli/tsconfig.local.json", import.meta.url)
);

test("MCP-authored Email Resources deliver multiple files and honor attachment opt-out", async ({
  context,
}) => {
  const fixture = await createContentModeProject({
    context,
    email: "mcp-email-attachments@webstudio.test",
    title: "MCP Email attachments",
    assetNamePrefix: "mcp-email-attachments-",
    builderToken: "mcp-email-attachments-builder-token",
  });
  const { stdout } = await execFileAsync(
    process.execPath,
    [
      "--import",
      "tsx",
      "--import",
      reactGlobalPath,
      "--conditions=webstudio",
      authorPath,
      fixture.projectId,
      "email-attachments",
    ],
    {
      timeout: 60_000,
      env: { ...process.env, TSX_TSCONFIG_PATH: cliTsconfigPath },
    }
  );
  const { formId, emailResourceIds } = JSON.parse(stdout) as {
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
  const receiver = await startLocalEmailReceiver();
  try {
    await withMcpEmailPreview({
      projectId: fixture.projectId,
      emailPort: receiver.port,
      callback: async ({ url }) => {
        const submission = await submitPreviewFormViaMcp({
          url,
          input: {
            path: "/",
            selector: `[data-ws-managed-form-id="${formId}"]`,
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
        expect(receiver.messages).toHaveLength(2);

        const owner = receiver.messages.find((message) =>
          message.to.some(({ address }) => address === "owner@mcp.test")
        );
        const visitor = receiver.messages.find((message) =>
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
      },
    });
  } finally {
    await receiver.close();
  }
});
