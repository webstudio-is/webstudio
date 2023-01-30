import { atom, type WritableAtom } from "nanostores";

// After this amount of retries without success, we consider connection status error.
const MAX_RETRY_RECOVERY = 5;

export type SyncStatus = "syncing" | "idle" | "recovering" | "error";

type BaseResult = { ok: boolean };

export const state: {
  status: WritableAtom<SyncStatus>;
  queue: Array<Job<BaseResult>>;
  failedAttempts: number;
} = {
  status: atom("idle"),
  queue: [],
  failedAttempts: 0,
};

type Job<Result extends BaseResult> = () => Promise<Result>;

export const enqueue = <Result extends BaseResult>(job: Job<Result>) => {
  state.queue.push(job);
  if (state.status.get() === "idle") {
    return dequeue();
  }
};

// We can't change to syncing or idle status from error or recovering status until
// we have one successful attempt.
const getStatus = (phase: "start" | "end"): SyncStatus => {
  if (state.failedAttempts > 0) {
    if (state.failedAttempts < MAX_RETRY_RECOVERY) {
      return "recovering";
    }
    return "error";
  }
  return phase === "start" ? "syncing" : "idle";
};

export const dequeue = () => {
  const job = state.queue.shift();

  if (job === undefined) {
    return;
  }

  state.status.set(getStatus("start"));

  return job()
    .then((result) => {
      if (result.ok === false) {
        throw Error("Bad response");
      }
      state.failedAttempts = 0;
      state.status.set(getStatus("end"));
      // When the job was successful, we don't need to wait, we can attempt running another job immediately.
      dequeue();
    })
    .catch(() => {
      state.failedAttempts++;
      state.status.set(getStatus("end"));
      // Returning the job to the queue allows us to retry it later,
      // from now on, recovery intervals will try to execute the job.
      state.queue.unshift(job);
    });
};
