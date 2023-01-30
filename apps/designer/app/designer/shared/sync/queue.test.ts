import { describe } from "@jest/globals";
import { dequeue, enqueue, state, queueStatus } from "./queue";

describe("queue", () => {
  afterEach(() => {
    state.queue = [];
    state.failedAttempts = 0;
    queueStatus.set("idle");
  });

  test("dequeue empty", () => {
    dequeue();
    expect(queueStatus.get()).toBe("idle");
  });

  test("enqueue with success", async () => {
    enqueue(() => Promise.resolve({ ok: true }));
    const jobPromise = dequeue();
    expect(queueStatus.get()).toBe("running");
    expect(state.failedAttempts).toBe(0);
    expect(state.queue.length).toBe(0);
    await jobPromise;
    expect(queueStatus.get()).toBe("idle");
    expect(state.failedAttempts).toBe(0);
    expect(state.queue.length).toBe(0);
  });

  test("enqueue with failure", async () => {
    enqueue(() => Promise.resolve({ ok: false }));
    const jobPromise = dequeue();
    expect(queueStatus.get()).toBe("running");
    expect(state.failedAttempts).toBe(0);
    expect(state.queue.length).toBe(0);

    await Promise.allSettled([jobPromise]);
    expect(queueStatus.get()).toBe("recovering");
    expect(state.failedAttempts).toBe(1);
    expect(state.queue.length).toBe(1);
  });

  test("recovering > failed > idle", async () => {
    let response = Promise.resolve({ ok: false });
    await enqueue(() => response);

    expect(queueStatus.get()).toBe("recovering");

    await dequeue();
    await dequeue();
    await dequeue();
    await dequeue();

    expect(state.queue.length).toBe(1);
    expect(queueStatus.get()).toBe("failed");
    expect(state.failedAttempts).toBe(5);

    response = Promise.resolve({ ok: true });
    await dequeue();

    expect(state.queue.length).toBe(0);
    expect(queueStatus.get()).toBe("idle");
    expect(state.failedAttempts).toBe(0);
  });
});
