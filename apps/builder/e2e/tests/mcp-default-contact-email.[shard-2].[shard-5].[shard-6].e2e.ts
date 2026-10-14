import { execFile } from "node:child_process";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { expect } from "@playwright/test";
import { encodeDataSourceVariable } from "@webstudio-is/sdk";
import { formDataParameterName } from "@webstudio-is/sdk/runtime";
import { createContentModeProject } from "../fixtures/content-mode-suite";
import { loadDevBuild } from "../db";
import {
  startLocalEmailReceiver,
  withMcpEmailPreview,
  type CapturedEmail,
} from "../flows/mcp-email-preview";
import { test } from "../test";
import { submitPreviewFormViaMcp } from "../flows/mcp-preview-submit";

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

const submitContactForm = async (url: string, formId: string) =>
  await submitPreviewFormViaMcp({
    url,
    input: {
      path: "/",
      selector: `[data-ws-managed-form-id="${formId}"]`,
      values: [
        { name: "name", value: "Ada Lovelace" },
        { name: "email", value: "ada@example.test" },
        { name: "subject", value: "A question" },
        { name: "message", value: "Please get back to me about the project." },
        {
          name: "attachment",
          file: {
            name: "project-brief.txt",
            type: "text/plain",
            base64: Buffer.from("Please review this project brief.").toString(
              "base64"
            ),
          },
        },
      ],
      submitter: "button[type=submit]",
      timeout: 30_000,
    },
  });

test("MCP-inserted default contact Form sends its automatic owner message and visitor confirmation", async ({
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
  const dataSources = JSON.parse(build.dataSources) as Array<{
    id: string;
    name: string;
    scopeInstanceId?: string;
  }>;
  const formData = dataSources.find(
    ({ name, scopeInstanceId }) =>
      name === formDataParameterName && scopeInstanceId === formId
  );
  expect(formData).toBeDefined();
  expect(
    resources.find(({ id }) => id === ownerResourceId)?.email
  ).toMatchObject({
    recipientMode: "project",
    body: expect.stringContaining(encodeDataSourceVariable(formData!.id)),
  });
  expect(
    resources.find(({ id }) => id === visitorResourceId)?.email
  ).toMatchObject({
    recipientMode: "visitor",
    visitorEmailField: "email",
    subject: expect.stringContaining(".subject"),
    body: JSON.stringify(
      "Thank you for your message.\n\nWe received it and will respond as soon as possible."
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
        const submission = await submitContactForm(url, formId);
        expect(submission.ok).toBe(true);
        expect(submission.data).toMatchObject({
          status: "submitted",
          formState: "success",
          errors: [],
        });
        expect(submission.data.results).toEqual([
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
          subject: expect.stringContaining("Contact form: A question"),
          replyTo: { address: "forms@mcp.test", name: "Contact Form" },
        });
        expect(owner?.text).toContain(`Page: ${new URL(url).origin}`);
        expect(owner?.text).toContain("Name: Ada Lovelace");
        expect(owner?.text).toContain("Email: ada@example.test");
        expect(owner?.text).toContain("Subject: A question");
        expect(owner?.text).toContain(
          "Message: Please get back to me about the project."
        );
        expect(owner?.text).toContain("Attachment: project-brief.txt");
        expect(owner?.attachments).toEqual([
          expect.objectContaining({
            filename: "project-brief.txt",
            contentType: "text/plain",
            contentBase64: Buffer.from(
              "Please review this project brief."
            ).toString("base64"),
          }),
        ]);
        expect(visitor).toMatchObject({
          subject: expect.stringContaining(
            "Contact Form received your email: A question"
          ),
          text: expect.stringContaining(
            "Thank you for your message.\n\nWe received it and will respond as soon as possible.\n\nContact Form"
          ),
        });
        expect(visitor?.attachments ?? []).toEqual([]);
      },
    });
  } finally {
    await receiver.close();
  }
});

test("failed visitor confirmation stays nonfatal while the owner Email succeeds", async ({
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
        const submission = await submitContactForm(url, formId);
        expect(submission.data.status).toBe("submitted");
        expect(submission.data.results).toEqual([
          expect.objectContaining({ resourceId: ownerResourceId, status: 200 }),
          expect.objectContaining({
            resourceId: visitorResourceId,
            status: 429,
          }),
        ]);
        expect(submission.data.errors).toEqual([
          expect.objectContaining({
            status: 429,
            message: "Form resource returned HTTP 429",
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
