import type { Page } from "playwright";

type SyncStatusDotStatus = "idle" | "pending" | "saved" | "error";

const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

const getSyncStatusDot = (page: Page) =>
  page.getByRole("status", { name: /^Sync status:/ });

const getSyncStatusDotStatus = async (page: Page) => {
  const status = await getSyncStatusDot(page).getAttribute("data-sync-status");

  if (
    status === "idle" ||
    status === "pending" ||
    status === "saved" ||
    status === "error"
  ) {
    return status;
  }

  throw new Error(`Unexpected sync status dot value: ${status}`);
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
  const startedAt = Date.now();

  await getSyncStatusDot(page).waitFor({
    state: "attached",
    timeout,
  });

  while (Date.now() - startedAt < timeout) {
    if ((await getSyncStatusDotStatus(page)) === status) {
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

  await getSyncStatusDot(page).waitFor({
    state: "attached",
    timeout,
  });

  while (Date.now() - startedAt < timeout) {
    const status = await getSyncStatusDotStatus(page);

    if (status === "error") {
      const label =
        (await getSyncStatusDot(page).getAttribute("aria-label")) ??
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
