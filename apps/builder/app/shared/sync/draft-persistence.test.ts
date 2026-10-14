import { afterEach, expect, test, vi } from "vitest";
import { createDraftPersistence } from "./draft-persistence";

afterEach(() => vi.useRealTimers());
const options = () => ({
  signal: new AbortController().signal,
  timeoutMs: 100,
});

test("waits for all transactions present at submission, not later edits", async () => {
  const saves = createDraftPersistence();
  saves.reset("project");
  saves.begin("project", "one");
  saves.begin("project", "two");
  const done = vi.fn();
  const waiting = saves.wait("project", options()).then(done);
  saves.begin("project", "later");
  saves.complete("project", "one", true);
  await Promise.resolve();
  expect(done).not.toHaveBeenCalled();
  saves.complete("project", "two", true);
  await waiting;
  expect(done).toHaveBeenCalledOnce();
});

test("failed or dropped saves stay failed even after later successful saves", async () => {
  const saves = createDraftPersistence();
  saves.reset("project");
  saves.begin("project", "one");
  saves.complete("project", "one", false);
  saves.begin("project", "two");
  saves.complete("project", "two", true);
  await expect(saves.wait("project", options())).rejects.toMatchObject({
    reason: "save-failed",
  });
  saves.reset("project");
  await expect(saves.wait("project", options())).resolves.toBeUndefined();
});

test("project switch rejects pending waits and old acknowledgments cannot save the new project", async () => {
  const saves = createDraftPersistence();
  saves.reset("old");
  saves.begin("old", "one");
  const waiting = expect(saves.wait("old", options())).rejects.toThrow();
  saves.reset("new");
  saves.begin("new", "one");
  const done = vi.fn();
  const next = saves.wait("new", options()).then(done);
  saves.complete("old", "one", true);
  await Promise.resolve();
  expect(done).not.toHaveBeenCalled();
  saves.complete("new", "one", true);
  await next;
  await waiting;
});

test("cancellation and timeout stop waiting without claiming persistence", async () => {
  vi.useFakeTimers();
  const saves = createDraftPersistence();
  saves.reset("project");
  saves.begin("project", "one");
  const controller = new AbortController();
  const canceled = expect(
    saves.wait("project", { signal: controller.signal })
  ).rejects.toThrow("cancel");
  controller.abort(new Error("cancel"));
  await canceled;
  const timedOut = expect(
    saves.wait("project", options())
  ).rejects.toMatchObject({
    reason: "timeout",
  });
  await vi.advanceTimersByTimeAsync(100);
  await timedOut;
  saves.complete("project", "one", true);
  await expect(saves.wait("project", options())).resolves.toBeUndefined();
});

test("reload invalidation is sticky and another project's reload is ignored", async () => {
  const saves = createDraftPersistence();
  saves.reset("project");
  saves.invalidate("other");
  await expect(saves.wait("project", options())).resolves.toBeUndefined();
  saves.invalidate("project");
  await expect(saves.wait("project", options())).rejects.toMatchObject({
    reason: "changed",
  });
});
