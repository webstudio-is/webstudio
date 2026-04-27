import { useEffect } from "react";
import { atom } from "nanostores";
import type { Change } from "immerhin";
import type { Project } from "@webstudio-is/project";
import type { Build } from "@webstudio-is/project-build";
import type { AuthPermit } from "@webstudio-is/trpc-interface/index.server";
import { toast } from "@webstudio-is/design-system";
import {
  $hasUnsavedSyncChanges,
  $syncStatus,
  createBackoff,
  createTransactionCompletionStore,
  type SyncStatus,
} from "@webstudio-is/sync-client";
import { loadBuilderData } from "~/shared/builder-data";
import { publicStaticEnv } from "~/env/env.static";
import { createNativeClient, nativeClient } from "~/shared/trpc/trpc-client";
import * as commandQueue from "./command-queue";
import type { SyncStorage } from "~/shared/sync-client";
import type { Transaction } from "@webstudio-is/sync-client";

export { commandQueue };

// Periodic check for new entries to group them into one job/call in sync queue.
const NEW_ENTRIES_INTERVAL = 1000;

// First attempts we will simply retry without changing the state or notifying anyone.
const INTERVAL_RECOVERY = 2000;

// After this amount of retries without success, we consider connection status error.
const MAX_RETRY_RECOVERY = 5;

// We are assuming that error is fatal (unrecoverable) after this amount of attempts with API error.
const MAX_ALLOWED_API_ERRORS = 5;

const pause = (timeout: number) => {
  return new Promise((resolve) => setTimeout(resolve, timeout));
};

/** Last server-confirmed build version. Updated after each successful PATCH. */
export const $committedVersion = atom<number>(0);

const transactionCompletion = createTransactionCompletionStore();

export const $lastTransactionId = transactionCompletion.$lastTransactionId;
export const onTransactionComplete =
  transactionCompletion.onTransactionComplete;
export const onNextTransactionComplete =
  transactionCompletion.onNextTransactionComplete;

// polling is important to queue new transactions independently
// from async iterator and batch them into single job
const pollCommands = async function* () {
  while (true) {
    const commands = commandQueue.dequeueAll();
    if (commands.length > 0) {
      $syncStatus.set({ status: "syncing" });
      yield* commands;
      await pause(NEW_ENTRIES_INTERVAL);
      // Do not switch on idle state until there is possibility that queue is not empty
      continue;
    }
    $syncStatus.set({ status: "idle" });
    await pause(NEW_ENTRIES_INTERVAL);
  }
};

const retry = async function* () {
  const backoff = createBackoff();

  while (true) {
    yield;
    if (backoff.attempts() < MAX_RETRY_RECOVERY) {
      backoff.next();
      $syncStatus.set({ status: "recovering" });
      await pause(INTERVAL_RECOVERY);
    } else {
      $syncStatus.set({ status: "failed" });

      const delay = backoff.next();

      toast.error(
        `Builder is offline. Retry in ${Math.round(delay / 1000)} seconds.`
      );

      await pause(delay);
    }
  }
};

let isPolling = false;
let pollingAbortController: AbortController | undefined;

/**
 * Start the queue polling loop.
 * Called automatically by enqueueProjectDetails.
 */
const startPolling = () => {
  if (pollingAbortController) {
    return; // Already running
  }
  pollingAbortController = new AbortController();
  pollQueue(pollingAbortController.signal);
};

/**
 * Stop the queue polling loop.
 * Call this to stop transaction synchronization (e.g., when closing a dialog).
 */
export const stopPolling = () => {
  if (pollingAbortController) {
    pollingAbortController.abort();
    pollingAbortController = undefined;
  }
  isPolling = false;
};

/**
 * Enqueue project details for synchronization.
 * Called automatically by initializeClientSync after loading builder data.
 */
export const enqueueProjectDetails = ({
  projectId,
  buildId,
  version,
  authPermit,
  authToken,
}: {
  buildId: Build["id"];
  projectId: Project["id"];
  authToken: string | undefined;
  version: number;
  authPermit: AuthPermit;
}) => {
  if (authPermit === "view") {
    return;
  }
  commandQueue.enqueue({
    type: "setDetails",
    projectId,
    buildId,
    version,
    authToken,
  });
  // Start polling after enqueuing to ensure command is in queue
  startPolling();
};

const pollQueue = async (signal: AbortSignal) => {
  if (isPolling) {
    return;
  }

  isPolling = true;

  const detailsMap = new Map<
    Project["id"],
    {
      version: number;
      buildId: Build["id"];
      authToken: string | undefined;
    }
  >();

  polling: for await (const command of pollCommands()) {
    // Check if aborted
    if (signal.aborted) {
      isPolling = false;
      break polling;
    }

    if (command.type === "setDetails") {
      // At this moment we can be sure that all transactions for the command.projectId is already synchronized
      // There are 2 options
      // - Project opened again before transactions synchronized,
      //   in that case project is outdated and we need to ask user to reload it.
      // - Project opened after sync, everything is ok.
      if (command.version < (detailsMap.get(command.projectId)?.version ?? 0)) {
        const error =
          "The project is outdated. Synchronization was incomplete when the project was opened. " +
          "Please reload the page to get the latest version.";
        const shouldReload = confirm(error);

        if (shouldReload) {
          location.reload();
        }

        // stop synchronization and wait til user reload
        $syncStatus.set({ status: "fatal", error });

        if (shouldReload === false) {
          toast.error(
            "Synchronization has been paused. Please reload to continue.",
            { id: "outdated-error", duration: Number.POSITIVE_INFINITY }
          );
        }

        break polling;
      }

      detailsMap.set(command.projectId, {
        version: command.version,
        buildId: command.buildId,
        authToken: command.authToken,
      });
      continue;
    }

    const { projectId, transactions } = command;
    const details = detailsMap.get(projectId);

    if (details === undefined) {
      const error =
        "Project details not found. Synchronization has been paused. Please reload to continue.";

      toast.error(error, {
        id: "details-error",
        duration: Number.POSITIVE_INFINITY,
      });

      $syncStatus.set({ status: "fatal", error });

      return;
    }

    // We don't know how to handle api errors. Like parsing errors, etc.
    // Let
    let apiErrorCount = 0;

    for await (const _ of retry()) {
      // in case of any error continue retrying
      try {
        // revise patches are not used on the server and reduce possible patch size
        const optimizedTransactions = transactions.map((transaction) => ({
          ...transaction,
          payload: transaction.payload.map((change) => ({
            namespace: change.namespace,
            patches: change.patches,
          })),
        }));
        const patchClient =
          details.authToken === undefined
            ? nativeClient
            : createNativeClient({ "x-auth-token": details.authToken });
        const result = await patchClient.build.patch.mutate({
          source: "browser",
          appVersion: publicStaticEnv.VERSION,
          authToken: details.authToken,
          entries: optimizedTransactions.map((transaction) => ({
            transaction,
          })),
          buildId: details.buildId,
          projectId,
          // provide latest stored version to server
          version: details.version,
        });

        if (result) {
          if (result.status === "ok") {
            details.version = result.version ?? details.version + 1;
            $committedVersion.set(details.version);

            for (const transaction of transactions) {
              transactionCompletion.completeTransaction(transaction.id, true);
            }

            // stop retrying and wait next transactions
            continue polling;
          }
          // when versions mismatched ask user to reload
          // user may cancel to copy own state before reloading
          if (
            result.status === "version_mismatched" ||
            result.status === "authorization_error" ||
            result.status === "partial"
          ) {
            const error =
              ("errors" in result ? result.errors : undefined) ??
              ("entries" in result
                ? result.entries
                    .filter((entry) => entry.status !== "accepted")
                    .map((entry) => entry.errors)
                    .join("\n")
                : undefined) ??
              "Unknown version mismatch. Please reload.";

            const shouldReload = confirm(error);
            if (shouldReload) {
              location.reload();
            }

            $syncStatus.set({ status: "fatal", error });

            if (shouldReload === false) {
              toast.error(
                "Synchronization has been paused. Please reload to continue.",
                { duration: Number.POSITIVE_INFINITY }
              );
            }

            // stop synchronization and wait til user reload
            break polling;
          }

          if (apiErrorCount >= MAX_ALLOWED_API_ERRORS) {
            const error = `Fatal error. ${
              result.errors ?? JSON.stringify(result.errors)
            } Synchronization has been paused.`;
            // Api error we don't know how to handle, as retries will not help probably
            // We should show error and break synchronization
            $syncStatus.set({ status: "fatal", error });

            toast.error(error, {
              id: "fatal-error",
              duration: Number.POSITIVE_INFINITY,
            });

            break polling;
          }

          apiErrorCount += 1;
        }
      } catch (error) {
        if (navigator.onLine) {
          // ERR_CONNECTION_REFUSED or like, probably restorable with retries
          // anyway lets's log it

          console.info(
            error instanceof Error ? error.message : JSON.stringify(error)
          );
        }
      }
    }
  }
};

export class ServerSyncStorage implements SyncStorage {
  name = "server";
  private projectId: string;

  constructor(projectId: string) {
    this.projectId = projectId;
  }

  sendTransaction(transaction: Transaction<Change[]>) {
    if (transaction.object === "server") {
      $lastTransactionId.set(transaction.id);
      commandQueue.enqueue({
        type: "transactions",
        transactions: [transaction],
        projectId: this.projectId,
      });
    }
  }
  subscribe(setState: (state: unknown) => void, signal: AbortSignal) {
    const projectId = this.projectId;
    loadBuilderData({ projectId, signal })
      .then((data: Record<string, unknown>) => {
        const serverData = new Map(Object.entries(data));
        setState(new Map([["server", serverData]]));
      })
      .catch((err: unknown) => {
        if (err instanceof Error) {
          console.error(err);
          return;
        }

        // Abort error do nothing
      });
  }
}

/**
 * Promisify idle state of the queue for a one-off notification when everything is saved.
 */
export const isSyncIdle = () => {
  return new Promise<SyncStatus>((resolve, reject) => {
    const handle = (status: SyncStatus) => {
      if (status.status === "idle") {
        resolve(status);
        return true;
      }
      if (status.status === "fatal") {
        reject(
          new Error(
            "Synchronization is in fatal state. Please reload the page or check your internet connection."
          )
        );
        return true;
      }
      return false;
    };
    const status = $syncStatus.get();

    if (handle(status) === false) {
      const unsubscribe = $syncStatus.subscribe((status) => {
        if (handle(status)) {
          unsubscribe();
        }
      });
    }
  });
};

export const usePreventUnload = () => {
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if ($hasUnsavedSyncChanges.get() === false) {
        return;
      }
      event.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);
};

export const __testing__ = {
  pollCommands,
  retry,
  transactionCallbacks: transactionCompletion.callbacks,
};
