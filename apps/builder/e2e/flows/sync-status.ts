import type { Page } from "playwright";

type SyncStatusDotStatus = "idle" | "pending" | "saved" | "error";

const getSyncStatusDot = (page: Page) =>
  page.getByRole("status", { name: /^Sync status:/ });

const syncStatusDotSelector = '[role="status"][aria-label^="Sync status:"]';

const getSyncStatusDotByStatus = ({
  page,
  status,
}: {
  page: Page;
  status: SyncStatusDotStatus;
}) =>
  page.locator(
    `[role="status"][aria-label^="Sync status:"][data-sync-status="${status}"]`
  );

const getSyncStatusLabel = async (page: Page) =>
  (await getSyncStatusDot(page).getAttribute("aria-label")) ??
  "Sync status: error";

export const waitForSyncStatus = async ({
  page,
  status,
  timeout = 10_000,
}: {
  page: Page;
  status: SyncStatusDotStatus;
  timeout?: number;
}) => {
  await getSyncStatusDot(page).waitFor({
    state: "attached",
    timeout,
  });
  await getSyncStatusDotByStatus({ page, status }).waitFor({ timeout });
};

export const waitForChangeToBeSaved = async ({
  page,
  timeout = 10_000,
}: {
  page: Page;
  timeout?: number;
}) => {
  // Saves can pass through `pending` between Playwright polling frames. Observe
  // old attribute values so a transient pending or error state is not missed.
  const finalStatus = await page.evaluate(
    ({ selector, timeout }) =>
      new Promise<SyncStatusDotStatus>((resolve, reject) => {
        let sawPending = false;
        let timeoutId = 0;
        const observer = new MutationObserver((records) => {
          const status = document.querySelector<HTMLElement>(selector)?.dataset
            .syncStatus as SyncStatusDotStatus | undefined;
          if (
            status === "pending" ||
            records.some((record) => record.oldValue === "pending")
          ) {
            sawPending = true;
          }
          if (
            status === "error" ||
            records.some((record) => record.oldValue === "error")
          ) {
            window.clearTimeout(timeoutId);
            observer.disconnect();
            resolve("error");
            return;
          }
          if (sawPending && (status === "saved" || status === "idle")) {
            window.clearTimeout(timeoutId);
            observer.disconnect();
            resolve(status);
          }
        });
        observer.observe(document, {
          subtree: true,
          childList: true,
          attributes: true,
          attributeFilter: ["data-sync-status"],
          attributeOldValue: true,
        });
        timeoutId = window.setTimeout(() => {
          observer.disconnect();
          reject(new Error("Timed out waiting for a change to be saved"));
        }, timeout);
        const initialStatus = document.querySelector<HTMLElement>(selector)
          ?.dataset.syncStatus as SyncStatusDotStatus | undefined;
        if (initialStatus === "pending") {
          sawPending = true;
        } else if (initialStatus === "error") {
          window.clearTimeout(timeoutId);
          observer.disconnect();
          resolve("error");
        }
      }),
    { selector: syncStatusDotSelector, timeout }
  );

  if (finalStatus === "error") {
    throw new Error(
      `Expected change to save, received ${await getSyncStatusLabel(page)}`
    );
  }
};
