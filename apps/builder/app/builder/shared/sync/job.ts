import { atom } from "nanostores";

// After this amount of retries without success, we consider connection status error.
const MAX_RETRY_RECOVERY = 5;

export type JobStatus = "running" | "idle" | "recovering" | "failed";

type BaseResult = { ok: true } | { ok: false; retry: boolean };

export const jobStatus = atom<JobStatus>("idle");

export const state: {
  lastScheduledJob: undefined | Job<BaseResult>;
  failedAttempts: number;
} = {
  lastScheduledJob: undefined,
  failedAttempts: 0,
};

type Job<Result extends BaseResult> = () => Promise<Result>;

export const scheduleJob = <Result extends BaseResult>(job: Job<Result>) => {
  state.lastScheduledJob = job;
  if (jobStatus.get() === "idle") {
    return executeJob();
  }
};

// We can't change to running or idle status from error or recovering status until
// we have one successful attempt.
const getStatus = (phase: "start" | "end"): JobStatus => {
  if (state.failedAttempts > 0) {
    if (state.failedAttempts < MAX_RETRY_RECOVERY) {
      return "recovering";
    }
    return "failed";
  }
  return phase === "start" ? "running" : "idle";
};

export const executeJob = () => {
  const job = state.lastScheduledJob;
  state.lastScheduledJob = undefined;

  if (job === undefined) {
    return;
  }

  jobStatus.set(getStatus("start"));

  return job()
    .then((result) => {
      if (result.ok === false) {
        if (result.retry) {
          throw Error("Bad response");
        }
      }
      state.failedAttempts = 0;
      jobStatus.set(getStatus("end"));
      // When the job was successful, we don't need to wait, we can attempt running another job immediately.
      executeJob();
    })
    .catch(() => {
      state.failedAttempts++;
      jobStatus.set(getStatus("end"));
      // Schedule the job again to retry it later,
      // from now on, recovery intervals will try to execute the job.
      if (state.lastScheduledJob === undefined) {
        state.lastScheduledJob = job;
      }
    });
};
