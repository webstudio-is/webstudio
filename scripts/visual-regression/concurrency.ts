export const mapWithConcurrency = async <Input, Output>({
  values,
  concurrency,
  map,
}: {
  values: readonly Input[];
  concurrency: number;
  map: (value: Input) => Promise<Output>;
}) => {
  const results = new Array<Output>(values.length);
  let nextIndex = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, async () => {
      while (nextIndex < values.length) {
        const index = nextIndex;
        nextIndex += 1;
        results[index] = await map(values[index]);
      }
    })
  );
  return results;
};
