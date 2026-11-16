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
import { measure } from "../perf";

const execFileAsync = promisify(execFile);
const authorPath = fileURLToPath(
  new URL("../fixtures/mcp-managed-form-author.ts", import.meta.url)
);
const reactGlobalPath = fileURLToPath(
  new URL("../../../../scripts/register-react-global.ts", import.meta.url)
);
const successMessage = "Thanks for contacting us. Your message has been sent.";
const errorMessage = "We could not send your message. Please try again.";

const authorForms = async (
  projectId: string,
  scenarios: ReadonlyArray<{ redirect?: string; fail?: boolean }>
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
      ...scenarios.map(({ redirect, fail }) =>
        JSON.stringify({ mode: "redirect", successRedirect: redirect, fail })
      ),
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
  const forms = stdout
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line)) as Array<{
    formId: string;
  }>;
  expect(forms).toHaveLength(scenarios.length);
  return forms.map(({ formId }) => formId);
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

const redirects = [
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
] as const;

test("MCP Form redirect destinations and feedback share one generated Preview", async ({
  page,
  context,
}) => {
  test.setTimeout(180_000);
  const fixture = await createFixture(context, "destinations");
  const feedbackScenarios = [
    {
      name: "success",
      fail: false,
      message: successMessage,
      behavior: "smooth",
    },
    {
      name: "failure",
      fail: true,
      redirect: "/?matrix=must-not-redirect",
      message: errorMessage,
      behavior: "instant",
    },
  ] as const;
  const formIds = await measure("author redirect and feedback forms", () =>
    authorForms(fixture.projectId, [...redirects, ...feedbackScenarios])
  );
  const forms = redirects.map((scenario, index) => ({
    ...scenario,
    formId: formIds[index],
  }));
  const feedbackForms = feedbackScenarios.map((scenario, index) => ({
    ...scenario,
    formId: formIds[redirects.length + index],
  }));

  const receiver = await startFormDeliveryReceiver();
  try {
    await withGeneratedFormDeliveryPreview({
      projectId: fixture.projectId,
      receiverPort: receiver.port,
      callback: async ({ url }) => {
        await openPreview(page, url);
        for (const [index, { name, expected, formId }] of forms.entries()) {
          await test.step(name + " redirect", async () => {
            if (index > 0) {
              await page.goto(url);
            }
            const navigated = page.waitForURL((target) => expected(target));
            await fillAndSubmit(page, formId);
            await navigated;
            expect(expected(new URL(page.url()))).toBe(true);
            expect(receiver.deliveries).toHaveLength(index + 1);
            expect(receiver.deliveries.at(-1)).toMatchObject({
              pathname: "/submit",
              method: "POST",
            });
          });
        }
        receiver.deliveries.splice(0);

        for (const { name, fail, message, behavior, formId } of feedbackForms) {
          await test.step(name + " feedback scroll", async () => {
            await page.emulateMedia({
              reducedMotion: fail ? "reduce" : "no-preference",
            });
            await page.goto(url);
            const form = page.locator(
              '[data-ws-managed-form-id="' + formId + '"]'
            );
            await moveFeedbackBelowViewport(page, message);
            await fillAndSubmit(page, formId);
            await expect(form).toHaveAttribute(
              "data-state",
              name === "failure" ? "error" : "success"
            );
            await expect(
              form.getByText(message, { exact: true })
            ).toBeVisible();
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
              fail ? ["/reject"] : ["/submit"]
            );
            receiver.deliveries.splice(0);
          });
        }
      },
    });
  } finally {
    await receiver.close();
  }
});
