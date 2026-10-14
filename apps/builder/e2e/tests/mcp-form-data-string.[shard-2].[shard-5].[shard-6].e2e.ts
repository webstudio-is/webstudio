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
  page,
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
        await page.route("**/*", (route) =>
          new URL(route.request().url()).hostname === "127.0.0.1"
            ? route.continue()
            : route.abort()
        );
        await page.goto(url);
        const form = page.locator(`[data-ws-managed-form-id="${formId}"]`);
        await form.locator('input[name="name"]').fill("Ada Lovelace");
        await form.locator('input[name="email"]').fill("ada@example.test");
        await form.locator('input[name="subject"]').fill("Readable fields");
        await form
          .locator('textarea[name="message"]')
          .fill("Hello from Lisbon");
        await form.locator('input[name="profile.city"]').fill("Porto");
        await form.locator('input[name="tag"]').nth(0).fill("red");
        await form.locator('input[name="tag"]').nth(1).fill("blue");
        await form.locator('input[name="password"]').fill("private-secret-734");
        await form.locator('input[name="upload"]').setInputFiles({
          name: "project-brief.txt",
          mimeType: "text/plain",
          buffer: Buffer.from("A local-only attachment."),
        });

        const submission = page.waitForResponse(
          (response) =>
            new URL(response.url()).pathname.startsWith("/__ws-form") &&
            response.request().method() === "POST"
        );
        await form.getByRole("button", { name: "Submit" }).click();
        const response = await submission;
        expect(response.status(), JSON.stringify(await response.json())).toBe(
          200
        );
        await expect(form).toHaveAttribute("data-state", "success");
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
