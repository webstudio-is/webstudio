import { atom } from "nanostores";

type TransactionCompleteCallback = (success: boolean) => void;
export type TransactionCompletionResult = "success" | "failure" | "timeout";
const maxCompletedTransactions = 1_000;

export const createTransactionCompletionStore = ({
  timeoutMs = 60_000,
  setTimeout: setTimer,
}: {
  timeoutMs?: number;
  setTimeout?: typeof globalThis.setTimeout;
} = {}) => {
  const $lastTransactionId = atom<string | undefined>();
  const callbacks = new Map<string, TransactionCompleteCallback[]>();
  const completedTransactions = new Map<string, boolean>();
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

  const onNextTransactionSettled = (
    callback: (result: TransactionCompletionResult) => void
  ) => {
    let settled = false;
    let unsubscribe = () => {};
    const settle = (result: TransactionCompletionResult) => {
      if (settled) {
        return;
      }
      settled = true;
      unsubscribe();
      callback(result);
    };
    const register = (transactionId: string) => {
      onTransactionComplete(transactionId, (success) => {
        settle(success ? "success" : "failure");
      });
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
      settle("timeout");
    });
    return () => {
      settled = true;
      unsubscribe();
    };
  };

  const onNextTransactionComplete = (callback: () => void) =>
    onNextTransactionSettled((result) => {
      if (result === "success") {
        callback();
      }
    });

  const waitForNextTransactionComplete = () =>
    new Promise<TransactionCompletionResult>((resolve) => {
      onNextTransactionSettled(resolve);
    });

  const waitForTransactionComplete = (
    transactionId: string
  ): Promise<TransactionCompletionResult> => {
    const completed = completedTransactions.get(transactionId);
    if (completed !== undefined) {
      return Promise.resolve(completed ? "success" : "failure");
    }
    return new Promise<TransactionCompletionResult>((resolve) => {
      let settled = false;
      const settle = (result: TransactionCompletionResult) => {
        if (settled) {
          return;
        }
        settled = true;
        resolve(result);
      };
      onTransactionComplete(transactionId, (success) => {
        settle(success ? "success" : "failure");
      });
      scheduleTimeout(() => settle("timeout"));
    });
  };

  const completeTransaction = (transactionId: string, success: boolean) => {
    completedTransactions.delete(transactionId);
    completedTransactions.set(transactionId, success);
    if (completedTransactions.size > maxCompletedTransactions) {
      const oldestTransactionId = completedTransactions.keys().next().value;
      if (oldestTransactionId !== undefined) {
        completedTransactions.delete(oldestTransactionId);
      }
    }
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
    completedTransactions.clear();
    $lastTransactionId.set(undefined);
  };

  return {
    $lastTransactionId,
    callbacks,
    clear,
    completeTransaction,
    onNextTransactionComplete,
    waitForNextTransactionComplete,
    waitForTransactionComplete,
    onTransactionComplete,
  };
};
