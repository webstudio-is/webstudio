import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { expect } from "@playwright/test";
import { createContentModeProject } from "../fixtures/content-mode-suite";
import {
  startFormDeliveryReceiver,
  withGeneratedFormDeliveryPreview,
} from "../flows/generated-form-delivery";
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
const formats = [
  ["format-json", "application/json"],
  ["format-multipart", "multipart/form-data"],
  ["format-text", "text/plain"],
] as const;

for (const [mode, contentType] of formats) {
  test(`MCP-authored Form sends HTTP body with ${mode}`, async ({
    page,
    context,
  }) => {
    const fixture = await createContentModeProject({
      context,
      email: `mcp-${mode}@webstudio.test`,
      title: `MCP HTTP ${mode}`,
      assetNamePrefix: `mcp-${mode}-`,
      builderToken: `mcp-${mode}-builder-token`,
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
        mode,
      ],
      {
        timeout: 60_000,
        env: { ...process.env, TSX_TSCONFIG_PATH: cliTsconfigPath },
      }
    );
    const { formId } = JSON.parse(stdout) as { formId: string };
    const receiver = await startFormDeliveryReceiver();
    try {
      await withGeneratedFormDeliveryPreview({
        projectId: fixture.projectId,
        receiverPort: receiver.port,
        callback: async ({ url }) => {
          await page.route("**/*", (route) => {
            const target = new URL(route.request().url());
            return target.hostname === "127.0.0.1"
              ? route.continue()
              : route.abort();
          });
          await page.goto(url);
          const form = page.locator(`[data-ws-managed-form-id="${formId}"]`);
          await form.locator('input[name="name"]').fill("Ada");
          await form.locator('input[name="email"]').fill("ada@example.com");
          await form.locator('input[name="subject"]').fill("Format test");
          await form
            .locator('textarea[name="message"]')
            .fill("Exact body text");
          const responsePromise = page.waitForResponse(
            (response) =>
              new URL(response.url()).pathname.startsWith("/__ws-form") &&
              response.request().method() === "POST"
          );
          await form.getByRole("button", { name: "Submit" }).click();
          const response = await responsePromise;
          expect(response.status()).toBe(200);
          await expect(form).toHaveAttribute("data-state", "success");
          expect(receiver.deliveries).toHaveLength(1);
          const delivery = receiver.deliveries[0];
          expect(delivery).toBeDefined();
          if (delivery === undefined) {
            throw new Error("Expected the formatted HTTP delivery");
          }
          expect(delivery.pathname).toBe("/submit");
          expect(delivery.method).toBe("POST");
          expect(delivery.contentType).toContain(contentType);
          if (mode === "format-json") {
            expect(delivery.contentType).toBe("application/json");
            expect(JSON.parse(delivery.body)).toEqual({
              sender: "ada@example.com",
              message: "Exact body text",
            });
          } else if (mode === "format-text") {
            expect(delivery.contentType).toBe("text/plain");
            expect(delivery.body).toBe("Exact body text");
          } else {
            expect(delivery.contentType).toMatch(
              /^multipart\/form-data; boundary=/
            );
            const multipart = await new Request("http://127.0.0.1/submit", {
              method: "POST",
              headers: { "content-type": delivery.contentType },
              body: Uint8Array.from(delivery.bodyBytes),
            }).formData();
            expect(Array.from(multipart.keys()).sort()).toEqual([
              "message",
              "sender",
            ]);
            expect(multipart.get("message")).toBe("Exact body text");
            expect(multipart.get("sender")).toBe("ada@example.com");
          }
        },
      });
    } finally {
      await receiver.close();
    }
  });
}
