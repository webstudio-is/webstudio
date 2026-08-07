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
    signal?.throwIfAborted();
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
        try {
          signal?.throwIfAborted();
        } catch (error) {
          reject(error);
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
      return await run();
    } finally {
      release();
    }
  };
};
