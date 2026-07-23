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
