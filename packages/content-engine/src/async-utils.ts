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
