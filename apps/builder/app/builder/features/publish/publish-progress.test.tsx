import { useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, expect, test, vi } from "vitest";
import type { Project } from "@webstudio-is/project";
import { __testing__ } from "./publish";

const { usePublishProgress, waitForPublishStatus, refreshUntilSuccess } =
  __testing__;

let root: Root | undefined;
let container: HTMLDivElement | undefined;

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  container?.remove();
  container = undefined;
  vi.useRealTimers();
});

test("closing publish hides the countdown while polling continues and completion clears pending", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-20T12:00:00Z"));

  let status: "PENDING" | "PUBLISHED" = "PENDING";
  let statusRequests = 0;

  const Harness = () => {
    const [isOpen, setIsOpen] = useState(true);
    const [completedStatus, setCompletedStatus] = useState<string>();
    const progress = usePublishProgress();
    return (
      <>
        <button
          onClick={() =>
            progress.start(async () => {
              const result = await waitForPublishStatus(async () => {
                statusRequests += 1;
                return {
                  latestBuildVirtual: {
                    createdAt: new Date().toISOString(),
                    publishStatus: status,
                  },
                } as Project;
              });
              setCompletedStatus(result?.status);
            })
          }
        >
          Start
        </button>
        <button
          onClick={() => {
            progress.dismissCountdown();
            setIsOpen(false);
          }}
        >
          Close
        </button>
        <button onClick={() => setIsOpen(true)}>Open</button>
        {isOpen && (
          <output>
            {progress.isPublishing ? "pending" : "complete"}:
            {progress.countdown ?? "no countdown"}:{completedStatus ?? "none"}
          </output>
        )}
      </>
    );
  };

  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root?.render(<Harness />));

  const [start, close, open] = container.querySelectorAll("button");
  act(() => start.click());
  expect(container.querySelector("output")?.textContent).toBe(
    "pending:60:none"
  );

  await act(async () => vi.advanceTimersByTimeAsync(10_000));
  expect(container.querySelector("output")?.textContent).toBe(
    "pending:50:none"
  );

  act(() => close.click());
  act(() => open.click());
  expect(container.querySelector("output")?.textContent).toBe(
    "pending:no countdown:none"
  );

  act(() => close.click());
  status = "PUBLISHED";
  await act(async () => vi.advanceTimersByTimeAsync(5_000));
  act(() => open.click());
  expect(container.querySelector("output")?.textContent).toBe(
    "complete:no countdown:PUBLISHED"
  );
  expect(statusRequests).toBe(2);
});

test("reopening refresh retries after a rejected status request", async () => {
  vi.useFakeTimers();
  const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
  let attempts = 0;
  const refresh = async () => {
    attempts += 1;
    if (attempts === 1) {
      throw new Error("Network unavailable");
    }
    return {} as Project;
  };

  try {
    const done = refreshUntilSuccess(refresh, () => true);
    expect(attempts).toBe(1);
    await vi.advanceTimersByTimeAsync(5_000);
    await done;
    expect(attempts).toBe(2);
  } finally {
    errorLog.mockRestore();
  }
});
