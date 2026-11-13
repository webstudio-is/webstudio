export const mapBounded = async <Value, Result>(
  values: readonly Value[],
  concurrency: number,
  run: (value: Value) => Promise<Result>
) => {
  if (Number.isSafeInteger(concurrency) === false || concurrency <= 0) {
    throw new Error("Concurrency must be a positive safe integer");
  }
  let cursor = 0;
  const results = new Array<Result>(values.length);
  const worker = async () => {
    while (cursor < values.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await run(values[index]);
    }
  };
  const workers = Array.from(
    { length: Math.min(concurrency, values.length) },
    worker
  );
  const settlements = await Promise.allSettled(workers);
  const failure = settlements.find(
    (settlement): settlement is PromiseRejectedResult =>
      settlement.status === "rejected"
  );
  if (failure !== undefined) {
    throw failure.reason;
  }
  return results;
};

const getAbortReason = (signal: AbortSignal) =>
  signal.reason ?? new DOMException("The operation was aborted", "AbortError");

const throwIfSignalAborted = (signal: AbortSignal | undefined) => {
  if (signal?.aborted) {
    throw getAbortReason(signal);
  }
};

export const awaitWithSignal = async <Result>(
  task: Result | PromiseLike<Result>,
  signal?: AbortSignal
) => {
  if (signal === undefined) {
    return await task;
  }
  return await new Promise<Result>((resolve, reject) => {
    const cleanup = () => signal.removeEventListener("abort", onAbort);
    const onAbort = () => {
      cleanup();
      reject(getAbortReason(signal));
    };
    signal.addEventListener("abort", onAbort, { once: true });
    Promise.resolve(task).then(
      (value) => {
        cleanup();
        resolve(value);
      },
      (error) => {
        cleanup();
        reject(error);
      }
    );
    if (signal.aborted) {
      onAbort();
    }
  });
};

export const createConcurrencyLimiter = ({
  concurrency,
  signal,
}: {
  concurrency: number;
  signal?: AbortSignal;
}) => {
  if (Number.isSafeInteger(concurrency) === false || concurrency <= 0) {
    throw new TypeError("Concurrency must be a positive safe integer");
  }
  let active = 0;
  const waiters: Array<{ start: () => void }> = [];

  const acquire = async () => {
    throwIfSignalAborted(signal);
    if (active < concurrency) {
      active += 1;
      return;
    }
    await new Promise<void>((resolve, reject) => {
      let waiter: { start: () => void };
      const onAbort = () => {
        const index = waiters.indexOf(waiter);
        if (index !== -1) {
          waiters.splice(index, 1);
        }
        if (signal !== undefined) {
          reject(getAbortReason(signal));
        }
      };
      waiter = {
        start: () => {
          signal?.removeEventListener("abort", onAbort);
          resolve();
        },
      };
      waiters.push(waiter);
      signal?.addEventListener("abort", onAbort, { once: true });
    });
  };

  const release = () => {
    const next = waiters.shift();
    if (next === undefined) {
      active -= 1;
      return;
    }
    next.start();
  };

  return async <Result>(run: () => Promise<Result>) => {
    await acquire();
    try {
      throwIfSignalAborted(signal);
      return await run();
    } finally {
      release();
    }
  };
};
