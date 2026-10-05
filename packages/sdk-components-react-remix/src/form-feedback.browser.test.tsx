import { useState } from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, expect, test, vi } from "vitest";
import { NativeForm } from "./native-form";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test("managed Remix Form scrolls partial failure and reveals visible success", async () => {
  const action = vi
    .fn()
    .mockResolvedValueOnce({
      success: false,
      status: 502,
      results: [
        { resourceId: "first", status: 200, body: "ok" },
        { resourceId: "second", status: 422, body: "failed" },
      ],
      errors: [
        {
          resourceId: "second",
          status: 422,
          body: "failed",
          message: "failed",
        },
      ],
    })
    .mockResolvedValueOnce({
      success: true,
      status: 200,
      results: [],
      errors: [],
    });
  vi.stubGlobal("fetch", async () => Response.json(await action()));
  const Form = () => {
    const [state, setState] = useState<"initial" | "success" | "error">(
      "initial"
    );
    return (
      <NativeForm
        data-ws-managed-form-id="saved-managed-form"
        submission={{ destinations: ["first", "second"] }}
        state={state}
        onStateChange={setState}
      >
        {state !== "success" && <button type="submit">Send</button>}
        {state === "error" && <div data-feedback="error">Partial failure</div>}
        {state === "success" && <div data-feedback="success">Done</div>}
      </NativeForm>
    );
  };
  const router = createMemoryRouter([{ path: "/", element: <Form />, action }]);
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const scroll = vi
    .spyOn(HTMLElement.prototype, "scrollIntoView")
    .mockImplementation(() => {});
  let top = window.innerHeight + 30;
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
    function (this: HTMLElement) {
      const actualTop = this.hasAttribute("data-feedback") ? top : 0;
      return { top: actualTop, bottom: actualTop + 30 } as DOMRect;
    }
  );
  try {
    await act(async () => root.render(<RouterProvider router={router} />));
    await act(async () => container.querySelector("button")?.click());
    await vi.waitFor(() => expect(scroll).toHaveBeenCalledTimes(1));
    top = 40;
    await act(async () => container.querySelector("button")?.click());
    await vi.waitFor(() =>
      expect(
        container.querySelector('[data-feedback="success"]')
      ).not.toBeNull()
    );
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(scroll).toHaveBeenCalledTimes(1);
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});
