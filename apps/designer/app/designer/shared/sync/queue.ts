import { atom } from "nanostores";

// After this amount of retries without success, we consider connection status error.
const MAX_RETRY_RECOVERY = 5;

export type QueueStatus = "processing" | "idle" | "recovering" | "error";

type BaseResult = { ok: boolean };

export const queueStatus = atom("idle");

export const state: {
  queue: Array<Job<BaseResult>>;
  failedAttempts: number;
} = {
  queue: [],
  failedAttempts: 0,
};

type Job<Result extends BaseResult> = () => Promise<Result>;

export const enqueue = <Result extends BaseResult>(job: Job<Result>) => {
  state.queue.push(job);
  if (queueStatus.get() === "idle") {
    return dequeue();
  }
};

// We can't change to processing or idle status from error or recovering status until
// we have one successful attempt.
const getStatus = (phase: "start" | "end"): QueueStatus => {
  if (state.failedAttempts > 0) {
    if (state.failedAttempts < MAX_RETRY_RECOVERY) {
      return "recovering";
    }
    return "error";
  }
  return phase === "start" ? "processing" : "idle";
};

export const dequeue = () => {
  const job = state.queue.shift();

  if (job === undefined) {
    return;
  }

  queueStatus.set(getStatus("start"));

  return job()
    .then((result) => {
      if (result.ok === false) {
        throw Error("Bad response");
      }
      state.failedAttempts = 0;
      queueStatus.set(getStatus("end"));
      // When the job was successful, we don't need to wait, we can attempt running another job immediately.
      dequeue();
    })
    .catch(() => {
      state.failedAttempts++;
      queueStatus.set(getStatus("end"));
      // Returning the job to the queue allows us to retry it later,
      // from now on, recovery intervals will try to execute the job.
      state.queue.unshift(job);
    });
};
