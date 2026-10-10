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
  new URL("../fixtures/mcp-managed-form-author.ts", import.meta.url)
);
const reactGlobalPath = fileURLToPath(
  new URL("../../../../scripts/register-react-global.ts", import.meta.url)
);
const cliTsconfigPath = fileURLToPath(
  new URL("../../../../packages/cli/tsconfig.local.json", import.meta.url)
);

test("MCP-authored Email Resources deliver multiple files and honor attachment opt-out", async ({
  page,
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
    ({ id, name }) =>
      emailResourceIds.includes(id) && name === "Project recipients"
  );
  const visitorResource = resources.find(
    ({ id, name }) =>
      emailResourceIds.includes(id) && name === "Visitor email field"
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
        await page.route("**/*", (route) =>
          new URL(route.request().url()).hostname === "127.0.0.1"
            ? route.continue()
            : route.abort()
        );
        await page.goto(url);
        const form = page.locator(`[data-ws-managed-form-id="${formId}"]`);
        await form.locator('input[name="name"]').fill("Ada Lovelace");
        await form.locator('input[name="email"]').fill("ada@example.test");
        await form
          .locator('input[name="subject"]')
          .fill("Attachment opt-out test");
        await form
          .locator('textarea[name="message"]')
          .fill("Checking separate file delivery settings.");
        const upload = form.locator('input[name="upload"]');
        await expect(upload).toHaveAttribute("type", "file");
        await expect(upload).toHaveAttribute("multiple", "");
        await upload.setInputFiles(files);

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
        await expect.poll(() => receiver.messages.length).toBe(2);

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
