const delay = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

export const runWithTimeout = async <Result>({
  name,
  timeoutMs,
  settleTimeoutMs = 5_000,
  task,
  onTimeout,
}: {
  name: string;
  timeoutMs: number;
  settleTimeoutMs?: number;
  task: (signal: AbortSignal) => Promise<Result>;
  onTimeout?: () => Promise<void>;
}) => {
  const controller = new AbortController();
  const taskPromise = task(controller.signal);
  let timeout: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<{ type: "timeout" }>((resolve) => {
    timeout = setTimeout(() => resolve({ type: "timeout" }), timeoutMs);
  });

  try {
    const outcome = await Promise.race([
      taskPromise.then(
        (value) => ({ type: "success" as const, value }),
        (error: unknown) => ({ type: "failure" as const, error })
      ),
      timeoutPromise,
    ]);
    if (outcome.type === "success") {
      return outcome.value;
    }
    if (outcome.type === "failure") {
      throw outcome.error;
    }
    controller.abort();
    let cleanupError: unknown;
    try {
      await onTimeout?.();
    } catch (error) {
      cleanupError = error;
    }
    const settled = await Promise.race([
      taskPromise.then(
        () => true,
        () => true
      ),
      delay(settleTimeoutMs).then(() => false),
    ]);
    const error = new Error(
      `Timed out after ${timeoutMs}ms: ${name}${settled ? "" : `; task did not settle within ${settleTimeoutMs}ms`}`,
      cleanupError === undefined ? undefined : { cause: cleanupError }
    );
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};
