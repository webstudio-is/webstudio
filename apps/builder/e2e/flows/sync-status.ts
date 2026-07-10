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

const waitForAnySyncStatus = async ({
  page,
  statuses,
  timeout,
}: {
  page: Page;
  statuses: SyncStatusDotStatus[];
  timeout: number;
}) => {
  const handle = await page.waitForFunction(
    ({ selector, statuses }) => {
      const dot = document.querySelector<HTMLElement>(selector);
      const status = dot?.dataset.syncStatus;
      if (status === undefined) {
        return false;
      }
      if ((statuses as readonly string[]).includes(status)) {
        return status;
      }
      return false;
    },
    { selector: syncStatusDotSelector, statuses },
    { timeout }
  );
  return (await handle.jsonValue()) as SyncStatusDotStatus;
};

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
  const firstStatus = await waitForAnySyncStatus({
    page,
    statuses: ["pending", "error"],
    timeout,
  });

  if (firstStatus === "error") {
    throw new Error(
      `Expected change to save, received ${await getSyncStatusLabel(page)}`
    );
  }

  const finalStatus = await waitForAnySyncStatus({
    page,
    statuses: ["saved", "idle", "error"],
    timeout,
  });

  if (finalStatus === "error") {
    throw new Error(
      `Expected change to save, received ${await getSyncStatusLabel(page)}`
    );
  }
};
