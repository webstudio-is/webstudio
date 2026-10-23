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
import { submitPreviewFormViaMcp } from "../flows/mcp-preview-submit";

const execFileAsync = promisify(execFile);
const authorPath = fileURLToPath(
  new URL("../fixtures/mcp-managed-form-author.ts", import.meta.url)
);
const reactGlobalPath = fileURLToPath(
  new URL("../../../../scripts/register-react-global.ts", import.meta.url)
);

test("MCP-authored contact Form delivers customized Email messages locally", async ({
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
    authoredEmailResources.find(({ name }) => name === "Email to visitor")
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
        const submission = await submitPreviewFormViaMcp({
          url,
          input: {
            path: "/",
            selector: `[data-ws-managed-form-id="${formId}"]`,
            values: [
              { name: "name", value: "Ada Lovelace" },
              { name: "email", value: "ada@example.test" },
              { name: "subject", value: "MCP email test" },
              {
                name: "message",
                value: "This submission should become two local messages.",
              },
              {
                name: "upload",
                file: {
                  name: "notes.txt",
                  type: "text/plain",
                  base64: Buffer.from("MCP attachment payload").toString(
                    "base64"
                  ),
                },
              },
            ],
            submitter: "button[type=submit]",
            timeout: 30_000,
          },
        });
        expect(submission.data).toMatchObject({
          status: "submitted",
          formState: "success",
          errors: [],
        });
        expect(submission.data.results).toEqual(
          emailResourceIds.map((resourceId) =>
            expect.objectContaining({ resourceId, status: 200 })
          )
        );
        expect(receiver.messages).toHaveLength(2);

        const ownerMessage = receiver.messages.find((message) =>
          message.to.some(({ address }) => address === "owner@mcp.test")
        );
        const visitorMessage = receiver.messages.find((message) =>
          message.to.some(({ address }) => address === "ada@example.test")
        );
        expect(ownerMessage).toBeDefined();
        expect(visitorMessage).toBeDefined();
        expect(ownerMessage).toMatchObject({
          subject: "Contact form: MCP email test",
          text: expect.stringContaining("Name: Ada Lovelace"),
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
        expect(ownerMessage?.text).toContain("Email: ada@example.test");
        expect(ownerMessage?.text).toContain("Subject: MCP email test");
        expect(ownerMessage?.text).toContain("Page: http://127.0.0.1:");
        expect(visitorMessage?.subject).toBe(
          "Contact Form received your email: We received your message"
        );
        expect(visitorMessage?.text).toBe(
          "Thanks for contacting us. We will reply soon."
        );
        expect(visitorMessage?.attachments ?? []).toEqual([]);
      },
    });
  } finally {
    await receiver.close();
  }
});

test("custom recipients and Email overrides stay isolated between Forms", async ({
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
        for (const [id, expected] of [
          [formId, { subject: "First Form message" }],
          [secondFormId, { subject: "Second Form message" }],
        ] as const) {
          const submission = await submitPreviewFormViaMcp({
            url,
            input: {
              path: "/",
              selector: `[data-ws-managed-form-id="${id}"]`,
              values: [
                { name: "name", value: "MCP E2E visitor" },
                { name: "email", value: "visitor@example.test" },
                {
                  name: "subject",
                  value: `Visitor subject: ${expected.subject}`,
                },
                {
                  name: "message",
                  value: `Submitted through ${expected.subject}`,
                },
              ],
              submitter: "button[type=submit]",
              timeout: 30_000,
            },
          });
          expect(submission.data).toMatchObject({
            status: "submitted",
            formState: "success",
            errors: [],
          });
          expect(submission.data.results).toEqual([
            expect.objectContaining({
              resourceId: emailResourceIdsByForm[id === formId ? 0 : 1],
              status: 200,
            }),
          ]);
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

test("Email provider failure is not replayed, sibling succeeds, and a new submission gets a new message ID", async ({
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
  const { formId, emailResourceIds } = JSON.parse(stdout) as {
    formId: string;
    emailResourceIds: string[];
  };
  expect(emailResourceIds).toHaveLength(2);
  const requests: Array<{
    subject: string;
    to: Array<{ address: string }>;
    headers: { "X-Message-ID": string };
  }> = [];
  const receiver = createServer(async (request, response) => {
    const chunks: Buffer[] = [];
    for await (const chunk of request) {
      chunks.push(Buffer.from(chunk));
    }
    const email = JSON.parse(Buffer.concat(chunks).toString("utf8")) as {
      subject: string;
      to: Array<{ address: string }>;
      headers: { "X-Message-ID": string };
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
        const submit = async (name: string, message: string) =>
          await submitPreviewFormViaMcp({
            url,
            input: {
              path: "/",
              selector: `[data-ws-managed-form-id="${formId}"]`,
              values: [
                { name: "name", value: name },
                { name: "email", value: "visitor@example.test" },
                { name: "subject", value: "Message ID test" },
                { name: "message", value: message },
              ],
              submitter: "button[type=submit]",
              timeout: 30_000,
            },
          });
        const firstSubmission = await submit(
          "First local submission",
          "First submission"
        );
        expect(firstSubmission.data).toMatchObject({
          status: "submitted",
          formState: "error",
          results: [
            expect.objectContaining({
              resourceId: emailResourceIds[0],
              status: 503,
            }),
            expect.objectContaining({
              resourceId: emailResourceIds[1],
              status: 200,
            }),
          ],
          errors: [expect.objectContaining({ status: 503 })],
        });
        expect(requests).toHaveLength(2);
        const secondSubmission = await submit(
          "Second local submission",
          "Second submission"
        );
        expect(secondSubmission.data).toMatchObject({
          status: "submitted",
          formState: "success",
          errors: [],
        });
        expect(secondSubmission.data.results).toEqual(
          emailResourceIds.map((resourceId) =>
            expect.objectContaining({ resourceId, status: 200 })
          )
        );
        expect(requests).toHaveLength(4);

        const firstMessageId = requests[0].headers["X-Message-ID"];
        expect(firstMessageId).not.toBe("");
        expect(requests[1].headers["X-Message-ID"]).toBe(firstMessageId);
        const expectedSubjects = new Set([
          "Contact form: Message ID test",
          "Contact Form received your email: We received your message",
        ]);
        expect(
          new Set(requests.slice(0, 2).map(({ subject }) => subject))
        ).toEqual(expectedSubjects);
        const secondMessageIds = requests
          .slice(2)
          .map(({ headers }) => headers["X-Message-ID"]);
        expect(secondMessageIds[0]).toBe(secondMessageIds[1]);
        expect(secondMessageIds[0]).not.toBe(firstMessageId);
        expect(
          new Set(requests.slice(2).map(({ subject }) => subject))
        ).toEqual(expectedSubjects);
        expect(
          new Set(requests.slice(0, 2).map(({ to }) => to[0]?.address))
        ).toEqual(new Set(["owner@mcp.test", "visitor@example.test"]));
        expect(
          new Set(requests.slice(2).map(({ to }) => to[0]?.address))
        ).toEqual(new Set(["owner@mcp.test", "visitor@example.test"]));
      },
    });
  } finally {
    await new Promise<void>((resolve) => receiver.close(() => resolve()));
  }
});
