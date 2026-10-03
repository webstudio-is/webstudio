import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { expect, test } from "vitest";
import { useLegacyWebhookSubmission } from "./legacy-webhook-submission";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

test("legacy submission lifecycle works without a router provider", async () => {
  const states: string[] = [];
  const Harness = ({
    transportState,
    result,
  }: {
    transportState: "idle" | "submitting" | "loading";
    result?: { success: boolean };
  }) => {
    const submission = useLegacyWebhookSubmission({
      transportState,
      result,
      onStateChange: (state) => states.push(state),
      forwardedRef: null,
    });
    return (
      <form
        ref={submission.setFormRef}
        data-state={submission.state}
        aria-busy={submission.pending || undefined}
        onSubmit={(event) => {
          event.preventDefault();
          submission.handleSubmit(event);
        }}
      >
        <button type="submit">Send</button>
      </form>
    );
  };
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () => root.render(<Harness transportState="idle" />));
    await act(async () => container.querySelector("button")?.click());
    await act(async () => root.render(<Harness transportState="submitting" />));
    expect(container.querySelector("form")?.getAttribute("aria-busy")).toBe(
      "true"
    );
    await act(async () =>
      root.render(<Harness transportState="idle" result={{ success: false }} />)
    );
    expect(container.querySelector("form")?.getAttribute("data-state")).toBe(
      "error"
    );
    await act(async () => container.querySelector("button")?.click());
    await act(async () => root.render(<Harness transportState="loading" />));
    await act(async () =>
      root.render(<Harness transportState="idle" result={{ success: true }} />)
    );
    expect(container.querySelector("form")?.getAttribute("data-state")).toBe(
      "success"
    );
    expect(states).toEqual(["initial", "error", "initial", "success"]);
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});
