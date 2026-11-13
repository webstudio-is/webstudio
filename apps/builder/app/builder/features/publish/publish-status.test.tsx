import { expect, test, vi } from "vitest";
import type { Project } from "@webstudio-is/project";
import { __testing__ } from "./publish";

const { waitForPublishStatus } = __testing__;

test("a new publish waits past the previous build's failure", async () => {
  vi.useFakeTimers();
  try {
    let calls = 0;
    let settled = false;
    const pending = waitForPublishStatus(
      async () => {
        calls += 1;
        return {
          latestBuildVirtual: {
            buildId: calls === 1 ? "previous" : "current",
            createdAt: new Date().toISOString(),
            publishStatus: calls === 1 ? "FAILED" : "PUBLISHED",
          },
        } as Project;
      },
      () => true,
      "previous"
    ).then((result) => {
      settled = true;
      return result;
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(15_000);
    expect((await pending)?.status).toBe("PUBLISHED");
    expect(calls).toBe(2);
  } finally {
    vi.useRealTimers();
  }
});
