import { useState } from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import {
  createMemoryRouter,
  RouterProvider,
  useLoaderData,
} from "react-router-dom";
import { afterEach, expect, test, vi } from "vitest";
import {
  formBotFieldName,
  formIdFieldName,
  validateManagedFormBot,
} from "@webstudio-is/sdk/runtime";
import { WebhookForm } from "./webhook-form";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

test.each(["saved-string-action", "saved-resource-action"])(
  "saved legacy %s keeps payload, lifecycle, retries, and loader refresh",
  async (actionId) => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const start = 1_700_000_000_000;
    vi.setSystemTime(start);
    const stateChanges: string[] = [];
    const submissions: FormData[] = [];
    let pageValue = "before";
    let resolveFirst:
      | ((value: { success: false; errors: string[] }) => void)
      | undefined;
    const loader = vi.fn(async () => ({ value: pageValue }));
    const action = vi.fn(async ({ request }: { request: Request }) => {
      const data = await request.formData();
      submissions.push(data);
      validateManagedFormBot(data);
      if (submissions.length === 1) {
        return new Promise<{ success: false; errors: string[] }>((resolve) => {
          resolveFirst = resolve;
        });
      }
      pageValue = "after";
      return { success: true };
    });
    const Page = () => {
      const { value } = useLoaderData() as { value: string };
      const [state, setState] = useState<"initial" | "success" | "error">(
        "initial"
      );
      return (
        <>
          <output>{value}</output>
          <WebhookForm
            action={actionId}
            state={state}
            onStateChange={(nextState) => {
              stateChanges.push(nextState);
              setState(nextState);
            }}
            encType="multipart/form-data"
          >
            <input name="message" defaultValue="Hello" />
            <input type="file" name="upload" />
            <button type="submit">Send</button>
            {state === "error" && <div>Try again</div>}
            {state === "success" && <div>Saved</div>}
          </WebhookForm>
        </>
      );
    };
    const router = createMemoryRouter([
      { path: "/", loader, action, element: <Page /> },
    ]);
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    try {
      await act(async () => root.render(<RouterProvider router={router} />));
      await vi.waitFor(() => expect(loader).toHaveBeenCalledTimes(1));
      const fileInput =
        container.querySelector<HTMLInputElement>('input[type="file"]');
      const files = new DataTransfer();
      files.items.add(
        new File(["original bytes"], "upload.txt", { type: "text/plain" })
      );
      if (fileInput) {
        fileInput.files = files.files;
      }

      await act(async () => container.querySelector("button")?.click());
      await vi.waitFor(() => expect(submissions).toHaveLength(1));
      expect(container.querySelector("form")?.getAttribute("aria-busy")).toBe(
        "true"
      );
      expect(submissions[0].get(formIdFieldName)).toBe(actionId);
      expect(submissions[0].get("message")).toBe("Hello");
      const upload = submissions[0].get("upload");
      expect(upload).toBeInstanceOf(File);
      expect((upload as File).name).toBe("upload.txt");
      expect(await (upload as File).text()).toBe("original bytes");
      expect(submissions[0].getAll(formBotFieldName)).toHaveLength(1);
      await act(async () =>
        resolveFirst?.({ success: false, errors: ["Rejected"] })
      );
      await vi.waitFor(() =>
        expect(
          container.querySelector("form")?.getAttribute("data-state")
        ).toBe("error")
      );
      expect(container.querySelector("form")?.hasAttribute("aria-busy")).toBe(
        false
      );
      expect(container.querySelector("output")?.textContent).toBe("before");

      vi.setSystemTime(start + 300_001);
      await act(async () => container.querySelector("button")?.click());
      await vi.waitFor(() =>
        expect(
          container.querySelector("form")?.getAttribute("data-state")
        ).toBe("success")
      );
      await vi.waitFor(() =>
        expect(container.querySelector("output")?.textContent).toBe("after")
      );
      expect(submissions).toHaveLength(2);
      expect(submissions[1].getAll(formBotFieldName)).toHaveLength(1);
      expect(submissions[1].get(formIdFieldName)).toBe(actionId);
      expect(loader).toHaveBeenCalledTimes(3);
      expect(stateChanges).toEqual(["initial", "error", "initial", "success"]);
      expect(action).toHaveBeenCalledTimes(2);
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  }
);

test("legacy redirect happens only after success", async () => {
  const previousUrl = window.location.href;
  const action = vi
    .fn()
    .mockResolvedValueOnce({ success: false })
    .mockResolvedValueOnce({ success: true });
  const router = createMemoryRouter([
    {
      path: "/",
      action,
      element: (
        <WebhookForm action="saved-action" successRedirect="#done">
          <button type="submit">Send</button>
        </WebhookForm>
      ),
    },
  ]);
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () => root.render(<RouterProvider router={router} />));
    await act(async () => container.querySelector("button")?.click());
    await vi.waitFor(() =>
      expect(container.querySelector("form")?.getAttribute("data-state")).toBe(
        "error"
      )
    );
    expect(window.location.hash).not.toBe("#done");
    await act(async () => container.querySelector("button")?.click());
    await vi.waitFor(() => expect(window.location.hash).toBe("#done"));
    expect(action).toHaveBeenCalledTimes(2);
  } finally {
    await act(async () => root.unmount());
    container.remove();
    window.history.replaceState(null, "", previousUrl);
  }
});
