import { useState } from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, expect, test, vi } from "vitest";
import {
  formBotFieldName,
  validateManagedFormBot,
} from "@webstudio-is/sdk/runtime";
import { WebhookForm } from "./webhook-form";
import { NativeForm } from "./native-form";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => vi.restoreAllMocks());

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

test("saved Remix Webhook Form scrolls repeated offscreen errors and leaves visible feedback alone", async () => {
  const action = vi.fn().mockResolvedValue({ success: false });
  const Form = () => {
    const [state, setState] = useState<"initial" | "success" | "error">(
      "initial"
    );
    return (
      <WebhookForm
        action="saved-webhook"
        state={state}
        onStateChange={setState}
      >
        <button type="submit">Send</button>
        {state === "error" && <div data-feedback="error">Try again</div>}
      </WebhookForm>
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
    await act(async () => container.querySelector("button")?.click());
    await vi.waitFor(() => expect(scroll).toHaveBeenCalledTimes(2));
    top = 40;
    await act(async () => container.querySelector("button")?.click());
    await vi.waitFor(() => expect(action).toHaveBeenCalledTimes(3));
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(scroll).toHaveBeenCalledTimes(2);
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});

test("saved Remix Webhook Form redirects after success without scrolling", async () => {
  const action = vi.fn().mockResolvedValue({ success: true });
  const Form = () => {
    const [state, setState] = useState<"initial" | "success" | "error">(
      "initial"
    );
    return (
      <WebhookForm
        action="saved-webhook"
        state={state}
        onStateChange={setState}
        successRedirect="#after-legacy-form"
      >
        <button type="submit">Send</button>
        {state === "success" && <div data-feedback="success">Done</div>}
      </WebhookForm>
    );
  };
  const router = createMemoryRouter([{ path: "/", element: <Form />, action }]);
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const previousUrl = window.location.href;
  const scroll = vi
    .spyOn(HTMLElement.prototype, "scrollIntoView")
    .mockImplementation(() => {});
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
    () =>
      ({
        top: window.innerHeight + 30,
        bottom: window.innerHeight + 60,
      }) as DOMRect
  );
  try {
    await act(async () => root.render(<RouterProvider router={router} />));
    await act(async () => container.querySelector("button")?.click());
    await vi.waitFor(() =>
      expect(window.location.hash).toBe("#after-legacy-form")
    );
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(scroll).not.toHaveBeenCalled();
  } finally {
    await act(async () => root.unmount());
    container.remove();
    window.history.replaceState(null, "", previousUrl);
  }
});

test.each(["browser", "brave"] as const)(
  "saved Remix Webhook Form sends one current bot field across aged %s retries",
  async (browser) => {
    const originalBrave = Object.getOwnPropertyDescriptor(navigator, "brave");
    if (browser === "brave") {
      Object.defineProperty(navigator, "brave", {
        configurable: true,
        value: { isBrave: () => true },
      });
    } else {
      vi.spyOn(window, "matchMedia").mockImplementation(
        (query) =>
          ({
            matches:
              query.startsWith("(device-aspect-ratio:") ||
              query ===
                `(device-width: ${screen.width}px) and (device-height: ${screen.height}px)` ||
              query === "(prefers-color-scheme: light)",
          }) as MediaQueryList
      );
    }
    vi.useFakeTimers({ toFake: ["Date"] });
    const start = 1_700_000_000_000;
    vi.setSystemTime(start);
    const received: FormData[] = [];
    const destination = vi.fn();
    const action = vi.fn(async ({ request }: { request: Request }) => {
      const formData = await request.formData();
      received.push(formData);
      validateManagedFormBot(formData);
      destination();
      return { success: false };
    });
    const Form = () => {
      const [state, setState] = useState<"initial" | "success" | "error">(
        "initial"
      );
      return (
        <WebhookForm
          action="saved-webhook"
          state={state}
          onStateChange={setState}
        >
          <input name="message" defaultValue="Hello" />
          <button type="submit">Send</button>
          {state === "error" && <div>Try again</div>}
        </WebhookForm>
      );
    };
    const router = createMemoryRouter([
      { path: "/", element: <Form />, action },
    ]);
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    try {
      await act(async () => root.render(<RouterProvider router={router} />));
      for (let attempt = 0; attempt < 3; attempt++) {
        if (attempt > 0) {
          vi.setSystemTime(start + attempt * 300_001);
        }
        await act(async () => container.querySelector("button")?.click());
        await vi.waitFor(() =>
          expect(destination).toHaveBeenCalledTimes(attempt + 1)
        );
        const botFields = received[attempt].getAll(formBotFieldName);
        expect(botFields).toHaveLength(1);
        if (browser === "brave") {
          expect(botFields).toEqual(["brave"]);
        } else {
          const submittedTime = parseInt(String(botFields[0]), 16);
          expect(submittedTime).toBeGreaterThanOrEqual(
            start + attempt * 300_001
          );
          expect(submittedTime).toBeLessThan(start + attempt * 300_001 + 1000);
        }
        expect(received[attempt].get("message")).toBe("Hello");
      }
      expect(action).toHaveBeenCalledTimes(3);
    } finally {
      await act(async () => root.unmount());
      container.remove();
      vi.useRealTimers();
      if (originalBrave) {
        Object.defineProperty(navigator, "brave", originalBrave);
      } else {
        Reflect.deleteProperty(navigator, "brave");
      }
    }
  }
);
