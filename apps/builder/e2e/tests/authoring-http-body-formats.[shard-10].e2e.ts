import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { expect } from "@playwright/test";
import { createContentModeProject } from "../fixtures/content-mode-suite";
import {
  startFormDeliveryReceiver,
  startGeneratedFormDeliveryPreview,
} from "../flows/generated-form-delivery";
import {
  startPreviewFormMcpClient,
  submitPreviewFormViaMcp,
} from "../flows/mcp-preview-submit";
import { test, withBrowserContext } from "../test";

test.describe.configure({ mode: "default" });

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

const formIds = new Map<(typeof formats)[number][0], string>();
let receiver: Awaited<ReturnType<typeof startFormDeliveryReceiver>> | undefined;
let preview:
  | Awaited<ReturnType<typeof startGeneratedFormDeliveryPreview>>
  | undefined;

test.beforeAll(async ({ browser }) => {
  await startPreviewFormMcpClient();
  const projectId = await withBrowserContext(browser, async (context) => {
    const fixture = await createContentModeProject({
      context,
      email: "mcp-http-formats@webstudio.test",
      title: "MCP HTTP body formats",
      assetNamePrefix: "mcp-http-formats-",
      builderToken: "mcp-http-formats-builder-token",
    });
    return fixture.projectId;
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
      projectId,
      ...formats.map(([mode]) => mode),
    ],
    {
      timeout: 60_000,
      env: { ...process.env, TSX_TSCONFIG_PATH: cliTsconfigPath },
    }
  );
  const authoredForms = stdout.trim().split("\n");
  expect(authoredForms).toHaveLength(formats.length);
  for (const [index, [mode]] of formats.entries()) {
    const { formId } = JSON.parse(authoredForms[index]) as { formId: string };
    formIds.set(mode, formId);
  }

  receiver = await startFormDeliveryReceiver();
  try {
    preview = await startGeneratedFormDeliveryPreview({
      projectId,
      receiverPort: receiver.port,
    });
  } catch (error) {
    await receiver.close();
    receiver = undefined;
    throw error;
  }
});

test.afterAll(async () => {
  try {
    await preview?.close();
  } finally {
    await receiver?.close();
  }
});

for (const [mode, contentType] of formats) {
  test(`MCP-authored Form sends HTTP body with ${mode}`, async () => {
    const formId = formIds.get(mode);
    const activeReceiver = receiver;
    const activePreview = preview;
    if (
      formId === undefined ||
      activeReceiver === undefined ||
      activePreview === undefined
    ) {
      throw new Error(`Expected ${mode} Preview fixture`);
    }
    const deliveryCount = activeReceiver.deliveries.length;
    const submission = (
      await submitPreviewFormViaMcp({
        url: activePreview.url,
        input: {
          path: "/",
          selector: `[data-ws-managed-form-id="${formId}"]`,
          values: [
            { name: "name", value: "Ada" },
            { name: "email", value: "ada@example.com" },
            { name: "subject", value: "Format test" },
            { name: "message", value: "Exact body text" },
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
      expect.objectContaining({ status: 200 }),
    ]);
    await expect
      .poll(() => activeReceiver.deliveries.length)
      .toBe(deliveryCount + 1);
    const delivery = activeReceiver.deliveries[deliveryCount];
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
      expect(delivery.contentType).toMatch(/^multipart\/form-data; boundary=/);
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
  });
}
