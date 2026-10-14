import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { expect } from "@playwright/test";
import { createContentModeProject } from "../fixtures/content-mode-suite";
import {
  startFormDeliveryReceiver,
  withGeneratedFormDeliveryPreview,
} from "../flows/generated-form-delivery";
import { withGeneratedPreview } from "../flows/generated-app";
import { submitPreviewFormViaMcp } from "../flows/mcp-preview-submit";
import { test } from "../test";

const execFileAsync = promisify(execFile);
const authorPath = fileURLToPath(
  new URL("../fixtures/mcp-managed-form-author.ts", import.meta.url)
);
const reactGlobalPath = fileURLToPath(
  new URL("../../../../scripts/register-react-global.ts", import.meta.url)
);

test("MCP-authored Form uses query navigation when no Actions are connected", async ({
  page,
  context,
}) => {
  const fixture = await createContentModeProject({
    context,
    email: "mcp-form-empty-actions@webstudio.test",
    title: "MCP Form empty Actions",
    assetNamePrefix: "mcp-form-empty-actions-",
    builderToken: "mcp-form-empty-actions-builder-token",
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
      "empty-action",
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
  const formRequests: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/__ws-form")) {
      formRequests.push(request.url());
    }
  });
  await withGeneratedPreview({
    projectId: fixture.projectId,
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
      await form.locator('input[name="subject"]').fill("No Action test");
      await form.locator('textarea[name="message"]').fill("No dispatch");
      await expect(form).toHaveAttribute("action", "?__webstudio__=navigate");
      await form.getByRole("button", { name: "Submit" }).click();
      await expect
        .poll(() => new URL(page.url()).searchParams.get("name"))
        .toBe("Ada");
      expect(new URL(page.url()).searchParams.get("email")).toBe(
        "ada@example.com"
      );
      expect(new URL(page.url()).searchParams.get("subject")).toBe(
        "No Action test"
      );
      expect(new URL(page.url()).searchParams.get("message")).toBe(
        "No dispatch"
      );
      expect(formRequests).toEqual([]);
    },
  });
});

test("MCP-authored generated Form delivers one Action and reports the next failure", async ({
  context,
}) => {
  const fixture = await createContentModeProject({
    context,
    email: "mcp-form-delivery@webstudio.test",
    title: "MCP Form delivery",
    assetNamePrefix: "mcp-form-delivery-",
    builderToken: "mcp-form-delivery-builder-token",
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
      "delivery",
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
  const { formId, resourceId, successfulResourceId } = JSON.parse(stdout) as {
    formId: string;
    resourceId: string;
    successfulResourceId: string;
  };
  const receiver = await startFormDeliveryReceiver();
  try {
    await withGeneratedFormDeliveryPreview({
      projectId: fixture.projectId,
      receiverPort: receiver.port,
      callback: async ({ url }) => {
        const submission = (
          await submitPreviewFormViaMcp({
            url,
            input: {
              path: "/",
              selector: `[data-ws-managed-form-id="${formId}"]`,
              values: [
                { name: "name", value: "Ada" },
                { name: "email", value: "ada@example.com" },
                { name: "subject", value: "Delivery test" },
                { name: "message", value: "Actual local delivery" },
              ],
              submitter: "button[type=submit]",
              timeout: 30_000,
            },
          })
        ).data;
        expect(submission).toMatchObject({
          status: "submitted",
          formState: "error",
        });
        expect(submission.results).toEqual([
          expect.objectContaining({
            resourceId: successfulResourceId,
            resourceName: "Received HTTP action",
            status: 200,
          }),
          expect.objectContaining({
            resourceId,
            resourceName: "Blocked HTTP action",
            status: 503,
          }),
        ]);
        expect(submission.errors).toEqual(
          expect.arrayContaining([expect.objectContaining({ status: 503 })])
        );
        expect(submission.exchanges).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              status: 502,
              url: expect.stringContaining("/__ws-form"),
            }),
          ])
        );
        expect(
          receiver.deliveries.map(({ pathname }) => pathname).sort()
        ).toEqual(["/reject", "/reject", "/submit"]);
        const successfulDelivery = receiver.deliveries.find(
          ({ pathname }) => pathname === "/submit"
        );
        expect(successfulDelivery).toBeDefined();
        if (successfulDelivery === undefined) {
          throw new Error("Expected the successful Form delivery");
        }
        expect(successfulDelivery).toMatchObject({ method: "POST" });
        expect(successfulDelivery.contentType).toContain("application/json");
        expect(JSON.parse(successfulDelivery.body)).toMatchObject({
          name: "Ada",
          email: "ada@example.com",
          subject: "Delivery test",
          message: "Actual local delivery",
        });
      },
    });
  } finally {
    await receiver.close();
  }
});

test("MCP-authored generated Form sends uploaded files as multipart by default", async ({
  context,
}) => {
  const fixture = await createContentModeProject({
    context,
    email: "mcp-form-multipart@webstudio.test",
    title: "MCP Form multipart delivery",
    assetNamePrefix: "mcp-form-multipart-",
    builderToken: "mcp-form-multipart-builder-token",
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
      "multipart",
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
  const receiver = await startFormDeliveryReceiver();
  try {
    await withGeneratedFormDeliveryPreview({
      projectId: fixture.projectId,
      receiverPort: receiver.port,
      callback: async ({ url }) => {
        const fileBytes = Buffer.from([0, 1, 127, 128, 255]);
        const submission = (
          await submitPreviewFormViaMcp({
            url,
            input: {
              path: "/",
              selector: `[data-ws-managed-form-id="${formId}"]`,
              values: [
                { name: "name", value: "Ada" },
                { name: "email", value: "ada@example.com" },
                { name: "subject", value: "Multipart test" },
                { name: "message", value: "File payload" },
                { name: "tag", value: "red" },
                { name: "tag", value: "blue" },
                {
                  name: "upload",
                  file: {
                    name: "evidence.bin",
                    type: "application/octet-stream",
                    base64: fileBytes.toString("base64"),
                  },
                },
              ],
              submitter: "button[type=submit]",
              timeout: 30_000,
            },
          })
        ).data;
        expect(submission).toMatchObject({
          status: "submitted",
          formState: "error",
        });
        expect(submission.results).toEqual(
          expect.arrayContaining([expect.objectContaining({ status: 503 })])
        );
        expect(submission.errors).toEqual(
          expect.arrayContaining([expect.objectContaining({ status: 503 })])
        );
        expect(submission.exchanges).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              status: 502,
              url: expect.stringContaining("/__ws-form"),
            }),
          ])
        );
        expect(
          receiver.deliveries.map(({ pathname }) => pathname).sort()
        ).toEqual(["/reject", "/reject", "/submit"]);
        const delivery = receiver.deliveries.find(
          ({ pathname }) => pathname === "/submit"
        );
        expect(delivery).toBeDefined();
        if (delivery === undefined) {
          throw new Error("Expected the successful multipart delivery");
        }
        expect(delivery.method).toBe("POST");
        expect(delivery.contentType).toMatch(
          /^multipart\/form-data; boundary=/
        );
        const multipart = await new Request("http://127.0.0.1/submit", {
          method: "POST",
          headers: { "content-type": delivery.contentType },
          body: Uint8Array.from(delivery.bodyBytes),
        }).formData();
        expect(Array.from(multipart.keys()).sort()).toEqual(
          ["name", "email", "subject", "message", "tag", "tag", "upload"].sort()
        );
        expect(multipart.get("name")).toBe("Ada");
        expect(multipart.get("email")).toBe("ada@example.com");
        expect(multipart.get("subject")).toBe("Multipart test");
        expect(multipart.get("message")).toBe("File payload");
        expect(multipart.getAll("tag")).toEqual(["red", "blue"]);
        const upload = multipart.get("upload");
        expect(upload).toBeInstanceOf(File);
        const uploadedFile = upload as File;
        expect(uploadedFile.name).toBe("evidence.bin");
        expect(uploadedFile.type).toBe("application/octet-stream");
        expect(Buffer.from(await uploadedFile.arrayBuffer())).toEqual(
          fileBytes
        );
      },
    });
  } finally {
    await receiver.close();
  }
});
