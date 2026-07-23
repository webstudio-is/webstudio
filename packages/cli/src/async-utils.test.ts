import { expect, test } from "vitest";
import { createExclusiveAsyncRunner } from "./async-utils";

test("runs asynchronous work exclusively in call order", async () => {
  const runExclusive = createExclusiveAsyncRunner();
  const events: string[] = [];
  let releaseFirst: () => void = () => undefined;
  let markFirstStarted: () => void = () => undefined;
  const firstStarted = new Promise<void>((resolve) => {
    markFirstStarted = resolve;
  });
  const firstBlocked = new Promise<void>((resolve) => {
    releaseFirst = resolve;
  });

  const first = runExclusive(async () => {
    events.push("first:start");
    markFirstStarted();
    await firstBlocked;
    events.push("first:end");
  });
  const second = runExclusive(async () => {
    events.push("second");
  });
  await firstStarted;
  expect(events).toEqual(["first:start"]);

  releaseFirst();
  await Promise.all([first, second]);
  expect(events).toEqual(["first:start", "first:end", "second"]);
});

test("continues after a failed run", async () => {
  const runExclusive = createExclusiveAsyncRunner();

  await expect(
    runExclusive(async () => {
      throw new Error("failed");
    })
  ).rejects.toThrow("failed");
  await expect(runExclusive(async () => "complete")).resolves.toBe("complete");
});
