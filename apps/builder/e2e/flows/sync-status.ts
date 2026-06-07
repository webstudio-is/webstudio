import type { Page } from "playwright";

type SyncIndicatorStatus = "idle" | "pending" | "saved" | "error";

const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

const getSyncStatusIndicator = (page: Page) => page.getByRole("status");

const getSyncIndicatorStatus = async (page: Page) => {
  const status =
    await getSyncStatusIndicator(page).getAttribute("data-sync-status");

  if (
    status === "idle" ||
    status === "pending" ||
    status === "saved" ||
    status === "error"
  ) {
    return status;
  }

  throw new Error(`Unexpected sync status indicator value: ${status}`);
};

export const waitForSyncStatus = async ({
  page,
  status,
  timeout = 10_000,
}: {
  page: Page;
  status: SyncIndicatorStatus;
  timeout?: number;
}) => {
  const startedAt = Date.now();

  await getSyncStatusIndicator(page).waitFor({
    state: "attached",
    timeout,
  });

  while (Date.now() - startedAt < timeout) {
    if ((await getSyncIndicatorStatus(page)) === status) {
      return;
    }
    await delay(100);
  }

  throw new Error(`Timed out waiting for sync status to become ${status}`);
};

export const waitForChangeToBeSaved = async ({
  page,
  timeout = 10_000,
}: {
  page: Page;
  timeout?: number;
}) => {
  const startedAt = Date.now();

  await getSyncStatusIndicator(page).waitFor({
    state: "attached",
    timeout,
  });

  while (Date.now() - startedAt < timeout) {
    const status = await getSyncIndicatorStatus(page);

    if (status === "error") {
      const label =
        (await getSyncStatusIndicator(page).getAttribute("aria-label")) ??
        "Sync status: error";
      throw new Error(`Expected change to save, received ${label}`);
    }

    if (status === "saved") {
      return;
    }

    await delay(100);
  }

  throw new Error("Timed out waiting for sync status to become saved");
};
