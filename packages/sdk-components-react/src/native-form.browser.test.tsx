import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { NativeForm } from "./native-form";

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
