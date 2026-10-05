import { useState } from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, expect, test, vi } from "vitest";
import {
  formBotFieldName,
  validateManagedFormBot,
} from "@webstudio-is/sdk/runtime";
import { NativeForm } from "./native-form";
import { WebhookForm } from "./webhook-form";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const renderRoute = async (
  element: React.ReactNode,
  action: (args: { request: Request }) => unknown
) => {
  const router = createMemoryRouter([{ path: "/", element, action }]);
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => root.render(<RouterProvider router={router} />));
  return {
    container,
    cleanup: async () => {
      await act(async () => root.unmount());
      container.remove();
    },
  };
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const mockManagedHttpAction = (action: () => Promise<unknown>) => {
  vi.stubGlobal("fetch", async () => Response.json(await action()));
};

const mockLegacyHttpAction = (
  action: (args: { request: Request }) => Promise<{ success: boolean }>
) => {
  vi.stubGlobal(
    "fetch",
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const result = await action({ request: new Request(input, init) });
      return Response.json({
        success: result.success,
        status: result.success ? 200 : 502,
        results: [],
        errors: result.success
          ? []
          : [{ status: 502, body: null, message: "Rejected" }],
      });
    }
  );
};

test("managed Form reveals partial failure and leaves visible success feedback in place", async () => {
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
  mockManagedHttpAction(action);
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
  const scroll = vi
    .spyOn(HTMLElement.prototype, "scrollIntoView")
    .mockImplementation(() => {});
  let feedbackTop = window.innerHeight + 30;
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
    function (this: HTMLElement) {
      const top = this.hasAttribute("data-feedback") ? feedbackTop : 0;
      return { top, bottom: top + 30 } as DOMRect;
    }
  );
  const view = await renderRoute(<Form />, action);
  try {
    await act(async () => view.container.querySelector("button")?.click());
    await vi.waitFor(() => expect(scroll).toHaveBeenCalledTimes(1));
    expect(
      (scroll.mock.instances[0] as unknown as Element).getAttribute(
        "data-feedback"
      )
    ).toBe("error");
    feedbackTop = 40;
    await act(async () => view.container.querySelector("button")?.click());
    await vi.waitFor(() =>
      expect(
        view.container.querySelector('[data-feedback="success"]')
      ).not.toBeNull()
    );
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(scroll).toHaveBeenCalledTimes(1);
  } finally {
    await view.cleanup();
  }
});

test("saved Webhook Form reveals feedback on repeated errors", async () => {
  const action = vi.fn().mockResolvedValue({ success: false });
  mockLegacyHttpAction(action);
  const Form = () => {
    const [state, setState] = useState<"initial" | "success" | "error">(
      "initial"
    );
    return (
      <WebhookForm
        action="legacy-webhook"
        state={state}
        onStateChange={setState}
      >
        <button type="submit">Send</button>
        {state === "error" && <div data-feedback="error">Try again</div>}
      </WebhookForm>
    );
  };
  const scroll = vi
    .spyOn(HTMLElement.prototype, "scrollIntoView")
    .mockImplementation(() => {});
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
    function (this: HTMLElement) {
      const top = this.hasAttribute("data-feedback")
        ? window.innerHeight + 30
        : 0;
      return { top, bottom: top + 30 } as DOMRect;
    }
  );
  const view = await renderRoute(<Form />, action);
  try {
    for (let attempt = 1; attempt <= 2; attempt++) {
      await act(async () => view.container.querySelector("button")?.click());
      await vi.waitFor(() => expect(scroll).toHaveBeenCalledTimes(attempt));
    }
    expect(action).toHaveBeenCalledTimes(2);
  } finally {
    await view.cleanup();
  }
});

test("managed Form reveals a reused built-in error on repeated failures", async () => {
  const action = vi.fn().mockImplementation(async () => ({
    success: false,
    status: 502,
    results: [{ resourceId: "first", status: 502, body: "failed" }],
    errors: [
      { resourceId: "first", status: 502, body: "failed", message: "failed" },
    ],
  }));
  mockManagedHttpAction(action);
  const Form = () => {
    const [state, setState] = useState<"initial" | "success" | "error">(
      "initial"
    );
    return (
      <NativeForm
        data-ws-managed-form-id="saved-managed-form"
        submission={{ destinations: ["first"] }}
        state={state}
        onStateChange={setState}
      >
        <button type="submit">Send</button>
      </NativeForm>
    );
  };
  const scroll = vi
    .spyOn(HTMLElement.prototype, "scrollIntoView")
    .mockImplementation(() => {});
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
    function (this: HTMLElement) {
      const top =
        this.getAttribute("role") === "alert" ? window.innerHeight + 30 : 0;
      return { top, bottom: top + 30 } as DOMRect;
    }
  );
  const view = await renderRoute(<Form />, action);
  try {
    await act(async () => view.container.querySelector("button")?.click());
    await vi.waitFor(() => expect(scroll).toHaveBeenCalledTimes(1));
    const alert = view.container.querySelector('[role="alert"]');
    expect(alert).not.toBeNull();
    await act(async () => view.container.querySelector("button")?.click());
    await vi.waitFor(() => expect(scroll).toHaveBeenCalledTimes(2));
    expect(view.container.querySelector('[role="alert"]')).toBe(alert);
    expect(action).toHaveBeenCalledTimes(2);
  } finally {
    await view.cleanup();
  }
});

test("managed Form reveals a persistent configuration error", async () => {
  const action = vi.fn();
  const view = await renderRoute(
    <NativeForm submission={{ destinations: [] }}>
      <button type="submit">Send</button>
    </NativeForm>,
    action
  );
  const scroll = vi
    .spyOn(HTMLElement.prototype, "scrollIntoView")
    .mockImplementation(() => {});
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
    function (this: HTMLElement) {
      const top =
        this.getAttribute("role") === "alert" ? window.innerHeight + 30 : 0;
      return { top, bottom: top + 30 } as DOMRect;
    }
  );
  try {
    expect(view.container.querySelector('[role="alert"]')).toBeNull();
    let alert: Element | null = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      await act(async () => view.container.querySelector("button")?.click());
      await vi.waitFor(() => expect(scroll).toHaveBeenCalledTimes(attempt));
      const currentAlert = view.container.querySelector('[role="alert"]');
      expect(currentAlert?.textContent).toContain(
        "Select at least one Resource destination"
      );
      if (alert !== null) {
        expect(currentAlert).toBe(alert);
      }
      alert = currentAlert;
    }
    expect(action).not.toHaveBeenCalled();
  } finally {
    await view.cleanup();
  }
});

test("managed Form follows a valid success redirect without scrolling feedback", async () => {
  const action = vi
    .fn()
    .mockResolvedValue({ success: true, status: 200, results: [], errors: [] });
  mockManagedHttpAction(action);
  const Form = () => {
    const [state, setState] = useState<"initial" | "success" | "error">(
      "initial"
    );
    return (
      <NativeForm
        data-ws-managed-form-id="saved-managed-form"
        submission={{ destinations: ["first"] }}
        state={state}
        onStateChange={setState}
        successRedirect="#after-form"
      >
        <button type="submit">Send</button>
        {state === "success" && <div data-feedback="success">Done</div>}
      </NativeForm>
    );
  };
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
  const view = await renderRoute(<Form />, action);
  try {
    await act(async () => view.container.querySelector("button")?.click());
    await vi.waitFor(() => expect(window.location.hash).toBe("#after-form"));
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(scroll).not.toHaveBeenCalled();
  } finally {
    await view.cleanup();
    window.history.replaceState(null, "", previousUrl);
  }
});

test.each(["browser", "brave"] as const)(
  "saved Router Webhook Form sends one current bot field across aged %s retries",
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
    mockLegacyHttpAction(action);
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
    const view = await renderRoute(<Form />, action);
    try {
      for (let attempt = 0; attempt < 3; attempt++) {
        if (attempt > 0) {
          vi.setSystemTime(start + attempt * 300_001);
        }
        await act(async () => view.container.querySelector("button")?.click());
        await vi.waitFor(() =>
          expect(destination).toHaveBeenCalledTimes(attempt + 1)
        );
        await vi.waitFor(() =>
          expect(
            view.container.querySelector("form")?.getAttribute("data-state")
          ).toBe("error")
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
      await view.cleanup();
      vi.useRealTimers();
      if (originalBrave) {
        Object.defineProperty(navigator, "brave", originalBrave);
      } else {
        Reflect.deleteProperty(navigator, "brave");
      }
    }
  }
);
