import type { Page } from "playwright";

type SyncStatusDotStatus = "idle" | "pending" | "saved" | "error";

const getSyncStatusDot = (page: Page) =>
  page.getByRole("status", { name: /^Sync status:/ });

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
  await getSyncStatusDot(page).waitFor({
    state: "attached",
    timeout,
  });

  const errorStatus = getSyncStatusDotByStatus({ page, status: "error" })
    .waitFor({ timeout })
    .then(async () => {
      const label =
        (await getSyncStatusDot(page).getAttribute("aria-label")) ??
        "Sync status: error";
      throw new Error(`Expected change to save, received ${label}`);
    });

  await Promise.race([
    getSyncStatusDotByStatus({ page, status: "pending" }).waitFor({
      timeout,
    }),
    errorStatus,
  ]);

  await Promise.race([
    getSyncStatusDotByStatus({ page, status: "saved" }).waitFor({ timeout }),
    errorStatus,
  ]);
};
