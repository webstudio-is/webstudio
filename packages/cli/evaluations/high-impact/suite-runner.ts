export const runConcurrently = async <Value, Result>(
  values: readonly Value[],
  run: (value: Value) => Promise<Result>
) => {
  const settlements = await Promise.allSettled(values.map(run));
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
