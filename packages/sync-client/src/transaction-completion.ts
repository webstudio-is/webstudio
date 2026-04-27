import { atom } from "nanostores";

type TransactionCompleteCallback = (success: boolean) => void;

export const createTransactionCompletionStore = ({
  timeoutMs = 60_000,
  setTimeout: setTimer,
}: {
  timeoutMs?: number;
  setTimeout?: typeof globalThis.setTimeout;
} = {}) => {
  const $lastTransactionId = atom<string | undefined>();
  const callbacks = new Map<string, TransactionCompleteCallback[]>();
  const scheduleTimeout = (callback: () => void) => {
    return (setTimer ?? globalThis.setTimeout)(callback, timeoutMs);
  };

  const onTransactionComplete = (
    transactionId: string,
    callback: TransactionCompleteCallback
  ) => {
    const transactionCallbacks = callbacks.get(transactionId) ?? [];
    transactionCallbacks.push(callback);
    callbacks.set(transactionId, transactionCallbacks);

    scheduleTimeout(() => {
      callbacks.delete(transactionId);
    });
  };

  const onNextTransactionComplete = (callback: () => void) => {
    let unsubscribe: (() => void) | undefined;
    unsubscribe = $lastTransactionId.subscribe((transactionId) => {
      if (transactionId === undefined) {
        return;
      }
      onTransactionComplete(transactionId, (success) => {
        if (success) {
          callback();
        }
      });
      unsubscribe?.();
    });

    scheduleTimeout(() => {
      unsubscribe?.();
    });
  };

  const completeTransaction = (transactionId: string, success: boolean) => {
    const transactionCallbacks = callbacks.get(transactionId);
    if (transactionCallbacks === undefined) {
      return;
    }
    for (const callback of transactionCallbacks) {
      callback(success);
    }
    callbacks.delete(transactionId);
  };

  const clear = () => {
    callbacks.clear();
    $lastTransactionId.set(undefined);
  };

  return {
    $lastTransactionId,
    callbacks,
    clear,
    completeTransaction,
    onNextTransactionComplete,
    onTransactionComplete,
  };
};
