import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createServer } from "node:http";
import { promisify } from "node:util";
import { expect } from "@playwright/test";
import { createContentModeProject } from "../fixtures/content-mode-suite";
import { loadDevBuild } from "../db";
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

test("MCP-authored contact Form delivers customized Email messages locally", async ({
  page,
  context,
}) => {
  const fixture = await createContentModeProject({
    context,
    email: "mcp-email-delivery@webstudio.test",
    title: "MCP Email delivery",
    assetNamePrefix: "mcp-email-delivery-",
    builderToken: "mcp-email-delivery-builder-token",
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
      "email",
    ],
    {
      timeout: 60_000,
      env: {
        ...process.env,
        TSX_TSCONFIG_PATH: fileURLToPath(
          new URL(
            "../../../../packages/cli/tsconfig.local.json",
            import.meta.url
          )
        ),
      },
    }
  );
  const { formId, emailResourceIds } = JSON.parse(stdout) as {
    formId: string;
    emailResourceIds: string[];
  };
  expect(emailResourceIds).toHaveLength(2);
  const authoredBuild = await loadDevBuild({ projectId: fixture.projectId });
  const authoredResources = JSON.parse(authoredBuild.resources) as Array<{
    id: string;
    name: string;
    email?: Record<string, unknown>;
  }>;
  const authoredEmailResources = authoredResources.filter(({ id }) =>
    emailResourceIds.includes(id)
  );
  expect(authoredEmailResources).toHaveLength(2);
  expect(
    authoredEmailResources.find(({ name }) => name === "Visitor email field")
      ?.email
  ).toMatchObject({
    recipientMode: "visitor",
    visitorEmailField: "email",
  });
  expect(JSON.parse(authoredBuild.projectSettings)).toMatchObject({
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
        await page.route("**/*", (route) => {
          const target = new URL(route.request().url());
          return target.hostname === "127.0.0.1"
            ? route.continue()
            : route.abort();
        });
        await page.goto(url);
        const form = page.locator(`[data-ws-managed-form-id="${formId}"]`);
        await form.locator('input[name="name"]').fill("Ada Lovelace");
        await form.locator('input[name="email"]').fill("ada@example.test");
        await form.locator('input[name="subject"]').fill("MCP email test");
        await form
          .locator('textarea[name="message"]')
          .fill("This submission should become two local messages.");
        const upload = form.locator('input[name="upload"]');
        await expect(upload).toHaveCount(1);
        await upload.setInputFiles({
          name: "notes.txt",
          mimeType: "text/plain",
          buffer: Buffer.from("MCP attachment payload"),
        });

        const submission = page.waitForResponse(
          (response) =>
            new URL(response.url()).pathname.startsWith("/__ws-form") &&
            response.request().method() === "POST"
        );
        await form.getByRole("button", { name: "Submit" }).click();
        const submissionResponse = await submission;
        const submissionBody = await submissionResponse.json();
        expect(
          submissionResponse.status(),
          JSON.stringify(submissionBody)
        ).toBe(200);
        await expect(form).toHaveAttribute("data-state", "success");
        await expect.poll(() => receiver.messages.length).toBe(2);

        const ownerMessage = receiver.messages.find((message) =>
          message.to.some(({ address }) => address === "owner@mcp.test")
        );
        const visitorMessage = receiver.messages.find((message) =>
          message.to.some(({ address }) => address === "ada@example.test")
        );
        expect(ownerMessage).toBeDefined();
        expect(visitorMessage).toBeDefined();
        expect(ownerMessage).toMatchObject({
          subject: expect.stringContaining("MCP contact notification"),
          text: "A visitor sent a message through the contact form.",
          replyTo: { address: "forms@mcp.test", name: "Contact Form" },
          attachments: [
            {
              filename: "notes.txt",
              contentType: "text/plain",
              contentBase64: Buffer.from("MCP attachment payload").toString(
                "base64"
              ),
            },
          ],
        });
        expect(visitorMessage).toMatchObject({
          subject: expect.stringContaining("We received your message"),
          text: expect.stringContaining(
            "We received your request from http://127.0.0.1:"
          ),
          attachments: [
            {
              filename: "notes.txt",
              contentType: "text/plain",
              contentBase64: Buffer.from("MCP attachment payload").toString(
                "base64"
              ),
            },
          ],
        });
        expect(visitorMessage?.text).toContain(
          "Thanks for contacting us. We will reply soon."
        );
      },
    });
  } finally {
    await receiver.close();
  }
});

test("custom recipients and Email overrides stay isolated between Forms", async ({
  page,
  context,
}) => {
  const fixture = await createContentModeProject({
    context,
    email: "mcp-email-isolation@webstudio.test",
    title: "MCP Email isolation",
    assetNamePrefix: "mcp-email-isolation-",
    builderToken: "mcp-email-isolation-builder-token",
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
      JSON.stringify({ mode: "email-isolation" }),
    ],
    {
      timeout: 60_000,
      env: {
        ...process.env,
        TSX_TSCONFIG_PATH: fileURLToPath(
          new URL(
            "../../../../packages/cli/tsconfig.local.json",
            import.meta.url
          )
        ),
      },
    }
  );
  const { formId, secondFormId, emailResourceIdsByForm } = JSON.parse(
    stdout
  ) as {
    formId: string;
    secondFormId: string;
    emailResourceIdsByForm: [string, string];
  };
  expect(secondFormId).toBeDefined();
  expect(formId).not.toBe(secondFormId);
  expect(emailResourceIdsByForm).toHaveLength(2);
  expect(emailResourceIdsByForm[0]).not.toBe(emailResourceIdsByForm[1]);

  const receiver = await startLocalEmailReceiver();
  try {
    await withMcpEmailPreview({
      projectId: fixture.projectId,
      emailPort: receiver.port,
      callback: async ({ url }) => {
        await page.route("**/*", (route) => {
          const target = new URL(route.request().url());
          return target.hostname === "127.0.0.1"
            ? route.continue()
            : route.abort();
        });
        await page.goto(url);

        for (const [id, expected] of [
          [
            formId,
            {
              address: "first-form@mcp.test",
              subject: "First Form message",
              body: "Body override for the first Form.",
            },
          ],
          [
            secondFormId,
            {
              address: "second-form@mcp.test",
              subject: "Second Form message",
              body: "Body override for the second Form.",
            },
          ],
        ] as const) {
          const form = page.locator(`[data-ws-managed-form-id="${id}"]`);
          await form.locator('input[name="name"]').fill("MCP E2E visitor");
          await form
            .locator('input[name="email"]')
            .fill("visitor@example.test");
          await form
            .locator('input[name="subject"]')
            .fill(`Visitor subject: ${expected.subject}`);
          await form
            .locator('textarea[name="message"]')
            .fill(`Submitted through ${expected.subject}`);

          const submission = page.waitForResponse(
            (response) =>
              new URL(response.url()).pathname.startsWith("/__ws-form") &&
              response.request().method() === "POST"
          );
          await form.getByRole("button", { name: "Submit" }).click();
          const response = await submission;
          const responseBody = await response.json();
          expect(response.status(), JSON.stringify(responseBody)).toBe(200);
          await expect(form).toHaveAttribute("data-state", "success");
        }

        await expect.poll(() => receiver.messages.length).toBe(2);
        expect(receiver.messages).toEqual([
          expect.objectContaining({
            to: [expect.objectContaining({ address: "first-form@mcp.test" })],
            subject: expect.stringContaining("First Form message"),
            text: "Body override for the first Form.",
          }),
          expect.objectContaining({
            to: [expect.objectContaining({ address: "second-form@mcp.test" })],
            subject: expect.stringContaining("Second Form message"),
            text: "Body override for the second Form.",
          }),
        ]);
      },
    });
  } finally {
    await receiver.close();
  }
});

test("Email retries keep one submission reference and new submissions get a new one", async ({
  page,
  context,
}) => {
  const fixture = await createContentModeProject({
    context,
    email: "mcp-email-retry@webstudio.test",
    title: "MCP Email retry",
    assetNamePrefix: "mcp-email-retry-",
    builderToken: "mcp-email-retry-builder-token",
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
      "email",
    ],
    {
      timeout: 60_000,
      env: {
        ...process.env,
        TSX_TSCONFIG_PATH: fileURLToPath(
          new URL(
            "../../../../packages/cli/tsconfig.local.json",
            import.meta.url
          )
        ),
      },
    }
  );
  const { formId } = JSON.parse(stdout) as { formId: string };
  const requests: Array<{ subject: string; to: Array<{ address: string }> }> =
    [];
  const receiver = createServer(async (request, response) => {
    const chunks: Buffer[] = [];
    for await (const chunk of request) {
      chunks.push(Buffer.from(chunk));
    }
    const email = JSON.parse(Buffer.concat(chunks).toString("utf8")) as {
      subject: string;
      to: Array<{ address: string }>;
    };
    requests.push(email);
    response.writeHead(requests.length === 1 ? 503 : 200, {
      "content-type": "application/json",
    });
    response.end(
      JSON.stringify(
        requests.length === 1
          ? {
              error: {
                code: "temporary_failure",
                message: "Temporary local E2E failure",
                retryable: true,
              },
            }
          : { id: `local-email-${requests.length}` }
      )
    );
  });
  await new Promise<void>((resolve, reject) => {
    receiver.once("error", reject);
    receiver.listen(0, "127.0.0.1", resolve);
  });
  const address = receiver.address();
  if (address === null || typeof address === "string") {
    throw new Error("Expected a local Email Service receiver port");
  }
  try {
    await withMcpEmailPreview({
      projectId: fixture.projectId,
      emailPort: address.port,
      callback: async ({ url }) => {
        await page.route("**/*", (route) => {
          const target = new URL(route.request().url());
          return target.hostname === "127.0.0.1"
            ? route.continue()
            : route.abort();
        });
        await page.goto(url);
        const form = page.locator(`[data-ws-managed-form-id="${formId}"]`);
        await form.locator('input[name="name"]').fill("First local submission");
        await form.locator('input[name="email"]').fill("visitor@example.test");
        await form.locator('input[name="subject"]').fill("Reference test");
        await form.locator('textarea[name="message"]').fill("First submission");

        const firstResponse = page.waitForResponse(
          (response) =>
            new URL(response.url()).pathname.startsWith("/__ws-form") &&
            response.request().method() === "POST"
        );
        await form.getByRole("button", { name: "Submit" }).click();
        expect((await firstResponse).status()).toBe(200);
        await expect(form).toHaveAttribute("data-state", "success");
        await expect.poll(() => requests.length).toBe(3);

        await page.reload();
        const secondForm = page.locator(
          `[data-ws-managed-form-id="${formId}"]`
        );
        await secondForm
          .locator('input[name="name"]')
          .fill("Second local submission");
        await secondForm
          .locator('input[name="email"]')
          .fill("visitor@example.test");
        await secondForm
          .locator('input[name="subject"]')
          .fill("Reference test");
        await secondForm
          .locator('textarea[name="message"]')
          .fill("Second submission");
        const secondResponse = page.waitForResponse(
          (response) =>
            new URL(response.url()).pathname.startsWith("/__ws-form") &&
            response.request().method() === "POST"
        );
        await secondForm.getByRole("button", { name: "Submit" }).click();
        expect((await secondResponse).status()).toBe(200);
        await expect(secondForm).toHaveAttribute("data-state", "success");
        await expect.poll(() => requests.length).toBe(5);

        const getReference = (subject: string) => {
          const separator = subject.lastIndexOf(" [");
          expect(separator).toBeGreaterThan(0);
          expect(subject.endsWith("]")).toBe(true);
          return subject.slice(separator + 2, -1);
        };
        const firstReference = getReference(requests[0].subject);
        expect(firstReference).not.toBe("");
        expect(
          requests.slice(0, 3).map(({ subject }) => getReference(subject))
        ).toEqual([firstReference, firstReference, firstReference]);
        expect(requests[0]).toEqual(requests[2]);
        const secondReferences = requests
          .slice(3)
          .map(({ subject }) => getReference(subject));
        expect(secondReferences[0]).toBe(secondReferences[1]);
        expect(secondReferences[0]).not.toBe(firstReference);
        expect(
          new Set(requests.slice(0, 2).map(({ to }) => to[0]?.address))
        ).toEqual(new Set(["owner@mcp.test", "visitor@example.test"]));
        expect(
          new Set(requests.slice(3).map(({ to }) => to[0]?.address))
        ).toEqual(new Set(["owner@mcp.test", "visitor@example.test"]));
      },
    });
  } finally {
    await new Promise<void>((resolve) => receiver.close(() => resolve()));
  }
});
