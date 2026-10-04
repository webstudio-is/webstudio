import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, expect, test, vi } from "vitest";
import { formBotFieldName, formIdFieldName } from "@webstudio-is/sdk/runtime";
import { useLegacyWebhookSubmission } from "./legacy-webhook-submission";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => vi.unstubAllGlobals());

test("saved Webhook Form submits through HTTP without a router provider", async () => {
  const states: string[] = [];
  const requests: Request[] = [];
  let resolveFirst: ((response: Response) => void) | undefined;
  vi.stubGlobal(
    "fetch",
    async (input: RequestInfo | URL, init?: RequestInit) => {
      requests.push(new Request(input, init));
      if (requests.length === 1) {
        return new Promise<Response>((resolve) => {
          resolveFirst = resolve;
        });
      }
      return Response.json({
        success: true,
        status: 200,
        results: [],
        errors: [],
      });
    }
  );
  const Harness = () => {
    const submission = useLegacyWebhookSubmission({
      onStateChange: (state) => states.push(state),
      forwardedRef: null,
    });
    return (
      <form
        ref={submission.setFormRef}
        data-state={submission.state}
        aria-busy={submission.pending || undefined}
        onSubmit={submission.handleSubmit}
      >
        <input type="hidden" name={formIdFieldName} value="saved-action" />
        <input name="message" defaultValue="Hello" />
        <button type="submit">Send</button>
      </form>
    );
  };
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () => root.render(<Harness />));
    await act(async () => container.querySelector("button")?.click());
    expect(container.querySelector("form")?.getAttribute("aria-busy")).toBe(
      "true"
    );
    expect(requests[0].method).toBe("POST");
    expect(new URL(requests[0].url).pathname).toBe(
      `/__ws-form${window.location.pathname}`
    );
    const firstBody = await requests[0].formData();
    expect(firstBody.get(formIdFieldName)).toBe("saved-action");
    expect(firstBody.get("message")).toBe("Hello");
    expect(firstBody.getAll(formBotFieldName)).toHaveLength(1);
    await act(async () =>
      resolveFirst?.(
        Response.json({
          success: false,
          status: 502,
          results: [],
          errors: [{ status: 502, body: null, message: "Rejected" }],
        })
      )
    );
    expect(container.querySelector("form")?.getAttribute("data-state")).toBe(
      "error"
    );
    await act(async () => container.querySelector("button")?.click());
    await vi.waitFor(() =>
      expect(container.querySelector("form")?.getAttribute("data-state")).toBe(
        "success"
      )
    );
    expect(requests).toHaveLength(2);
    expect(states).toEqual(["initial", "error", "initial", "success"]);
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});
