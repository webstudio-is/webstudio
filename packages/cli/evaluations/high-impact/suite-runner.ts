export const runConcurrently = async <Value, Result>(
  values: readonly Value[],
  run: (value: Value) => Promise<Result>,
  maxConcurrency = values.length
) => {
  if (Number.isSafeInteger(maxConcurrency) === false || maxConcurrency < 1) {
    throw new Error("Evaluation concurrency must be a positive integer");
  }
  const settlements: PromiseSettledResult<Result>[] = new Array(values.length);
  let nextIndex = 0;
  const workerCount = Math.min(values.length, maxConcurrency);
  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < values.length) {
        const index = nextIndex++;
        try {
          settlements[index] = {
            status: "fulfilled",
            value: await run(values[index] as Value),
          };
        } catch (reason) {
          settlements[index] = { status: "rejected", reason };
        }
      }
    })
  );
  const failures = settlements.flatMap((settlement) =>
    settlement.status === "rejected" ? [settlement.reason] : []
  );
  if (failures.length === 1) {
    throw failures[0];
  }
  if (failures.length > 1) {
    throw new AggregateError(failures, "Multiple evaluations failed to run");
  }
  return settlements.map((settlement) =>
    settlement.status === "fulfilled" ? settlement.value : undefined
  ) as Result[];
};
