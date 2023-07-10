import { useEffect, useRef } from "react";
import { useBeforeUnload } from "react-use";
import { atom } from "nanostores";
import { sync } from "immerhin";
import type { Project } from "@webstudio-is/project";
import type { Build } from "@webstudio-is/project-build";
import type { AuthPermit } from "@webstudio-is/trpc-interface/index.server";
import { restPatchPath } from "~/shared/router-utils";

// Periodic check for new entries to group them into one job/call in sync queue.
const NEW_ENTRIES_INTERVAL = 1000;

// First attempts we will simply retry without changing the state or notifying anyone.
const INTERVAL_RECOVERY = 2000;

// After this amount of retries without success, we consider connection status error.
const MAX_RETRY_RECOVERY = 5;

// When we reached max failed attempts we will slow down the attempts interval.
const INTERVAL_ERROR = 5000;

const pause = (timeout: number) => {
  return new Promise((resolve) => setTimeout(resolve, timeout));
};

export type QueueStatus = "running" | "idle" | "recovering" | "failed";

export const queueStatus = atom<QueueStatus>("idle");

// polling is important to queue new transactions independently
// from async iterator and batch them into single job
const pollTransactions = async function* () {
  while (true) {
    const transactions = sync();
    if (transactions.length > 0) {
      queueStatus.set("running");
      yield transactions;
      queueStatus.set("idle");
    }
    await pause(NEW_ENTRIES_INTERVAL);
  }
};

const retry = async function* () {
  let failedAttempts = 0;
  while (true) {
    yield;
    failedAttempts += 1;
    if (failedAttempts < MAX_RETRY_RECOVERY) {
      queueStatus.set("recovering");
      await pause(INTERVAL_RECOVERY);
    } else {
      queueStatus.set("failed");
      await pause(INTERVAL_ERROR);
    }
  }
};

const syncServer = async function ({
  authToken,
  buildId,
  projectId,
  lastVersion,
}: {
  buildId: Build["id"];
  projectId: Project["id"];
  authToken: string | undefined;
  lastVersion: number;
}) {
  polling: for await (const transactions of pollTransactions()) {
    for await (const _ of retry()) {
      // in case of any error continue retrying
      try {
        const response = await fetch(restPatchPath({ authToken }), {
          method: "post",
          body: JSON.stringify({
            transactions,
            buildId,
            projectId,
            // provide latest stored version to server
            version: lastVersion,
          }),
        });
        if (response.ok) {
          const result = await response.json();
          if (result.status === "ok") {
            lastVersion += 1;
            // stop retrying and wait next transactions
            continue polling;
          }
          // when versions mismatched ask user to reload
          // user may cancel to copy own state before reloading
          if (result.status === "version_mismatched") {
            const shouldReload = confirm(
              "You are currently in single-player mode. " +
                "The project has been edited in a different tab, browser, or by another user. " +
                "Please reload the page to get the latest version."
            );
            if (shouldReload) {
              location.reload();
            }
            // stop synchronization and wait til user reload
            break polling;
          }
        }
      } catch {
        //
      }
    }
  }
};

type SyncServerProps = {
  buildId: Build["id"];
  projectId: Project["id"];
  authToken: string | undefined;
  authPermit: AuthPermit;
  version: number;
};

export const useSyncServer = ({
  buildId,
  projectId,
  authToken,
  authPermit,
  version,
}: SyncServerProps) => {
  // save the initial version from loaded build
  const initialized = useRef(false);
  useEffect(() => {
    if (authPermit === "view" || initialized.current === true) {
      return;
    }
    initialized.current = true;
    syncServer({ buildId, projectId, authToken, lastVersion: version });
  }, [buildId, projectId, authToken, authPermit, version]);

  useBeforeUnload(
    () => queueStatus.get() !== "idle",
    "You have unsaved changes. Are you sure you want to leave?"
  );
};
