import { renderToStaticMarkup } from "react-dom/server";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { expect, test, vi } from "vitest";
import { NativeForm } from "./native-form";
import {
  managedFormRequestParamName,
  managedFormIdFieldName,
} from "@webstudio-is/sdk/runtime";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

test("an unconfigured Form blocks native navigation", async () => {
  const action = new URL("/__native_form_submission__", window.location.origin);
  const html = renderToStaticMarkup(
    <NativeForm action={action.href} method="get">
      <input name="email" type="email" required />
      <button type="submit">Send</button>
    </NativeForm>
  );
  const iframe = document.createElement("iframe");
  document.body.append(iframe);

  try {
    await new Promise<void>((resolve) => {
      iframe.addEventListener("load", () => resolve(), { once: true });
      iframe.srcdoc = html;
    });
    const frame = iframe.contentWindow;
    const form = iframe.contentDocument?.querySelector("form");
    const input = iframe.contentDocument?.querySelector("input");
    const button = iframe.contentDocument?.querySelector("button");
    if (!frame || !form || !input || !button) {
      throw new Error("Native form did not render in the browser");
    }

    input.value = "person@example.com";
    button.click();
    expect(frame.location.href).toBe("about:srcdoc");
    expect(iframe.contentDocument?.querySelector('[role="alert"]')).toBeNull();
  } finally {
    iframe.remove();
  }
});

test("resource-only Form blocks native navigation and reports an empty selection", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const onResultChange = vi.fn();
  try {
    await act(async () => {
      root.render(
        <NativeForm
          action="/__must_not_navigate__"
          submission={{ destinations: [] }}
          onResultChange={onResultChange}
        >
          <button type="submit">Send</button>
        </NativeForm>
      );
    });
    expect(container.querySelector('[role="alert"]')).toBeNull();
    await act(async () => {
      container.querySelector("button")?.click();
    });
    expect(container.querySelector('[role="alert"]')?.textContent).toMatch(
      /Select at least one Resource/
    );
    expect(onResultChange).toHaveBeenCalledExactlyOnceWith({
      success: false,
      status: 400,
      results: [],
      errors: [
        {
          status: 400,
          body: null,
          message: "Select at least one Resource destination",
        },
      ],
    });
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});

test("malformed submission settings do not fall back to native delivery", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () => {
      root.render(
        <NativeForm
          action="/__must_not_navigate__"
          submission={{ destinations: "invalid" }}
        >
          <button type="submit">Send</button>
        </NativeForm>
      );
    });
    expect(container.querySelector('[role="alert"]')?.textContent).toBe(
      "Invalid Form submission settings"
    );
    await act(async () => container.querySelector("button")?.click());
    expect(window.location.pathname).not.toBe("/__must_not_navigate__");
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});

test("legacy native-mode settings do not activate saved Resource destinations", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const onManagedSubmit = vi.fn();
  try {
    await act(async () => {
      root.render(
        <NativeForm
          action="/__must_not_navigate__"
          submission={{ mode: "native", destinations: ["legacy-resource"] }}
          onManagedSubmit={onManagedSubmit}
        >
          <button type="submit">Send</button>
        </NativeForm>
      );
    });
    expect(container.querySelector('[role="alert"]')?.textContent).toBe(
      "Invalid Form submission settings"
    );
    await act(async () => container.querySelector("button")?.click());
    expect(onManagedSubmit).not.toHaveBeenCalled();
    expect(window.location.pathname).not.toBe("/__must_not_navigate__");
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});

test("an empty managed Form cannot natively submit without hydration", async () => {
  const html = renderToStaticMarkup(
    <NativeForm
      action="/__must_not_navigate__"
      method="post"
      submission={{ destinations: [] }}
    >
      <input name="email" defaultValue="person@example.com" />
      <button type="submit">Send</button>
    </NativeForm>
  );
  const iframe = document.createElement("iframe");
  document.body.append(iframe);
  try {
    await new Promise<void>((resolve) => {
      iframe.addEventListener("load", () => resolve(), { once: true });
      iframe.srcdoc = html;
    });
    iframe.contentDocument?.querySelector("button")?.click();
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(iframe.contentWindow?.location.href).toBe("about:srcdoc");
  } finally {
    iframe.remove();
  }
});

test("managed mode blocks submitter overrides before hydration", async () => {
  const html = renderToStaticMarkup(
    <>
      <NativeForm
        id="managed-form"
        action="/__must_not_navigate__/form"
        method="post"
      >
        <input name="email" defaultValue="person@example.com" />
      </NativeForm>
      <button
        type="submit"
        form="managed-form"
        formAction="https://example.com/__must_not_navigate__/outside"
        formMethod="get"
      >
        Send
      </button>
    </>
  );
  const iframe = document.createElement("iframe");
  document.body.append(iframe);
  try {
    await new Promise<void>((resolve) => {
      iframe.addEventListener("load", () => resolve(), { once: true });
      iframe.srcdoc = html;
    });
    expect(iframe.contentDocument?.querySelector("form")?.id).toBe("");
    iframe.contentDocument?.querySelector("button")?.click();
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(iframe.contentWindow?.location.href).toBe("about:srcdoc");
  } finally {
    iframe.remove();
  }
});

test("a hydrated Form handles submit buttons associated by form id", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const onManagedSubmit = vi.fn();
  try {
    await act(async () => {
      root.render(
        <>
          <NativeForm
            id="managed-form"
            submission={{ destinations: ["resource-one"] }}
            onManagedSubmit={onManagedSubmit}
          >
            <input name="email" defaultValue="person@example.com" />
          </NativeForm>
          <button type="submit" form="managed-form">
            Send
          </button>
        </>
      );
    });
    await act(async () => container.querySelector("button")?.click());
    expect(onManagedSubmit).toHaveBeenCalledExactlyOnceWith(
      {
        email: "person@example.com",
      },
      expect.any(AbortSignal)
    );
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});

test("Form passes one structured submission to its dispatcher", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const onManagedSubmit = vi.fn();
  try {
    await act(async () => {
      root.render(
        <NativeForm
          action="/__must_not_navigate__"
          submission={{ destinations: ["resource-one"] }}
          onManagedSubmit={onManagedSubmit}
        >
          <input name="name" defaultValue="Ada" />
          <button type="submit">Send</button>
        </NativeForm>
      );
    });
    await act(async () => {
      container.querySelector("button")?.click();
    });
    expect(onManagedSubmit).toHaveBeenCalledExactlyOnceWith(
      { name: "Ada" },
      expect.any(AbortSignal)
    );
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});

test("file-input settings enforce required uploads and keep optional or multiple files", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const onManagedSubmit = vi.fn();
  const render = async (required: boolean) =>
    act(async () =>
      root.render(
        <NativeForm
          submission={{ destinations: ["resource-one"] }}
          onManagedSubmit={onManagedSubmit}
        >
          <input
            type="file"
            name="attachments"
            accept="image/*,.pdf"
            multiple
            required={required}
          />
          <button type="submit">Send</button>
        </NativeForm>
      )
    );
  try {
    await render(true);
    const input = container.querySelector<HTMLInputElement>("input")!;
    expect(input.accept).toBe("image/*,.pdf");
    expect(input.multiple).toBe(true);
    await act(async () => container.querySelector("button")?.click());
    expect(onManagedSubmit).not.toHaveBeenCalled();

    const files = new DataTransfer();
    const first = new File(["one"], "one.png", { type: "image/png" });
    const second = new File(["two"], "two.pdf", { type: "application/pdf" });
    files.items.add(first);
    files.items.add(second);
    input.files = files.files;
    await act(async () => container.querySelector("button")?.click());
    expect(onManagedSubmit).toHaveBeenLastCalledWith(
      {
        attachments: [first, second],
      },
      expect.any(AbortSignal)
    );

    await render(false);
    container.querySelector<HTMLInputElement>("input")!.value = "";
    await act(async () => container.querySelector("button")?.click());
    expect(onManagedSubmit).toHaveBeenCalledTimes(2);
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});

test("managed Form submits by HTTP outside a router provider and reports pending and results", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const states: string[] = [];
  const results: unknown[] = [];
  let finish!: (response: Response) => void;
  const request = vi.fn(
    (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Promise<Response>((resolve) => {
        finish = resolve;
      })
  );
  vi.stubGlobal("fetch", request);
  try {
    await act(async () =>
      root.render(
        <NativeForm
          data-ws-managed-form-id="form-one"
          submission={{ destinations: ["destination"] }}
          onStateChange={(state) => states.push(state)}
          onResultChange={(result) => results.push(result)}
        >
          <input name="tag" defaultValue="a" />
          <input name="tag" defaultValue="b" />
          <input name="upload" type="file" />
          <button type="submit">Send</button>
        </NativeForm>
      )
    );
    const files = new DataTransfer();
    files.items.add(new File(["contents"], "note.txt", { type: "text/plain" }));
    container.querySelector<HTMLInputElement>('input[type="file"]')!.files =
      files.files;
    await act(async () => container.querySelector("button")?.click());
    expect(request).toHaveBeenCalledOnce();
    expect(container.querySelector("form")?.getAttribute("aria-busy")).toBe(
      "true"
    );
    const [url, init] = request.mock.calls[0];
    const endpoint = new URL(String(url));
    expect(endpoint.searchParams.get(managedFormRequestParamName)).toBe("1");
    expect(endpoint.pathname).toBe(
      window.location.pathname === "/"
        ? "/__ws-form"
        : `/__ws-form${window.location.pathname}`
    );
    expect(init?.method).toBe("POST");
    expect(init?.credentials).toBe("same-origin");
    const body = init?.body as FormData;
    expect(body.get(managedFormIdFieldName)).toBe("form-one");
    expect(body.getAll("tag")).toEqual(["a", "b"]);
    expect(await (body.get("upload") as File).text()).toBe("contents");
    await act(async () =>
      finish(
        Response.json({
          success: true,
          status: 200,
          results: [
            { resourceId: "destination", status: 201, body: { id: 1 } },
          ],
          errors: [],
        })
      )
    );
    await vi.waitFor(() => expect(states).toEqual(["initial", "success"]));
    expect(container.querySelector("form")?.hasAttribute("aria-busy")).toBe(
      false
    );
    expect(results).toEqual([
      {
        success: true,
        status: 200,
        results: [{ resourceId: "destination", status: 201, body: { id: 1 } }],
        errors: [],
      },
    ]);
  } finally {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  }
});

test("Preview runs the supplied submission and reports its result without the published endpoint", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const fetch = vi.fn();
  const onManagedSubmit = vi.fn(async () => ({
    success: true,
    status: 200,
    results: [{ resourceId: "email", status: 200, body: { sent: true } }],
    errors: [],
  }));
  const onResultChange = vi.fn();
  vi.stubGlobal("fetch", fetch);
  try {
    await act(async () =>
      root.render(
        <NativeForm
          submission={{ destinations: ["email"] }}
          previewSubmission
          onManagedSubmit={onManagedSubmit}
          onResultChange={onResultChange}
        >
          <input name="email" defaultValue="ada@example.com" />
          <button type="submit">Send</button>
        </NativeForm>
      )
    );
    expect(container.querySelector('[role="note"]')?.textContent).toContain(
      "real emails"
    );
    await act(async () => container.querySelector("button")?.click());
    await vi.waitFor(() => expect(onResultChange).toHaveBeenCalledOnce());
    expect(onManagedSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ email: "ada@example.com" }),
      expect.any(AbortSignal)
    );
    expect(onResultChange).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    );
    expect(fetch).not.toHaveBeenCalled();
  } finally {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  }
});

test("managed Form reports HTTP and network failures without native navigation", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const results: unknown[] = [];
  const request = vi
    .fn()
    .mockRejectedValueOnce(new TypeError("offline"))
    .mockResolvedValueOnce(
      Response.json(
        {
          success: false,
          status: 502,
          results: [
            { resourceId: "destination", status: 422, body: "Rejected" },
          ],
          errors: [
            {
              resourceId: "destination",
              status: 422,
              body: "Rejected",
              message: "Rejected",
            },
          ],
        },
        { status: 502 }
      )
    );
  vi.stubGlobal("fetch", request);
  const originalUrl = window.location.href;
  try {
    await act(async () =>
      root.render(
        <NativeForm
          action="/__must_not_navigate__"
          data-ws-managed-form-id="form-one"
          submission={{ destinations: ["destination"] }}
          onResultChange={(result) => results.push(result)}
        >
          <button type="submit">Send</button>
        </NativeForm>
      )
    );
    await act(async () => container.querySelector("button")?.click());
    await vi.waitFor(() => expect(results).toHaveLength(1));
    expect(results[0]).toEqual({
      success: false,
      status: 502,
      results: [],
      errors: [{ status: 502, body: null, message: "Form submission failed" }],
    });
    await act(async () => container.querySelector("button")?.click());
    await vi.waitFor(() => expect(results).toHaveLength(2));
    expect(results[1]).toEqual({
      success: false,
      status: 502,
      results: [{ resourceId: "destination", status: 422, body: "Rejected" }],
      errors: [
        {
          resourceId: "destination",
          status: 422,
          body: "Rejected",
          message: "Rejected",
        },
      ],
    });
    expect(request).toHaveBeenCalledTimes(2);
    expect(window.location.href).toBe(originalUrl);
  } finally {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  }
});
