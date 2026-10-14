import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { expect } from "@playwright/test";
import { createContentModeProject } from "../fixtures/content-mode-suite";
import { withGeneratedPreview } from "../flows/generated-app";
import { withGeneratedFormDeliveryPreview } from "../flows/generated-form-delivery";
import { startFormCallbackReceiver } from "../flows/form-callback-receiver";
import { submitPreviewFormViaMcp } from "../flows/mcp-preview-submit";
import { test } from "../test";

const execFileAsync = promisify(execFile);

for (const mode of ["legacy", "managed"] as const) {
  test(`MCP-authored ${mode} Form callbacks report success, receiver failure, and recovery in generated Preview`, async ({
    page,
    context,
  }) => {
    const receiver = await startFormCallbackReceiver();
    try {
      const fixture = await createContentModeProject({
        context,
        email: `mcp-${mode}-callbacks@webstudio.test`,
        title: `MCP ${mode} callbacks`,
        assetNamePrefix: `mcp-${mode}-callbacks-`,
      });
      await execFileAsync(
        process.execPath,
        [
          "--import",
          "tsx",
          "--import",
          fileURLToPath(
            new URL(
              "../../../../scripts/register-react-global.ts",
              import.meta.url
            )
          ),
          "--conditions=webstudio",
          fileURLToPath(
            new URL("../fixtures/mcp-form-callbacks-author.ts", import.meta.url)
          ),
          fixture.projectId,
          mode,
          receiver.url,
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
      const callback = async ({ url }: { url: string }) => {
        if (mode === "managed") {
          for (const outcome of ["success", "failure", "success"] as const) {
            const submission = (
              await submitPreviewFormViaMcp({
                url,
                input: {
                  path: "/",
                  selector: "#callback-form",
                  values: [{ name: "outcome", value: outcome }],
                  submitter: "button[type=submit]",
                  timeout: 30_000,
                },
              })
            ).data;
            expect(submission).toMatchObject({
              status: "submitted",
              formState: outcome === "success" ? "success" : "error",
            });
            expect(submission.results).toEqual([
              expect.objectContaining({
                status: outcome === "success" ? 200 : 503,
              }),
            ]);
            expect(submission.errors).toHaveLength(
              outcome === "success" ? 0 : 1
            );
            expect(submission.exchanges).toEqual(
              expect.arrayContaining([
                expect.objectContaining({
                  status: outcome === "success" ? 200 : 502,
                  url: expect.stringContaining("/__ws-form"),
                }),
              ])
            );
          }
          expect(receiver.deliveries).toEqual([
            { outcome: "success" },
            { outcome: "failure" },
            { outcome: "failure" },
            { outcome: "success" },
          ]);
          return;
        }
        await page.route("**/*", (route) => {
          return new URL(route.request().url()).hostname === "127.0.0.1"
            ? route.continue()
            : route.abort();
        });
        await page.goto(url);
        const form = page.locator("#callback-form");
        const audit = page.locator("#callback-audit");
        await expect(audit).toHaveText(
          "state=initial;history=;results=0;errors=0;status=0"
        );
        const history: string[] = [];
        for (const outcome of ["success", "failure", "success"] as const) {
          await form.locator('input[name="outcome"]').fill(outcome);
          const responsePromise = page.waitForResponse(
            (response) =>
              response.request().method() === "POST" &&
              new URL(response.url()).origin === new URL(url).origin
          );
          await form
            .getByRole("button", { name: "Submit callback form" })
            .click();
          const response = await responsePromise;
          const state = outcome === "success" ? "success" : "error";
          history.push(state);
          const renderedHistory = "|" + history.join("|");
          await expect(form).toHaveAttribute("data-state", state);
          expect(response.status()).toBe(200);
          await expect(audit).toHaveText(
            `state=${state};history=${renderedHistory};results=0;errors=0;status=0`
          );
          if (outcome === "failure") {
            // Legacy Fetcher submissions use React Router's streamed data envelope.
            expect(await response.text()).toContain("Service Unavailable");
          }
        }
        expect(receiver.deliveries).toEqual([
          { outcome: "success" },
          { outcome: "failure" },
          { outcome: "success" },
        ]);
      };
      if (mode === "legacy") {
        await withGeneratedPreview({ projectId: fixture.projectId, callback });
      } else {
        await withGeneratedFormDeliveryPreview({
          projectId: fixture.projectId,
          receiverPort: receiver.port,
          callback,
        });
      }
    } finally {
      await receiver.close();
    }
  });
}

test("MCP-authored managed Form callbacks update same-page history, error, and recovery feedback", async ({
  page,
  context,
}) => {
  const receiver = await startFormCallbackReceiver();
  try {
    const fixture = await createContentModeProject({
      context,
      email: "mcp-managed-callbacks-ui@webstudio.test",
      title: "MCP managed callbacks UI",
      assetNamePrefix: "mcp-managed-callbacks-ui-",
    });
    await execFileAsync(
      process.execPath,
      [
        "--import",
        "tsx",
        "--import",
        fileURLToPath(
          new URL(
            "../../../../scripts/register-react-global.ts",
            import.meta.url
          )
        ),
        "--conditions=webstudio",
        fileURLToPath(
          new URL("../fixtures/mcp-form-callbacks-author.ts", import.meta.url)
        ),
        fixture.projectId,
        "managed",
        receiver.url,
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
    await withGeneratedFormDeliveryPreview({
      projectId: fixture.projectId,
      receiverPort: receiver.port,
      callback: async ({ url }) => {
        await page.route("**/*", (route) =>
          new URL(route.request().url()).hostname === "127.0.0.1"
            ? route.continue()
            : route.abort()
        );
        await page.goto(url);
        const form = page.locator("#callback-form");
        const audit = page.locator("#callback-audit");
        const error = page.locator("#callback-error");
        await expect(audit).toHaveText(
          "state=initial;history=;results=0;errors=0;status=0"
        );
        const history: string[] = [];
        for (const outcome of ["success", "failure", "success"] as const) {
          await form.locator('input[name="outcome"]').fill(outcome);
          await form
            .getByRole("button", { name: "Submit callback form" })
            .click();
          const state = outcome === "success" ? "success" : "error";
          history.push("initial", state);
          await expect(form).toHaveAttribute("data-state", state);
          await expect(audit).toHaveText(
            `state=${state};history=|${history.join("|")};results=1;errors=${outcome === "success" ? 0 : 1};status=${outcome === "success" ? 200 : 503}`
          );
          await expect(error).toHaveText(
            outcome === "success" ? "no errors" : "Service Unavailable"
          );
        }
        expect(receiver.deliveries).toEqual([
          { outcome: "success" },
          { outcome: "failure" },
          { outcome: "failure" },
          { outcome: "success" },
        ]);
      },
    });
  } finally {
    await receiver.close();
  }
});
