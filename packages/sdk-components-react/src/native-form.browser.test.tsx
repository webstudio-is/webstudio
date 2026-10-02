import { renderToStaticMarkup } from "react-dom/server";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { expect, test, vi } from "vitest";
import { NativeForm } from "./native-form";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

test("uses browser validation and navigates with a native GET submission", async () => {
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

    button.click();
    expect(form.checkValidity()).toBe(false);
    expect(frame.location.href).toBe("about:srcdoc");

    input.value = "person@example.com";
    const navigated = new Promise<void>((resolve) => {
      iframe.addEventListener("load", () => resolve(), { once: true });
    });
    button.click();
    await navigated;

    const submitted = new URL(frame.location.href);
    expect(submitted.pathname).toBe("/__native_form_submission__");
    expect(submitted.searchParams.get("email")).toBe("person@example.com");
  } finally {
    iframe.remove();
  }
});

test("managed mode blocks native navigation and reports an empty selection", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () => {
      root.render(
        <NativeForm
          action="/__must_not_navigate__"
          submission={{ mode: "resources", destinations: [] }}
        >
          <button type="submit">Send</button>
        </NativeForm>
      );
    });
    await act(async () => {
      container.querySelector("button")?.click();
    });
    expect(container.querySelector('[role="alert"]')?.textContent).toMatch(
      /Select at least one Resource/
    );
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
          submission={{ mode: "resources" }}
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

test("an empty managed Form cannot natively submit without hydration", async () => {
  const html = renderToStaticMarkup(
    <NativeForm
      action="/__must_not_navigate__"
      method="post"
      submission={{ mode: "resources", destinations: [] }}
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
    <NativeForm
      action="/__must_not_navigate__/form"
      method="post"
      submission={{ mode: "resources", destinations: [] }}
    >
      <legend>
        <button
          type="submit"
          formAction="/__must_not_navigate__/button"
          formMethod="get"
        >
          Send
        </button>
      </legend>
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

test("managed mode passes one structured submission to its dispatcher", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const onManagedSubmit = vi.fn();
  try {
    await act(async () => {
      root.render(
        <NativeForm
          action="/__must_not_navigate__"
          submission={{ mode: "resources", destinations: ["resource-one"] }}
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
    expect(onManagedSubmit).toHaveBeenCalledExactlyOnceWith({ name: "Ada" });
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});
