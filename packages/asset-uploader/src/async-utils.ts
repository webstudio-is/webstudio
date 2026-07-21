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
  const failures = settlements.flatMap((settlement) =>
    settlement.status === "rejected" ? [settlement.reason] : []
  );
  if (failures.length === 1) {
    throw failures[0];
  }
  if (failures.length > 1) {
    throw new AggregateError(failures, "Multiple bounded workers failed");
  }
  return results;
};

export const runBounded = async <Value>(
  values: readonly Value[],
  concurrency: number,
  run: (value: Value) => Promise<void>
) => {
  await mapBounded(values, concurrency, run);
};
