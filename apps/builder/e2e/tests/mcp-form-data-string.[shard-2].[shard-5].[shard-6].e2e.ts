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
import { submitPreviewFormViaMcp } from "../flows/mcp-preview-submit";
import { test } from "../test";

const execFileAsync = promisify(execFile);
const authorPath = fileURLToPath(
  new URL("../fixtures/mcp-form-data-string-author.ts", import.meta.url)
);
const reactGlobalPath = fileURLToPath(
  new URL("../../../../scripts/register-react-global.ts", import.meta.url)
);
const cliTsconfigPath = fileURLToPath(
  new URL("../../../../packages/cli/tsconfig.local.json", import.meta.url)
);

test("MCP Email body serializes Form data as readable text without private fields", async ({
  context,
}) => {
  const fixture = await createContentModeProject({
    context,
    email: "mcp-form-data-string@webstudio.test",
    title: "MCP Form data string",
    assetNamePrefix: "mcp-form-data-string-",
    builderToken: "mcp-form-data-string-builder-token",
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
    ],
    {
      timeout: 60_000,
      env: { ...process.env, TSX_TSCONFIG_PATH: cliTsconfigPath },
    }
  );
  const { formId, ownerResourceId, expression } = JSON.parse(stdout) as {
    formId: string;
    ownerResourceId: string;
    expression: string;
  };
  expect(expression).toContain(".toString()");
  const build = await loadDevBuild({ projectId: fixture.projectId });
  const resources = JSON.parse(build.resources) as Array<{
    id: string;
    email?: { body?: string };
  }>;
  expect(resources.find(({ id }) => id === ownerResourceId)?.email?.body).toBe(
    expression
  );

  const receiver = await startLocalEmailReceiver();
  try {
    await withMcpEmailPreview({
      projectId: fixture.projectId,
      emailPort: receiver.port,
      callback: async ({ url }) => {
        const submission = (
          await submitPreviewFormViaMcp({
            url,
            input: {
              path: "/",
              selector: `[data-ws-managed-form-id="${formId}"]`,
              values: [
                { name: "name", value: "Ada Lovelace" },
                { name: "email", value: "ada@example.test" },
                { name: "subject", value: "Readable fields" },
                { name: "message", value: "Hello from Lisbon" },
                { name: "profile.city", value: "Porto" },
                { name: "tag", value: "red" },
                { name: "tag", value: "blue" },
                { name: "password", value: "private-secret-734" },
                {
                  name: "upload",
                  file: {
                    name: "project-brief.txt",
                    type: "text/plain",
                    base64: Buffer.from("A local-only attachment.").toString(
                      "base64"
                    ),
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
        expect(submission.results).toEqual([
          expect.objectContaining({ resourceId: ownerResourceId, status: 200 }),
        ]);
        await expect.poll(() => receiver.messages.length).toBe(1);

        const message = receiver.messages[0];
        expect(message.to).toEqual([
          expect.objectContaining({ address: "owner@mcp.test" }),
        ]);
        expect(message.text).toContain("Name: Ada Lovelace");
        expect(message.text).toContain("Profile.city: Porto");
        expect(message.text).toContain("Tag: red, blue");
        expect(message.text).toContain("Upload: project-brief.txt");
        expect(message.text).not.toContain("private-secret-734");
        expect(message.text).not.toContain("Password:");
        expect(message.text).not.toContain("ws--managed-form-id");
        expect(message.text).not.toContain("ws--managed-form-array-names");
        expect(message.text).not.toContain("ws--form-bot");
        expect(message.attachments).toEqual([
          expect.objectContaining({ filename: "project-brief.txt" }),
        ]);
      },
    });
  } finally {
    await receiver.close();
  }
});
