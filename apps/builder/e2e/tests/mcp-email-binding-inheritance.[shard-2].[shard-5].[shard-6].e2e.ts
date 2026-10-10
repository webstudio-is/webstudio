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

test("MCP Email bindings deliver values and reset to Project Settings inheritance", async ({
  page,
  context,
}) => {
  const fixture = await createContentModeProject({
    context,
    email: "mcp-email-binding@webstudio.test",
    title: "MCP Email binding and inheritance",
    assetNamePrefix: "mcp-email-binding-",
    builderToken: "mcp-email-binding-builder-token",
  });
  const author = async (path: string, mode: string) => {
    const { stdout } = await execFileAsync(
      process.execPath,
      [
        "--import",
        "tsx",
        "--import",
        reactGlobalPath,
        "--conditions=webstudio",
        path,
        fixture.projectId,
        mode,
      ],
      {
        timeout: 60_000,
        env: { ...process.env, TSX_TSCONFIG_PATH: cliTsconfigPath },
      }
    );
    return JSON.parse(stdout) as { formId: string };
  };
  await author(initialAuthorPath, "email");
  const { formId } = await author(bindingAuthorPath, "bind");
  const receiver = await startLocalEmailReceiver();
  try {
    await page.route("**/*", (route) =>
      new URL(route.request().url()).hostname === "127.0.0.1"
        ? route.continue()
        : route.abort()
    );
    const submit = async (url: string) => {
      await page.goto(url);
      const form = page.locator(`[data-ws-managed-form-id="${formId}"]`);
      await form.locator('input[name="name"]').fill("Ada Lovelace");
      await form.locator('input[name="email"]').fill("ada@example.test");
      await form.locator('input[name="subject"]').fill("Account question");
      await form
        .locator('textarea[name="message"]')
        .fill("Please send the project details.");
      const responsePromise = page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname.startsWith("/__ws-form") &&
          response.request().method() === "POST"
      );
      await form.getByRole("button", { name: "Submit" }).click();
      const response = await responsePromise;
      const result = await response.json();
      expect(response.status(), JSON.stringify(result)).toBe(200);
      await expect(form).toHaveAttribute("data-state", "success");
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

    await author(bindingAuthorPath, "reset");
    await withMcpEmailPreview({
      projectId: fixture.projectId,
      emailPort: receiver.port,
      callback: async ({ url }) => submit(url),
    });
    await expect.poll(() => receiver.messages.length).toBe(2);
    expect(receiver.messages[1]).toMatchObject({
      to: [{ address: "owner@mcp.test" }],
      subject: expect.stringContaining("Inherited project subject"),
      text: "Inherited project body.",
      replyTo: { address: "forms@mcp.test", name: "Contact Form" },
    });
  } finally {
    await receiver.close();
  }
});
