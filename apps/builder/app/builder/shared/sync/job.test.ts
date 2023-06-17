import { describe, afterEach, test, expect } from "@jest/globals";
import { executeJob, scheduleJob, state, jobStatus } from "./job";

describe("job", () => {
  afterEach(() => {
    state.lastScheduledJob = undefined;
    state.failedAttempts = 0;
    jobStatus.set("idle");
  });

  test("executeJob empty", () => {
    executeJob();
    expect(jobStatus.get()).toBe("idle");
  });

  test("schedule job with success", async () => {
    scheduleJob(() => Promise.resolve({ ok: true }));
    const jobPromise = executeJob();
    expect(jobStatus.get()).toBe("running");
    expect(state.failedAttempts).toBe(0);
    expect(state.lastScheduledJob).toBe(undefined);
    await jobPromise;
    expect(jobStatus.get()).toBe("idle");
    expect(state.failedAttempts).toBe(0);
    expect(state.lastScheduledJob).toBe(undefined);
  });

  test("schedule job with failure", async () => {
    scheduleJob(() => Promise.resolve({ ok: false, retry: true }));
    const jobPromise = executeJob();
    expect(jobStatus.get()).toBe("running");
    expect(state.failedAttempts).toBe(0);
    expect(state.lastScheduledJob).toBe(undefined);

    await Promise.allSettled([jobPromise]);
    expect(jobStatus.get()).toBe("recovering");
    expect(state.failedAttempts).toBe(1);
    expect(state.lastScheduledJob).not.toBe(undefined);
  });

  test("recovering > failed > idle", async () => {
    let response = Promise.resolve({ ok: false });
    await scheduleJob(async () => {
      const { ok } = await response;
      if (ok) {
        return { ok: true };
      }
      return { ok: false, retry: true };
    });

    expect(jobStatus.get()).toBe("recovering");

    await executeJob();
    await executeJob();
    await executeJob();
    await executeJob();

    expect(state.lastScheduledJob).not.toBe(undefined);
    expect(jobStatus.get()).toBe("failed");
    expect(state.failedAttempts).toBe(5);

    response = Promise.resolve({ ok: true });
    await executeJob();

    expect(state.lastScheduledJob).toBe(undefined);
    expect(jobStatus.get()).toBe("idle");
    expect(state.failedAttempts).toBe(0);
  });
});
