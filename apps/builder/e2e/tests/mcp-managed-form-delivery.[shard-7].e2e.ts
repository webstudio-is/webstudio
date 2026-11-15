import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { expect } from "@playwright/test";
import { createContentModeProject } from "../fixtures/content-mode-suite";
import {
  startFormDeliveryReceiver,
  withGeneratedFormDeliveryPreview,
} from "../flows/generated-form-delivery";
import { submitPreviewFormViaMcp } from "../flows/mcp-preview-submit";
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

const authorForm = async (projectId: string, mode: string) => {
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
      mode,
    ],
    {
      timeout: 60_000,
      env: { ...process.env, TSX_TSCONFIG_PATH: cliTsconfigPath },
    }
  );
  return JSON.parse(stdout) as {
    formId: string;
    resourceId: string;
    successfulResourceId: string;
  };
};

test("MCP managed Form navigation, Action delivery, and multipart share one Preview", async ({
  page,
  context,
}) => {
  const fixture = await createContentModeProject({
    context,
    email: "mcp-managed-form-delivery@webstudio.test",
    title: "MCP managed Form delivery",
    assetNamePrefix: "mcp-managed-form-delivery-",
    builderToken: "mcp-managed-form-delivery-builder-token",
  });
  const empty = await authorForm(fixture.projectId, "empty-action");
  const delivery = await authorForm(fixture.projectId, "delivery");
  const multipart = await authorForm(fixture.projectId, "multipart");
  const receiver = await startFormDeliveryReceiver();

  try {
    await withGeneratedFormDeliveryPreview({
      projectId: fixture.projectId,
      receiverPort: receiver.port,
      callback: async ({ url }) => {
        await test.step("no Actions navigate with query values and no Resource POST", async () => {
          const formRequests: string[] = [];
          page.on("request", (request) => {
            if (new URL(request.url()).pathname.startsWith("/__ws-form")) {
              formRequests.push(request.url());
            }
          });
          await page.route("**/*", (route) => {
            const target = new URL(route.request().url());
            return target.hostname === "127.0.0.1"
              ? route.continue()
              : route.abort();
          });
          await page.goto(url);
          const form = page.locator(
            `[data-ws-managed-form-id="${empty.formId}"]`
          );
          await form.locator('input[name="name"]').fill("Ada");
          await form.locator('input[name="email"]').fill("ada@example.com");
          await form.locator('input[name="subject"]').fill("No Action test");
          await form.locator('textarea[name="message"]').fill("No dispatch");
          await expect(form).toHaveAttribute(
            "action",
            "?__webstudio__=navigate"
          );
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
        });

        await test.step("one Action delivers and the next failure is reported", async () => {
          const submission = (
            await submitPreviewFormViaMcp({
              url,
              input: {
                path: "/",
                selector: `[data-ws-managed-form-id="${delivery.formId}"]`,
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
              resourceId: delivery.successfulResourceId,
              resourceName: "Received HTTP action",
              status: 200,
            }),
            expect.objectContaining({
              resourceId: delivery.resourceId,
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
          ).toEqual(["/reject", "/submit"]);
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
        });
        receiver.deliveries.length = 0;

        await test.step("uploaded files use multipart by default", async () => {
          const fileBytes = Buffer.from([0, 1, 127, 128, 255]);
          const submission = (
            await submitPreviewFormViaMcp({
              url,
              input: {
                path: "/",
                selector: `[data-ws-managed-form-id="${multipart.formId}"]`,
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
          ).toEqual(["/reject", "/submit"]);
          const delivered = receiver.deliveries.find(
            ({ pathname }) => pathname === "/submit"
          );
          expect(delivered).toBeDefined();
          if (delivered === undefined) {
            throw new Error("Expected the successful multipart delivery");
          }
          expect(delivered.method).toBe("POST");
          expect(delivered.contentType).toMatch(
            /^multipart\/form-data; boundary=/
          );
          const parsed = await new Request("http://127.0.0.1/submit", {
            method: "POST",
            headers: { "content-type": delivered.contentType },
            body: Uint8Array.from(delivered.bodyBytes),
          }).formData();
          expect(Array.from(parsed.keys()).sort()).toEqual(
            [
              "name",
              "email",
              "subject",
              "message",
              "tag",
              "tag",
              "upload",
            ].sort()
          );
          expect(parsed.get("name")).toBe("Ada");
          expect(parsed.get("email")).toBe("ada@example.com");
          expect(parsed.get("subject")).toBe("Multipart test");
          expect(parsed.get("message")).toBe("File payload");
          expect(parsed.getAll("tag")).toEqual(["red", "blue"]);
          const upload = parsed.get("upload");
          expect(upload).toBeInstanceOf(File);
          const uploadedFile = upload as File;
          expect(uploadedFile.name).toBe("evidence.bin");
          expect(uploadedFile.type).toBe("application/octet-stream");
          expect(Buffer.from(await uploadedFile.arrayBuffer())).toEqual(
            fileBytes
          );
        });
      },
    });
  } finally {
    await receiver.close();
  }
});
