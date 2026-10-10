import { execFile } from "node:child_process";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { expect, type Page } from "@playwright/test";
import { createContentModeProject } from "../fixtures/content-mode-suite";
import { loadDevBuild } from "../db";
import {
  startLocalEmailReceiver,
  withMcpEmailPreview,
  type CapturedEmail,
} from "../flows/mcp-email-preview";
import { test } from "../test";

const execFileAsync = promisify(execFile);
const authorPath = fileURLToPath(
  new URL("../fixtures/mcp-default-contact-email-author.ts", import.meta.url)
);
const reactGlobalPath = fileURLToPath(
  new URL("../../../../scripts/register-react-global.ts", import.meta.url)
);
const cliTsconfigPath = fileURLToPath(
  new URL("../../../../packages/cli/tsconfig.local.json", import.meta.url)
);

const authorDefaultContactForm = async (projectId: string) => {
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
    ],
    {
      timeout: 60_000,
      env: { ...process.env, TSX_TSCONFIG_PATH: cliTsconfigPath },
    }
  );
  return JSON.parse(stdout) as {
    formId: string;
    ownerResourceId: string;
    visitorResourceId: string;
  };
};

const submitContactForm = async (page: Page, url: string, formId: string) => {
  await page.route("**/*", (route) =>
    new URL(route.request().url()).hostname === "127.0.0.1"
      ? route.continue()
      : route.abort()
  );
  await page.goto(url);
  const form = page.locator(`[data-ws-managed-form-id="${formId}"]`);
  await form.locator('input[name="name"]').fill("Ada Lovelace");
  await form.locator('input[name="email"]').fill("ada@example.test");
  await form.locator('input[name="subject"]').fill("A question");
  await form
    .locator('textarea[name="message"]')
    .fill("Please get back to me about the project.");
  const submission = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname.startsWith("/__ws-form") &&
      response.request().method() === "POST"
  );
  await form.getByRole("button", { name: "Submit" }).click();
  const response = await submission;
  const body = await response.json();
  expect(response.status(), JSON.stringify(body)).toBe(200);
  await expect(form).toHaveAttribute("data-state", "success");
  return body as {
    success: boolean;
    results: Array<{ resourceId: string; status: number; body: unknown }>;
    errors: Array<{
      resourceId: string;
      status: number;
      message: string;
    }>;
  };
};

test("MCP-inserted default contact Form sends its automatic owner message and visitor confirmation", async ({
  page,
  context,
}) => {
  const fixture = await createContentModeProject({
    context,
    email: "mcp-default-contact@webstudio.test",
    title: "MCP default contact Form",
    assetNamePrefix: "mcp-default-contact-",
    builderToken: "mcp-default-contact-builder-token",
  });
  const { formId, ownerResourceId, visitorResourceId } =
    await authorDefaultContactForm(fixture.projectId);
  const build = await loadDevBuild({ projectId: fixture.projectId });
  const resources = JSON.parse(build.resources) as Array<{
    id: string;
    email?: Record<string, unknown>;
  }>;
  expect(resources.find(({ id }) => id === ownerResourceId)?.email).toEqual({
    recipientMode: "project",
  });
  expect(
    resources.find(({ id }) => id === visitorResourceId)?.email
  ).toMatchObject({
    recipientMode: "visitor",
    visitorEmailField: "email",
    subject: JSON.stringify("We received your message"),
    body: JSON.stringify(
      "Thanks for contacting us. We received your message and will get back to you soon."
    ),
  });
  expect(JSON.parse(build.projectSettings)).toMatchObject({
    meta: {
      contactEmail: "owner@mcp.test",
      emailSender: "Contact Form <forms@mcp.test>",
    },
  });
  const receiver = await startLocalEmailReceiver();
  try {
    await withMcpEmailPreview({
      projectId: fixture.projectId,
      emailPort: receiver.port,
      callback: async ({ url }) => {
        const submission = await submitContactForm(page, url, formId);
        expect(submission).toMatchObject({ success: true, errors: [] });
        expect(submission.results).toEqual([
          expect.objectContaining({ resourceId: ownerResourceId, status: 200 }),
          expect.objectContaining({
            resourceId: visitorResourceId,
            status: 200,
          }),
        ]);
        await expect.poll(() => receiver.messages.length).toBe(2);
        const owner = receiver.messages.find((message) =>
          message.to.some(({ address }) => address === "owner@mcp.test")
        );
        const visitor = receiver.messages.find((message) =>
          message.to.some(({ address }) => address === "ada@example.test")
        );
        expect(owner).toMatchObject({
          subject: expect.stringContaining("New form submission"),
          replyTo: { address: "forms@mcp.test", name: "Contact Form" },
        });
        expect(owner?.text).toContain("Form data:");
        expect(owner?.text).toContain("Browser info:");
        for (const value of [
          "Ada Lovelace",
          "ada@example.test",
          "A question",
          "Please get back to me about the project.",
        ]) {
          expect(owner?.text).toContain(value);
        }
        expect(visitor).toMatchObject({
          subject: expect.stringContaining("We received your message"),
          text: expect.stringContaining(
            "Thanks for contacting us. We received your message and will get back to you soon."
          ),
        });
        expect(visitor?.text).toContain(
          `We received your request from ${new URL(url).origin}`
        );
      },
    });
  } finally {
    await receiver.close();
  }
});

test("failed visitor confirmation stays nonfatal while the owner Email succeeds", async ({
  page,
  context,
}) => {
  const fixture = await createContentModeProject({
    context,
    email: "mcp-nonfatal-confirmation@webstudio.test",
    title: "MCP nonfatal confirmation",
    assetNamePrefix: "mcp-nonfatal-confirmation-",
    builderToken: "mcp-nonfatal-confirmation-builder-token",
  });
  const { formId, ownerResourceId, visitorResourceId } =
    await authorDefaultContactForm(fixture.projectId);
  const messages: CapturedEmail[] = [];
  const server = createServer(async (request, response) => {
    const chunks: Buffer[] = [];
    for await (const chunk of request) {
      chunks.push(Buffer.from(chunk));
    }
    const message = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    messages.push(message);
    response.setHeader("content-type", "application/json");
    if (
      message.to.some(
        ({ address }: { address: string }) => address === "ada@example.test"
      )
    ) {
      response.writeHead(429);
      response.end(
        JSON.stringify({
          error: {
            code: "email_rate_limited",
            message: "Email sending limit reached",
          },
        })
      );
      return;
    }
    response.writeHead(200);
    response.end(JSON.stringify({ id: "owner-delivered" }));
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("Expected a local Email receiver port");
  }
  try {
    await withMcpEmailPreview({
      projectId: fixture.projectId,
      emailPort: address.port,
      callback: async ({ url }) => {
        const submission = await submitContactForm(page, url, formId);
        expect(submission.success).toBe(true);
        expect(submission.results).toEqual([
          expect.objectContaining({ resourceId: ownerResourceId, status: 200 }),
          expect.objectContaining({
            resourceId: visitorResourceId,
            status: 429,
            body: {
              error: {
                code: "email_rate_limited",
                message: "Email sending limit reached",
              },
            },
          }),
        ]);
        expect(submission.errors).toEqual([
          expect.objectContaining({
            resourceId: visitorResourceId,
            status: 429,
            message: "Email sending limit reached",
          }),
        ]);
        expect(messages).toHaveLength(2);
        expect(
          messages.some((message) =>
            message.to.some(({ address }) => address === "owner@mcp.test")
          )
        ).toBe(true);
      },
    });
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
