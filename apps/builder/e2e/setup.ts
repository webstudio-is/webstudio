import { setTimeout as delay } from "node:timers/promises";
import { resetDatabase } from "./db";
import { dashboardUrl, postgrestUrl, test } from "./test";

process.env.NODE_TLS_REJECT_UNAUTHORIZED ??= "0";

const waitForPostgrest = async () => {
  const url = new URL("/User?select=*", postgrestUrl);
  const startedAt = Date.now();
  let lastError: unknown;
  let readyResponses = 0;

  while (Date.now() - startedAt < 30_000) {
    try {
      const response = await fetch(url);
      await response.arrayBuffer();
      if (response.ok) {
        readyResponses += 1;
      } else {
        readyResponses = 0;
        lastError = new Error(`Received HTTP ${response.status}`);
      }
      if (readyResponses === 3) {
        return;
      }
    } catch (error) {
      lastError = error;
      readyResponses = 0;
    }
    await delay(250);
  }

  throw new Error(`Timed out waiting for ${url.href}: ${String(lastError)}`);
};

test("prepare Builder E2E environment", async ({ page }) => {
  await waitForPostgrest();
  await resetDatabase();
  await page.goto(`${dashboardUrl}/login`);
  await page
    .getByRole("button", { name: "Login with Secret" })
    .waitFor({ state: "visible", timeout: 60_000 });
});
