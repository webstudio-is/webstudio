import type { Transaction } from "@webstudio-is/sync-client";

export const pageCopyGuards = new Map<
  string,
  NonNullable<Transaction["pageCopyGuard"]>
>();

export const guardedPageCopyRollbacks = new Map<string, () => boolean>();

const rollbackListeners = new Set<(transactionId: string) => void>();

export const onGuardedPageCopyRollback = (
  listener: (transactionId: string) => void
) => {
  rollbackListeners.add(listener);
  return () => {
    rollbackListeners.delete(listener);
  };
};

export const rejectGuardedPageCopy = (transactionId: string) => {
  const revert = guardedPageCopyRollbacks.get(transactionId);
  guardedPageCopyRollbacks.delete(transactionId);
  if (revert?.() !== true) {
    return false;
  }
  for (const listener of rollbackListeners) {
    listener(transactionId);
  }
  return true;
};
