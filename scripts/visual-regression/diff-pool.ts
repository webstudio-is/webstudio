import { Worker } from "node:worker_threads";
import {
  diffPngFiles,
  type ScreenshotDiffResult,
} from "@webstudio-is/project-build/vision";
import type { DiffWorkerRequest, DiffWorkerResponse } from "./diff-worker";

type Task = {
  id: number;
  options: Parameters<typeof diffPngFiles>[0];
  resolve: (result: ScreenshotDiffResult) => void;
  reject: (error: Error) => void;
};

export const createDiffPool = (size: number) => {
  const workers = Array.from(
    { length: size },
    () =>
      new Worker(new URL("./diff-worker-entry.mjs", import.meta.url), {
        execArgv: ["--conditions=webstudio"],
      })
  );
  const idleWorkers = [...workers];
  const queue: Task[] = [];
  const activeTasks = new Map<number, Task>();
  const taskIds = new Map<Worker, number>();
  let nextTaskId = 0;
  let failure: Error | undefined;
  let closing = false;

  const dispatch = () => {
    while (idleWorkers.length > 0 && queue.length > 0) {
      const worker = idleWorkers.shift();
      const task = queue.shift();
      if (worker === undefined || task === undefined) {
        return;
      }
      activeTasks.set(task.id, task);
      taskIds.set(worker, task.id);
      worker.postMessage({
        id: task.id,
        options: task.options,
      } satisfies DiffWorkerRequest);
    }
  };

  const fail = (error: Error) => {
    failure ??= error;
    for (const task of queue.splice(0)) {
      task.reject(error);
    }
  };

  const handleWorkerFailure = (worker: Worker, error: Error) => {
    const taskId = taskIds.get(worker);
    if (taskId !== undefined) {
      activeTasks.get(taskId)?.reject(error);
      activeTasks.delete(taskId);
      taskIds.delete(worker);
    }
    const idleIndex = idleWorkers.indexOf(worker);
    if (idleIndex !== -1) {
      idleWorkers.splice(idleIndex, 1);
    }
    fail(error);
  };

  for (const worker of workers) {
    worker.on("message", (response: DiffWorkerResponse) => {
      const task = activeTasks.get(response.id);
      if (task === undefined) {
        return;
      }
      activeTasks.delete(response.id);
      taskIds.delete(worker);
      if ("error" in response) {
        task.reject(new Error(response.error));
      } else {
        task.resolve(response.result);
      }
      idleWorkers.push(worker);
      dispatch();
    });
    worker.on("error", (error) => {
      handleWorkerFailure(worker, error);
    });
    worker.on("exit", (code) => {
      if (closing === false) {
        handleWorkerFailure(
          worker,
          new Error(`Visual diff worker exited unexpectedly with code ${code}.`)
        );
      }
    });
  }

  return {
    run(options: Parameters<typeof diffPngFiles>[0]) {
      if (failure !== undefined) {
        return Promise.reject(failure);
      }
      return new Promise<ScreenshotDiffResult>((resolve, reject) => {
        queue.push({ id: nextTaskId, options, resolve, reject });
        nextTaskId += 1;
        dispatch();
      });
    },
    async close() {
      closing = true;
      await Promise.all(workers.map(async (worker) => worker.terminate()));
    },
  };
};
