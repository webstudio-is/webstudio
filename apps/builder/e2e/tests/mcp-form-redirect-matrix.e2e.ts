import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { expect, type Page } from "@playwright/test";
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
const successMessage = "Thanks for contacting us. Your message has been sent.";
const errorMessage = "We could not send your message. Please try again.";

const authorForm = async (
  projectId: string,
  redirect: string | undefined,
  fail = false
) => {
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
      JSON.stringify({ mode: "redirect", successRedirect: redirect, fail }),
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
  return JSON.parse(stdout) as { formId: string };
};

const openPreview = async (page: Page, url: string) => {
  await page.addInitScript(() => {
    const calls: Array<{ behavior?: ScrollBehavior; tagName: string }> = [];
    Object.assign(window, { __redirectMatrixScrollCalls: calls });
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function (options) {
      calls.push({
        tagName: this.tagName,
        behavior:
          typeof options === "object" && options !== null
            ? options.behavior
            : undefined,
      });
      original.call(this, options);
    };
  });
  await page.route("**/*", (route) => {
    const target = new URL(route.request().url());
    if (target.hostname === "127.0.0.1") {
      return route.continue();
    }
    if (target.href === "https://redirect.example/landing") {
      return route.fulfill({ status: 200, body: "Redirect destination" });
    }
    return route.abort();
  });
  await page.goto(url);
};

const fillAndSubmit = async (page: Page, formId: string) => {
  const form = page.locator(`[data-ws-managed-form-id="${formId}"]`);
  await form.locator('input[name="name"]').fill("Ada");
  await form.locator('input[name="email"]').fill("ada@example.com");
  await form.locator('input[name="subject"]').fill("Redirect matrix");
  await form.locator('textarea[name="message"]').fill("Local Preview");
  await form.getByRole("button", { name: "Submit" }).click();
};

const moveFeedbackBelowViewport = async (page: Page, message: string) => {
  await page.evaluate((text) => {
    const move = () => {
      const feedback = Array.from(
        document.querySelectorAll<HTMLElement>("body *")
      ).find((element) => element.textContent?.trim() === text);
      if (feedback === undefined) {
        return false;
      }
      feedback.style.marginBlockStart = "1600px";
      return true;
    };
    if (move()) {
      return;
    }
    const observer = new MutationObserver(() => {
      if (move()) {
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }, message);
};

const createFixture = async (
  context: import("@playwright/test").BrowserContext,
  name: string
) =>
  await createContentModeProject({
    context,
    email: `mcp-redirect-matrix-${name}@webstudio.test`,
    title: `MCP redirect matrix ${name}`,
    assetNamePrefix: `mcp-redirect-matrix-${name}-`,
    builderToken: `mcp-redirect-matrix-${name}-builder-token`,
  });

for (const { name, redirect, expected } of [
  {
    name: "internal",
    redirect: "/?matrix=internal",
    expected: (url: URL) =>
      url.pathname === "/" && url.search === "?matrix=internal",
  },
  {
    name: "relative",
    redirect: "?matrix=relative",
    expected: (url: URL) =>
      url.pathname === "/" && url.search === "?matrix=relative",
  },
  {
    name: "hash",
    redirect: "#matrix-hash",
    expected: (url: URL) => url.pathname === "/" && url.hash === "#matrix-hash",
  },
  {
    name: "external",
    redirect: "https://redirect.example/landing",
    expected: (url: URL) => url.href === "https://redirect.example/landing",
  },
] as const) {
  test(`MCP Form success redirect reaches ${name} destination`, async ({
    page,
    context,
  }) => {
    const fixture = await createFixture(context, name);
    const { formId } = await authorForm(fixture.projectId, redirect);
    const receiver = await startFormDeliveryReceiver();
    try {
      await withGeneratedFormDeliveryPreview({
        projectId: fixture.projectId,
        receiverPort: receiver.port,
        callback: async ({ url }) => {
          await openPreview(page, url);
          const navigated = page.waitForURL((target) => expected(target));
          await fillAndSubmit(page, formId);
          await navigated;
          expect(expected(new URL(page.url()))).toBe(true);
          expect(receiver.deliveries).toHaveLength(1);
          expect(receiver.deliveries[0]).toMatchObject({
            pathname: "/submit",
            method: "POST",
          });
        },
      });
    } finally {
      await receiver.close();
    }
  });
}

for (const { name, fail, message, behavior } of [
  {
    name: "success",
    fail: false,
    message: successMessage,
    behavior: "smooth",
  },
  {
    name: "failure",
    fail: true,
    message: errorMessage,
    behavior: "instant",
  },
] as const) {
  test(`MCP Form ${name} reveals off-screen feedback with ${behavior} scroll`, async ({
    page,
    context,
  }) => {
    const fixture = await createFixture(context, `feedback-${name}`);
    const { formId } = await authorForm(
      fixture.projectId,
      fail ? "/?matrix=must-not-redirect" : undefined,
      fail
    );
    const receiver = await startFormDeliveryReceiver();
    try {
      await withGeneratedFormDeliveryPreview({
        projectId: fixture.projectId,
        receiverPort: receiver.port,
        callback: async ({ url }) => {
          await page.emulateMedia({
            reducedMotion: fail ? "reduce" : "no-preference",
          });
          await openPreview(page, url);
          const form = page.locator(`[data-ws-managed-form-id="${formId}"]`);
          await moveFeedbackBelowViewport(page, message);
          await fillAndSubmit(page, formId);
          await expect(form).toHaveAttribute(
            "data-state",
            name === "failure" ? "error" : "success"
          );
          await expect(form.getByText(message, { exact: true })).toBeVisible();
          await expect
            .poll(() =>
              page.evaluate(
                () =>
                  (
                    window as Window & {
                      __redirectMatrixScrollCalls?: Array<{
                        behavior?: ScrollBehavior;
                        tagName: string;
                      }>;
                    }
                  ).__redirectMatrixScrollCalls ?? []
              )
            )
            .toEqual([{ tagName: "FORM", behavior }]);
          expect(new URL(page.url()).searchParams.has("matrix")).toBe(false);
          expect(receiver.deliveries.map(({ pathname }) => pathname)).toEqual(
            fail ? ["/reject", "/reject"] : ["/submit"]
          );
        },
      });
    } finally {
      await receiver.close();
    }
  });
}
