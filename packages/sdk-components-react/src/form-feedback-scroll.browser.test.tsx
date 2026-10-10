import { useState } from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, expect, test, vi } from "vitest";
import { useFormFeedbackScroll } from "./form-feedback-scroll";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type Controller = {
  prepare: () => void;
  complete: (state: "success" | "error") => void;
  reset: () => void;
};

const renderFeedback = async (persistent = false) => {
  const controller = { current: undefined as Controller | undefined };
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const Form = () => {
    const [state, setState] = useState<"initial" | "success" | "error">(
      "initial"
    );
    const { setFormRef, prepareFeedback, revealFeedback } =
      useFormFeedbackScroll(null, state);
    controller.current = {
      prepare: prepareFeedback,
      complete: (nextState) => {
        setState(nextState);
        revealFeedback();
      },
      reset: () => setState("initial"),
    };
    return (
      <form ref={setFormRef}>
        {state !== "initial" && <div data-new-status />}
        {state === "initial" && <button>Send</button>}
        {persistent ? (
          <div
            data-feedback="error"
            data-ws-form-feedback
            style={{ display: state === "error" ? "block" : "none" }}
          >
            error
          </div>
        ) : (
          state !== "initial" && (
            <div data-feedback={state} data-ws-form-feedback>
              {state}
            </div>
          )
        )}
      </form>
    );
  };
  await act(async () => root.render(<Form />));
  return {
    container,
    controller: controller as { current: Controller },
    cleanup: async () => {
      await act(async () => root.unmount());
      container.remove();
    },
  };
};

afterEach(() => vi.restoreAllMocks());

test.each([
  { position: "offscreen", top: window.innerHeight + 20, expected: 1 },
  { position: "visible", top: 40, expected: 0 },
])("scrolls $position feedback only when needed", async ({ top, expected }) => {
  const view = await renderFeedback();
  const scrolledElements: HTMLElement[] = [];
  const scroll = vi
    .spyOn(HTMLElement.prototype, "scrollIntoView")
    .mockImplementation(function (this: HTMLElement) {
      scrolledElements.push(this);
    });
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
    () => ({ top, bottom: top + 30 }) as DOMRect
  );
  try {
    view.controller.current.prepare();
    await act(async () => view.controller.current.complete("error"));
    if (expected) {
      await vi.waitFor(() => expect(scroll).toHaveBeenCalledOnce());
      expect(scroll.mock.calls[0][0]).toMatchObject({ block: "center" });
      expect(scrolledElements[0]?.hasAttribute("data-ws-form-feedback")).toBe(
        true
      );
    } else {
      await new Promise((resolve) => setTimeout(resolve, 80));
      expect(scroll).not.toHaveBeenCalled();
    }
  } finally {
    await view.cleanup();
  }
});

test("uses instant scrolling with reduced motion and handles repeated errors", async () => {
  const view = await renderFeedback(true);
  const scroll = vi
    .spyOn(HTMLElement.prototype, "scrollIntoView")
    .mockImplementation(() => {});
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
    () =>
      ({
        top: window.innerHeight + 20,
        bottom: window.innerHeight + 50,
      }) as DOMRect
  );
  const matchMedia = vi.spyOn(window, "matchMedia").mockImplementation(
    (query) =>
      ({
        matches: query === "(prefers-reduced-motion: reduce)",
      }) as MediaQueryList
  );
  try {
    view.controller.current.prepare();
    await act(async () => view.controller.current.complete("error"));
    await vi.waitFor(() => expect(scroll).toHaveBeenCalledTimes(1));
    expect(scroll.mock.calls[0][0]).toMatchObject({ behavior: "instant" });
    await act(async () => view.controller.current.reset());
    view.controller.current.prepare();
    await act(async () => view.controller.current.complete("error"));
    await vi.waitFor(() => expect(scroll).toHaveBeenCalledTimes(2));
    expect(matchMedia).toHaveBeenCalledWith("(prefers-reduced-motion: reduce)");
  } finally {
    await view.cleanup();
  }
});
