const metrics: Array<{ phase: string; duration: number }> = [];

export const logPerf = (phase: string, startedAt: number) => {
  const duration = Date.now() - startedAt;
  metrics.push({ phase, duration });
  console.info(`[e2e:perf] phase="${phase}" duration=${duration}ms`);
};

export const printPerfSummary = () => {
  if (metrics.length === 0) {
    return;
  }

  console.info("[e2e:perf:summary] begin");
  for (const { phase, duration } of metrics) {
    console.info(`[e2e:perf:summary] phase="${phase}" duration=${duration}ms`);
  }
  console.info("[e2e:perf:slowest] begin");
  for (const { phase, duration } of [...metrics]
    .sort((left, right) => right.duration - left.duration)
    .slice(0, 30)) {
    console.info(`[e2e:perf:slowest] phase="${phase}" duration=${duration}ms`);
  }
  console.info("[e2e:perf:slowest] end");
  console.info("[e2e:perf:summary] end");
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
