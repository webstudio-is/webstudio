import { useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, expect, test, vi } from "vitest";
import { __testing__ } from "./publish";

const { usePublishProgress } = __testing__;

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

  let finishPublish: () => void = () => {};
  const publish = new Promise<void>((resolve) => {
    finishPublish = resolve;
  });

  const Harness = () => {
    const [isOpen, setIsOpen] = useState(true);
    const progress = usePublishProgress();
    return (
      <>
        <button onClick={() => progress.start(() => publish)}>Start</button>
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
            {progress.countdown ?? "no countdown"}
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
  expect(container.querySelector("output")?.textContent).toBe("pending:60");

  act(() => vi.advanceTimersByTime(10_000));
  expect(container.querySelector("output")?.textContent).toBe("pending:50");

  act(() => close.click());
  act(() => open.click());
  expect(container.querySelector("output")?.textContent).toBe(
    "pending:no countdown"
  );

  act(() => close.click());
  await act(async () => finishPublish());
  act(() => open.click());
  expect(container.querySelector("output")?.textContent).toBe(
    "complete:no countdown"
  );
});
