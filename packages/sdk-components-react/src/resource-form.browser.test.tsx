import { renderToStaticMarkup } from "react-dom/server";
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { expect, test, vi } from "vitest";
import { ResourceForm } from "./resource-form";
import { Input } from "./input";
import { Textarea } from "./textarea";
import { Select } from "./select";
import type { ManagedFormResponse } from "@webstudio-is/sdk/runtime";
import type { UploadProgress } from "@webstudio-is/sdk/form/browser";
import {
  managedFormRequestParamName,
  managedFormIdFieldName,
} from "@webstudio-is/sdk/runtime";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

class FakeFormRequest {
  static requests: FakeFormRequest[] = [];
  upload: { onload?: (event: ProgressEvent) => void } = {};
  onload?: () => void;
  onerror?: () => void;
  onabort?: () => void;
  status = 200;
  responseText = "";
  url = "";
  body?: FormData;
  withCredentials = false;

  constructor() {
    FakeFormRequest.requests.push(this);
  }

  open(_method: string, url: string) {
    this.url = url;
  }

  setRequestHeader() {}

  getResponseHeader() {
    return "application/json";
  }

  send(body: FormData) {
    this.body = body;
  }

  respond(body: unknown, status = 200) {
    this.status = status;
    this.responseText = JSON.stringify(body);
    this.upload.onload?.({
      loaded: 12,
      total: 12,
      lengthComputable: true,
    } as ProgressEvent);
    this.onload?.();
  }
}

test("a StrictMode Form submits after the effect cleanup probe", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const onManagedSubmit = vi.fn().mockResolvedValue({
    success: true,
    status: 200,
    results: [],
    errors: [],
  });
  const onResultChange = vi.fn();
  try {
    await act(async () => {
      root.render(
        <StrictMode>
          <ResourceForm
            action={[{ dataSourceId: "resource-one" }]}
            onManagedSubmit={onManagedSubmit}
            onResultChange={onResultChange}
          >
            <input name="email" defaultValue="person@example.com" />
            <button type="submit">Send</button>
          </ResourceForm>
        </StrictMode>
      );
    });
    await act(async () => container.querySelector("button")?.click());
    expect(onManagedSubmit).toHaveBeenCalledOnce();
    expect(onResultChange).toHaveBeenCalledOnce();
    expect(container.querySelector("form")?.dataset.state).toBe("success");
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});

test.each([true, false])(
  "a visible Form resets edited fields only after success: %s",
  async (success) => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    const onManagedSubmit = vi.fn(async () => ({
      success,
      status: success ? 200 : 422,
      results: [],
      errors: success ? [] : [{ status: 422, body: null, message: "Failed" }],
    }));
    try {
      await act(async () => {
        root.render(
          <ResourceForm
            action={[{ dataSourceId: "resource-one" }]}
            onManagedSubmit={onManagedSubmit}
          >
            <Input name="name" defaultValue="Preset name" />
            <Input name="reset" defaultValue="Preset reset" />
            <Textarea name="message" defaultValue="Preset message" />
            <Select name="category" defaultValue="sales">
              <option value="sales">Sales</option>
              <option value="support">Support</option>
            </Select>
            <Input name="subscribe" type="checkbox" defaultChecked />
            <Input name="contact" type="radio" value="email" defaultChecked />
            <Input name="attachment" type="file" />
            <button type="submit">Send</button>
          </ResourceForm>
        );
      });
      const name = container.querySelector<HTMLInputElement>("[name=name]")!;
      const reset = container.querySelector<HTMLInputElement>("[name=reset]")!;
      const message =
        container.querySelector<HTMLTextAreaElement>("[name=message]")!;
      const category =
        container.querySelector<HTMLSelectElement>("[name=category]")!;
      const subscribe =
        container.querySelector<HTMLInputElement>("[name=subscribe]")!;
      const contact =
        container.querySelector<HTMLInputElement>("[name=contact]")!;
      const attachment =
        container.querySelector<HTMLInputElement>("[name=attachment]")!;
      name.value = "Entered name";
      reset.value = "Entered reset";
      message.value = "Entered message";
      category.value = "support";
      subscribe.checked = false;
      contact.checked = false;
      const files = new DataTransfer();
      files.items.add(new File(["image"], "image.png", { type: "image/png" }));
      attachment.files = files.files;
      await act(async () => container.querySelector("button")?.click());
      await vi.waitFor(() => expect(onManagedSubmit).toHaveBeenCalledOnce());
      await vi.waitFor(() =>
        expect(container.querySelector("form")?.dataset.state).toBe(
          success ? "success" : "error"
        )
      );
      expect(name.value).toBe(success ? "Preset name" : "Entered name");
      expect(reset.value).toBe(success ? "Preset reset" : "Entered reset");
      expect(message.value).toBe(
        success ? "Preset message" : "Entered message"
      );
      expect(category.value).toBe(success ? "sales" : "support");
      expect(subscribe.checked).toBe(success);
      expect(contact.checked).toBe(success);
      expect(attachment.files).toHaveLength(success ? 0 : 1);
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  }
);

test("a StrictMode Form aborts an active request on real unmount", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  let signal: AbortSignal | undefined;
  try {
    await act(async () => {
      root.render(
        <StrictMode>
          <ResourceForm
            action={[{ dataSourceId: "resource-one" }]}
            onManagedSubmit={(_values, requestSignal) => {
              signal = requestSignal;
              return new Promise(() => {});
            }}
          >
            <button type="submit">Send</button>
          </ResourceForm>
        </StrictMode>
      );
    });
    await act(async () => container.querySelector("button")?.click());
    expect(signal?.aborted).toBe(false);
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
  expect(signal?.aborted).toBe(true);
});

test("an unconfigured Form blocks native navigation", async () => {
  const html = renderToStaticMarkup(
    <ResourceForm method="get">
      <input name="email" type="email" required />
      <button type="submit">Send</button>
    </ResourceForm>
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

test("empty Resource list uses query navigation instead of Resource submission", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const onResultChange = vi.fn();
  const onQueryNavigate = vi.fn();
  try {
    await act(async () => {
      root.render(
        <ResourceForm
          action={[]}
          onQueryNavigate={onQueryNavigate}
          onResultChange={onResultChange}
        >
          <input name="query" defaultValue="chairs" />
          <input name="tag" defaultValue="wood" />
          <input name="tag" defaultValue="blue" />
          <button type="submit">Send</button>
        </ResourceForm>
      );
    });
    expect(container.querySelector("form")?.getAttribute("action")).toBe(
      "?__webstudio__=navigate"
    );
    expect(container.querySelector('[role="alert"]')).toBeNull();
    await act(async () => {
      container.querySelector("button")?.click();
    });
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(onResultChange).not.toHaveBeenCalled();
    expect(onQueryNavigate).toHaveBeenCalledExactlyOnceWith(
      `${window.location.pathname}?query=chairs&tag=wood&tag=blue`
    );
    expect(
      container.querySelector<HTMLInputElement>("[name=query]")?.value
    ).toBe("chairs");
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
        <ResourceForm action={{ destinations: "invalid" }}>
          <button type="submit">Send</button>
        </ResourceForm>
      );
    });
    expect(container.querySelector('[role="alert"]')).toBeNull();
    await act(async () => container.querySelector("button")?.click());
    expect(window.location.pathname).not.toBe("/__must_not_navigate__");
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});

test("a throwing submit callback cannot trigger native delivery", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const onManagedSubmit = vi.fn();
  try {
    await act(async () => {
      root.render(
        <ResourceForm
          action={[{ dataSourceId: "resource-one" }]}
          onSubmit={() => {
            throw new Error("Submit callback failed");
          }}
          onManagedSubmit={onManagedSubmit}
        >
          <button
            type="submit"
            formAction="/__must_not_navigate__"
            formMethod="get"
          >
            Send
          </button>
        </ResourceForm>
      );
    });
    const form = container.querySelector("form");
    if (form === null) {
      throw new Error("Expected Form element");
    }
    let submit: SubmitEvent | undefined;
    form.addEventListener("submit", (event) => {
      submit = event;
    });
    await act(async () => {
      container.querySelector("button")?.click();
    });
    expect(submit?.defaultPrevented).toBe(true);
    expect(onManagedSubmit).not.toHaveBeenCalled();
    expect(container.querySelector('[role="alert"]')).toBeNull();
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});

test("legacy native-mode settings do not activate saved Resource actions", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const onManagedSubmit = vi.fn();
  try {
    await act(async () => {
      root.render(
        <ResourceForm
          action={{ mode: "native", destinations: ["legacy-resource"] }}
          onManagedSubmit={onManagedSubmit}
        >
          <button type="submit">Send</button>
        </ResourceForm>
      );
    });
    expect(container.querySelector('[role="alert"]')).toBeNull();
    await act(async () => container.querySelector("button")?.click());
    expect(onManagedSubmit).not.toHaveBeenCalled();
    expect(window.location.pathname).not.toBe("/__must_not_navigate__");
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});

test("a Resource Form cannot natively submit without hydration", async () => {
  const html = renderToStaticMarkup(
    <ResourceForm method="post" action={[{ dataSourceId: "resource" }]}>
      <input name="email" defaultValue="person@example.com" />
      <button type="submit">Send</button>
    </ResourceForm>
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
      <ResourceForm
        id="managed-form"
        action="/__must_not_navigate__/form"
        method="post"
      >
        <input name="email" defaultValue="person@example.com" />
      </ResourceForm>
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
          <ResourceForm
            id="managed-form"
            action={[{ dataSourceId: "resource-one" }]}
            onManagedSubmit={onManagedSubmit}
          >
            <input name="email" defaultValue="person@example.com" />
          </ResourceForm>
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
      expect.any(AbortSignal),
      expect.any(Function)
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
        <ResourceForm
          action={[{ dataSourceId: "resource-one" }]}
          onManagedSubmit={onManagedSubmit}
        >
          <input name="name" defaultValue="Ada" />
          <button type="submit">Send</button>
        </ResourceForm>
      );
    });
    await act(async () => {
      container.querySelector("button")?.click();
    });
    expect(onManagedSubmit).toHaveBeenCalledExactlyOnceWith(
      { name: "Ada" },
      expect.any(AbortSignal),
      expect.any(Function)
    );
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});

test("Form resolves Preview success redirects against the Preview page", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const onSuccessRedirect = vi.fn();
  try {
    await act(async () => {
      root.render(
        <ResourceForm
          action={[{ dataSourceId: "resource-one" }]}
          successRedirect="thanks"
          getRedirectBaseUrl={() => "https://webstudio.local/contact"}
          onManagedSubmit={async () => ({
            success: true,
            status: 200,
            results: [
              {
                resourceId: "resource-one",
                resourceName: "resource-one",
                status: 200,
                body: null,
              },
            ],
            errors: [],
          })}
          onSuccessRedirect={onSuccessRedirect}
        >
          <button type="submit">Send</button>
        </ResourceForm>
      );
    });
    await act(async () => container.querySelector("button")?.click());
    expect(onSuccessRedirect).toHaveBeenCalledExactlyOnceWith(
      "https://webstudio.local/thanks"
    );
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});

test("unmatched Preview redirect keeps successful Form feedback on the current page", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const onSuccessRedirect = vi.fn(() => false);
  const onResultChange = vi.fn();
  const onSubmissionSuccess = vi.fn();
  try {
    await act(async () => {
      root.render(
        <ResourceForm
          action={[{ dataSourceId: "resource-one" }]}
          successRedirect="/missing"
          getRedirectBaseUrl={() => "https://webstudio.local/contact"}
          onManagedSubmit={async () => ({
            success: true,
            status: 200,
            results: [],
            errors: [],
          })}
          onSuccessRedirect={onSuccessRedirect}
          onResultChange={onResultChange}
          onSubmissionSuccess={onSubmissionSuccess}
        >
          <div>Submitted</div>
          <button type="submit">Send</button>
        </ResourceForm>
      );
    });
    await act(async () => container.querySelector("button")?.click());
    expect(onSuccessRedirect).toHaveBeenCalledExactlyOnceWith(
      "https://webstudio.local/missing"
    );
    expect(container.querySelector("form")?.getAttribute("data-state")).toBe(
      "success"
    );
    expect(onResultChange).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    );
    expect(onSubmissionSuccess).toHaveBeenCalledOnce();
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
        <ResourceForm
          action={[{ dataSourceId: "resource-one" }]}
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
        </ResourceForm>
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
      expect.any(AbortSignal),
      expect.any(Function)
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
  FakeFormRequest.requests = [];
  vi.stubGlobal("XMLHttpRequest", FakeFormRequest);
  try {
    await act(async () =>
      root.render(
        <ResourceForm
          data-ws-managed-form-id="form-one"
          action={[{ dataSourceId: "destination" }]}
          onStateChange={(state) => states.push(state)}
          onResultChange={(result) => results.push(result)}
        >
          <input name="tag" defaultValue="a" />
          <input name="tag" defaultValue="b" />
          <input name="upload" type="file" />
          <button type="submit">Send</button>
        </ResourceForm>
      )
    );
    const files = new DataTransfer();
    files.items.add(new File(["contents"], "note.txt", { type: "text/plain" }));
    container.querySelector<HTMLInputElement>('input[type="file"]')!.files =
      files.files;
    await act(async () => container.querySelector("button")?.click());
    expect(FakeFormRequest.requests).toHaveLength(1);
    expect(container.querySelector("form")?.getAttribute("aria-busy")).toBe(
      "true"
    );
    expect(container.querySelector('output[role="status"]')?.textContent).toBe(
      "Submitting…"
    );
    const request = FakeFormRequest.requests[0];
    const endpoint = new URL(request.url);
    expect(endpoint.searchParams.get(managedFormRequestParamName)).toBe("1");
    expect(endpoint.pathname).toBe(
      window.location.pathname === "/"
        ? "/__ws-form"
        : `/__ws-form${window.location.pathname}`
    );
    expect(request.withCredentials).toBe(false);
    const body = request.body!;
    expect(body.get(managedFormIdFieldName)).toBe("form-one");
    expect(body.getAll("tag")).toEqual(["a", "b"]);
    expect(await (body.get("upload") as File).text()).toBe("contents");
    await act(async () =>
      request.respond({
        success: true,
        status: 200,
        results: [
          {
            resourceId: "destination",
            resourceName: "destination",
            status: 201,
            body: { id: 1 },
          },
        ],
        errors: [],
      })
    );
    await vi.waitFor(() => expect(states).toEqual(["initial", "success"]));
    expect(container.querySelector<HTMLInputElement>("[name=tag]")?.value).toBe(
      "a"
    );
    expect(
      container.querySelector<HTMLInputElement>('[name="upload"]')?.files
    ).toHaveLength(0);
    expect(container.querySelector("form")?.hasAttribute("aria-busy")).toBe(
      false
    );
    expect(container.querySelector('output[role="status"]')?.textContent).toBe(
      ""
    );
    expect(results).toEqual([
      {
        success: true,
        status: 200,
        results: [
          {
            resourceId: "destination",
            resourceName: "destination",
            status: 201,
            body: { id: 1 },
          },
        ],
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
    results: [
      {
        resourceId: "email",
        resourceName: "email",
        status: 200,
        body: { sent: true },
      },
    ],
    errors: [],
  }));
  const onResultChange = vi.fn();
  vi.stubGlobal("fetch", fetch);
  try {
    await act(async () =>
      root.render(
        <ResourceForm
          action={[{ dataSourceId: "email" }]}
          onManagedSubmit={onManagedSubmit}
          onResultChange={onResultChange}
        >
          <input name="email" defaultValue="ada@example.com" />
          <button type="submit">Send</button>
        </ResourceForm>
      )
    );
    await act(async () => container.querySelector("button")?.click());
    await vi.waitFor(() => expect(onResultChange).toHaveBeenCalledOnce());
    expect(onManagedSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ email: "ada@example.com" }),
      expect.any(AbortSignal),
      expect.any(Function)
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

test("Form progress keeps measured bytes through Action completion and resets on cancellation", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const progress: Array<
    Parameters<
      NonNullable<React.ComponentProps<typeof ResourceForm>["onProgressChange"]>
    >[0]
  > = [];
  const states: string[] = [];
  let reportUpload!: (update: UploadProgress) => void;
  let finish!: (response: ManagedFormResponse) => void;
  const onManagedSubmit = vi.fn(
    (
      _values: unknown,
      _signal: AbortSignal,
      onUploadProgress?: (update: UploadProgress) => void
    ) => {
      reportUpload = onUploadProgress!;
      return new Promise<ManagedFormResponse>((resolve) => {
        finish = resolve;
      });
    }
  );
  const render = async (navigationToken: string) =>
    act(async () =>
      root.render(
        <ResourceForm
          action={[{ dataSourceId: "resource-one" }]}
          navigationToken={navigationToken}
          onManagedSubmit={onManagedSubmit}
          onStateChange={(value) => states.push(value)}
          onProgressChange={(value) => progress.push(value)}
        >
          <input name="attachment" type="file" multiple />
          <button type="submit">Send</button>
        </ResourceForm>
      )
    );
  try {
    await render("first-page");
    const files = new DataTransfer();
    files.items.add(new File(["content"], "note.txt"));
    files.items.add(new File(["more"], "more.txt"));
    container.querySelector<HTMLInputElement>("input")!.files = files.files;
    await act(async () => container.querySelector("button")?.click());
    expect(container.querySelector('output[role="status"]')).toBeNull();
    expect(states.at(-1)).toBe("initial");
    expect(progress.at(-1)).toMatchObject({
      status: "pending",
      files: [
        {
          fieldName: "attachment",
          name: "note.txt",
          size: 7,
          type: "",
        },
        {
          fieldName: "attachment",
          name: "more.txt",
          size: 4,
          type: "",
        },
      ],
    });
    const [firstFileId, secondFileId] = progress
      .at(-1)!
      .files.map(({ id }) => id);
    expect(firstFileId).not.toBe(secondFileId);
    await act(async () => reportUpload({ loaded: 4, total: 12 }));
    expect(progress.at(-1)).toMatchObject({
      status: "pending",
      loaded: 4,
      total: 12,
      files: [{ id: firstFileId }, { id: secondFileId }],
    });
    await act(async () => reportUpload({ loaded: 12, total: 12 }));
    expect(progress.at(-1)).toMatchObject({
      status: "pending",
      loaded: 12,
      total: 12,
      files: [{ id: firstFileId }, { id: secondFileId }],
    });
    expect(progress.at(-1)?.files[0]).not.toHaveProperty("progress");

    await act(async () =>
      finish({ success: false, status: 422, results: [], errors: [] })
    );
    expect(progress.at(-1)).toMatchObject({
      status: "idle",
      loaded: 12,
      total: 12,
      files: [{ id: firstFileId }, { id: secondFileId }],
    });

    const previousUpload = reportUpload;
    await act(async () => container.querySelector("button")?.click());
    expect(states.at(-1)).toBe("initial");
    expect(progress.at(-1)?.status).toBe("pending");
    await act(async () => previousUpload({ loaded: 200, total: 200 }));
    expect(progress.at(-1)).not.toHaveProperty("loaded");
    const canceledUpload = reportUpload;
    await render("next-page");
    expect(progress.at(-1)).toEqual({ status: "idle", files: [] });
    await act(async () => canceledUpload({ loaded: 12, total: 12 }));
    expect(progress.at(-1)).toEqual({ status: "idle", files: [] });
    container.querySelector<HTMLInputElement>("input")!.value = "";
    await act(async () => container.querySelector("button")?.click());
    expect(progress.at(-1)).toEqual({ status: "pending", files: [] });
    await act(async () =>
      finish({ success: true, status: 200, results: [], errors: [] })
    );
    expect(progress.at(-1)).toEqual({ status: "idle", files: [] });
    expect(states).toEqual([
      "initial",
      "error",
      "initial",
      "initial",
      "success",
    ]);
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});

test("Form progress returns to idle when a stale URL makes the result inapplicable", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const initialUrl = window.location.href;
  const progress: string[] = [];
  const states: string[] = [];
  let finish!: (response: ManagedFormResponse) => void;
  try {
    await act(async () =>
      root.render(
        <ResourceForm
          action={[{ dataSourceId: "resource-one" }]}
          onManagedSubmit={() =>
            new Promise<ManagedFormResponse>((resolve) => {
              finish = resolve;
            })
          }
          onStateChange={(state) => states.push(state)}
          onProgressChange={(value) => progress.push(value.status)}
        >
          <button type="submit">Send</button>
        </ResourceForm>
      )
    );
    await act(async () => container.querySelector("button")?.click());
    expect(progress.at(-1)).toBe("pending");
    window.history.replaceState(null, "", "#details");
    await act(async () =>
      finish({ success: true, status: 200, results: [], errors: [] })
    );
    await vi.waitFor(() => expect(progress.at(-1)).toBe("idle"));
    expect(states).toEqual(["initial"]);
  } finally {
    window.history.replaceState(null, "", initialUrl);
    await act(async () => root.unmount());
    container.remove();
  }
});

test("Preview reports rejected submissions as failures and clears pending state", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const onManagedSubmit = vi
    .fn()
    .mockResolvedValueOnce({
      success: false,
      status: 429,
      results: [],
      errors: [
        { status: 429, body: null, message: "Previous submission failed" },
      ],
    })
    .mockRejectedValueOnce(new Error("Preview submission failed"));
  const onResultChange = vi.fn();
  const states: string[] = [];
  try {
    await act(async () =>
      root.render(
        <ResourceForm
          action={[{ dataSourceId: "email" }]}
          onManagedSubmit={onManagedSubmit}
          onResultChange={onResultChange}
          onStateChange={(state) => states.push(state)}
        >
          <button type="submit">Send</button>
        </ResourceForm>
      )
    );

    await act(async () => container.querySelector("button")?.click());
    await vi.waitFor(() => {
      expect(onResultChange).toHaveBeenCalledOnce();
      expect(container.querySelector("form")?.hasAttribute("aria-busy")).toBe(
        false
      );
    });
    expect(container.querySelectorAll('[role="alert"]')).toHaveLength(0);
    expect(container.querySelector('[role="alert"]')).toBeNull();

    await act(async () => container.querySelector("button")?.click());
    await vi.waitFor(() => {
      expect(onResultChange).toHaveBeenCalledTimes(2);
      expect(container.querySelector("form")?.hasAttribute("aria-busy")).toBe(
        false
      );
    });
    expect(onResultChange).toHaveBeenCalledWith({
      success: false,
      status: 500,
      results: [],
      errors: [
        {
          status: 500,
          body: null,
          message: "Preview submission failed",
        },
      ],
    });
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(container.querySelectorAll('[role="alert"]')).toHaveLength(0);
    expect(states).toEqual(["initial", "error", "initial", "error"]);
    expect(onManagedSubmit).toHaveBeenCalledTimes(2);
    expect(container.querySelector("form")?.hasAttribute("aria-busy")).toBe(
      false
    );
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});

test("managed Form reports HTTP and network failures without native navigation", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const results: unknown[] = [];
  FakeFormRequest.requests = [];
  vi.stubGlobal("XMLHttpRequest", FakeFormRequest);
  const serverFailure = {
    success: false,
    status: 502,
    results: [
      {
        resourceId: "destination",
        resourceName: "destination",
        status: 422,
        body: "Rejected",
      },
    ],
    errors: [
      {
        resourceId: "destination",
        resourceName: "destination",
        status: 422,
        body: "Rejected",
        message: "Rejected",
      },
    ],
  };
  const originalUrl = window.location.href;
  try {
    await act(async () =>
      root.render(
        <ResourceForm
          data-ws-managed-form-id="form-one"
          action={[{ dataSourceId: "destination" }]}
          onResultChange={(result) => results.push(result)}
        >
          <button type="submit">Send</button>
        </ResourceForm>
      )
    );
    await act(async () => container.querySelector("button")?.click());
    await act(async () => FakeFormRequest.requests[0].onerror?.());
    await vi.waitFor(() => expect(results).toHaveLength(1));
    expect(results[0]).toEqual({
      success: false,
      status: 502,
      results: [],
      errors: [{ status: 502, body: null, message: "Form submission failed" }],
    });
    await act(async () => container.querySelector("button")?.click());
    await act(async () =>
      FakeFormRequest.requests[1].respond(serverFailure, 502)
    );
    await vi.waitFor(() => expect(results).toHaveLength(2));
    expect(results[1]).toEqual({
      success: false,
      status: 502,
      results: [
        {
          resourceId: "destination",
          resourceName: "destination",
          status: 422,
          body: "Rejected",
        },
      ],
      errors: [
        {
          resourceId: "destination",
          resourceName: "destination",
          status: 422,
          body: "Rejected",
          message: "Rejected",
        },
      ],
    });
    expect(FakeFormRequest.requests).toHaveLength(2);
    expect(window.location.href).toBe(originalUrl);
  } finally {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  }
});

test.each([
  [
    [
      {
        resourceId: "a",
        resourceName: "A",
        status: 422,
        body: null,
        message: "First actual failure",
      },
    ],
  ],
  [
    [
      {
        resourceId: "a",
        resourceName: "A",
        status: 422,
        body: null,
        message: "First actual failure",
      },
      {
        resourceId: "b",
        resourceName: "B",
        status: 500,
        body: null,
        message: "Second actual failure",
      },
    ],
  ],
])(
  "authored error message renders actual errors without duplicate raw alerts: %j",
  async (actionErrors) => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    const events: string[] = [];
    const Harness = () => {
      const [state, setState] = useState("initial");
      const [errors, setErrors] = useState<Array<{ message: string }>>([]);
      return (
        <ResourceForm
          action={[{ dataSourceId: "request" }]}
          onManagedSubmit={async () => ({
            success: false,
            status: 422,
            results: [],
            errors: actionErrors,
          })}
          onResultChange={(result) => {
            events.push("result");
            setErrors(result.errors);
          }}
          onStateChange={(state) => {
            events.push(state);
            setState(state);
          }}
        >
          <button type="submit">Send</button>
          {state === "error" && (
            <div
              role="alert"
              className="authored-error"
              style={{ color: "red" }}
            >
              {errors.map(({ message }, index) => (
                <div key={index}>{message}</div>
              ))}
            </div>
          )}
        </ResourceForm>
      );
    };
    try {
      await act(async () => root.render(<Harness />));
      await act(async () => container.querySelector("button")?.click());
      await vi.waitFor(() =>
        expect(
          container.querySelector("form")?.getAttribute("data-state")
        ).toBe("error")
      );
      const message = container.querySelector<HTMLElement>(".authored-error");
      expect(message).not.toBeNull();
      expect(message?.style.color).toBe("red");
      expect(container.querySelectorAll('[role="alert"]')).toHaveLength(1);
      expect(message?.textContent).toBe(
        actionErrors.map(({ message }) => message).join("")
      );
      expect(events.lastIndexOf("result")).toBeLessThan(
        events.lastIndexOf("error")
      );
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  }
);
