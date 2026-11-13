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
      const currentCallbacks = callbacks.get(transactionId);
      if (currentCallbacks === undefined) {
        return;
      }
      const callbackIndex = currentCallbacks.indexOf(callback);
      if (callbackIndex === -1) {
        return;
      }
      const remainingCallbacks = [...currentCallbacks];
      remainingCallbacks.splice(callbackIndex, 1);
      if (remainingCallbacks.length === 0) {
        callbacks.delete(transactionId);
      } else {
        callbacks.set(transactionId, remainingCallbacks);
      }
    });
  };

  const onNextTransactionComplete = (callback: () => void) => {
    let settled = false;
    let unsubscribe = () => {};
    const settle = (success: boolean) => {
      if (settled) {
        return;
      }
      settled = true;
      unsubscribe();
      if (success) {
        callback();
      }
    };
    const register = (transactionId: string) => {
      onTransactionComplete(transactionId, settle);
    };
    const currentTransactionId = $lastTransactionId.get();
    if (currentTransactionId !== undefined) {
      register(currentTransactionId);
    } else {
      unsubscribe = $lastTransactionId.listen((transactionId) => {
        if (transactionId === undefined) {
          return;
        }
        register(transactionId);
        unsubscribe();
      });
    }

    scheduleTimeout(() => {
      settle(false);
    });
    return () => {
      settled = true;
      unsubscribe();
    };
  };

  const completeTransaction = (transactionId: string, success: boolean) => {
    const transactionCallbacks = callbacks.get(transactionId);
    callbacks.delete(transactionId);
    if ($lastTransactionId.get() === transactionId) {
      $lastTransactionId.set(undefined);
    }
    if (transactionCallbacks !== undefined) {
      for (const callback of transactionCallbacks) {
        callback(success);
      }
    }
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
