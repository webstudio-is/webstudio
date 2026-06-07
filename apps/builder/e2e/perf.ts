export const logPerf = (phase: string, startedAt: number) => {
  console.info(
    `[e2e:perf] phase="${phase}" duration=${Date.now() - startedAt}ms`
  );
};

export const measure = async <Result>(
  phase: string,
  task: () => Promise<Result>
) => {
  const startedAt = Date.now();

  try {
    return await task();
  } finally {
    logPerf(phase, startedAt);
  }
};
