import { execFile } from "node:child_process";
import { createServer } from "node:http";
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
  new URL("../fixtures/mcp-navigation-form-author.ts", import.meta.url)
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

const startSearchReceiver = async () => {
  const tags: Array<string | null> = [];
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://receiver.local");
    const tag = url.searchParams.get("tag");
    tags.push(tag);
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ query: JSON.stringify({ tag }) }));
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("Expected local search receiver port");
  }
  return {
    url: `http://127.0.0.1:${address.port}/search`,
    tags,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
};

const formIds = new Map<(typeof formats)[number][0], string>();
let navigationFormId: string;
let searchReceiver: Awaited<ReturnType<typeof startSearchReceiver>> | undefined;
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

  searchReceiver = await startSearchReceiver();
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
      searchReceiver.url,
      ...formats.map(([mode]) => mode),
    ],
    {
      timeout: 60_000,
      env: { ...process.env, TSX_TSCONFIG_PATH: cliTsconfigPath },
    }
  );
  const authored = JSON.parse(stdout) as {
    formatForms: Array<{ mode: (typeof formats)[number][0]; formId: string }>;
    navigationFormId: string;
  };
  expect(authored.formatForms).toHaveLength(formats.length);
  for (const { mode, formId } of authored.formatForms) {
    formIds.set(mode, formId);
  }
  navigationFormId = authored.navigationFormId;

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
    await Promise.all([receiver?.close(), searchReceiver?.close()]);
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

test.describe("Navigation without Form Actions", () => {
  test("MCP removes Form Actions to enable client-side query navigation and refresh filtered page Resources", async ({
    page,
  }) => {
    const activePreview = preview;
    const activeSearchReceiver = searchReceiver;
    if (activePreview === undefined || activeSearchReceiver === undefined) {
      throw new Error("Expected the navigation Preview fixture");
    }
    await page.route("**/*", (route) =>
      new URL(route.request().url()).hostname === "127.0.0.1"
        ? route.continue()
        : route.abort()
    );
    await page.goto(new URL("/search", activePreview.url).href);
    const marker = await page.evaluate(() => {
      const value = crypto.randomUUID();
      (
        window as Window & { navigationFormMarker?: string }
      ).navigationFormMarker = value;
      return value;
    });
    const form = page.locator(
      `[data-ws-managed-form-id="${navigationFormId}"]`
    );
    await expect(form).toHaveAttribute("action", "?__webstudio__=navigate");
    let resourceSubmissions = 0;
    page.on("request", (request) => {
      if (
        new URL(request.url()).pathname.startsWith("/__ws-form") &&
        request.method() === "POST"
      ) {
        resourceSubmissions += 1;
      }
    });
    for (const tags of [["second", "first"], ["first"]]) {
      await form.locator('input[name="name"]').fill("Ada");
      await form.locator('input[name="email"]').fill("ada@example.com");
      await form.locator('input[name="subject"]').fill("Search");
      await form.locator('textarea[name="message"]').fill("Filter results");
      await form.locator('select[name="tag"]').selectOption(tags);
      await form.getByRole("button", { name: "Submit" }).click();
      await expect
        .poll(() => new URL(page.url()).searchParams.getAll("tag"))
        .toEqual(tags);
      expect(new URL(page.url()).searchParams.has("__webstudio__")).toBe(false);
      await expect
        .poll(() =>
          page.evaluate(
            () =>
              (window as Window & { navigationFormMarker?: string })
                .navigationFormMarker
          )
        )
        .toBe(marker);
      const expectedTag = tags.join("|");
      await expect
        .poll(() => activeSearchReceiver.tags.at(-1))
        .toEqual(expectedTag);
      await expect(page.locator("#navigation-search-results")).toContainText(
        JSON.stringify(expectedTag)
      );
      await expect(form).toHaveAttribute("action", "?__webstudio__=navigate");
    }
    expect(resourceSubmissions).toBe(0);
  });
});
