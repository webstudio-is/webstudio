export const createExclusiveAsyncRunner = () => {
  let queue = Promise.resolve();
  return async <Result>(callback: () => Promise<Result>) => {
    const previousRun = queue;
    let releaseCurrentRun: () => void = () => undefined;
    queue = new Promise((resolve) => {
      releaseCurrentRun = resolve;
    });
    await previousRun.catch(() => undefined);
    try {
      return await callback();
    } finally {
      releaseCurrentRun();
    }
  };
};

export const withTimeout = async <Result>(
  operation: Promise<Result>,
  timeout: number,
  createTimeoutError: () => Error
) => {
  let timeoutId: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(createTimeoutError()), timeout);
  });
  try {
    return await Promise.race([operation, timeoutPromise]);
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
};
