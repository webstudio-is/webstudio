import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { useState } from "react";
import { afterEach, expect, test, vi } from "vitest";
import { $builderMode } from "~/shared/nano-states";
import { __testing__ } from "./webstudio-component";
import { subscribe } from "~/shared/pubsub";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root | undefined;
afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  $builderMode.set("design");
  document.body.innerHTML = "";
});

test.each([true, false])(
  "managed Form state resets after Preview outcome %s and remains initial on re-entry",
  async (success) => {
    $builderMode.set("preview");
    const container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    const submit = vi.fn(async () => ({
      success,
      status: success ? 200 : 422,
      results: [],
      errors: success
        ? []
        : [{ status: 422, body: null, message: "Fixture failure" }],
    }));
    const Harness = () => {
      const [state, setState] = useState<"initial" | "success" | "error">(
        "initial"
      );
      return (
        <__testing__.PreviewNativeForm
          action={[{ dataSourceId: "request", enabled: true }]}
          state={state}
          onStateChange={setState}
          onManagedSubmit={submit}
        >
          <button type="submit">Send</button>
        </__testing__.PreviewNativeForm>
      );
    };
    await act(async () => root?.render(<Harness />));
    await act(async () => container.querySelector("button")?.click());
    await expect
      .poll(() => container.querySelector("form")?.getAttribute("data-state"))
      .toBe(success ? "success" : "error");
    await act(async () => $builderMode.set("design"));
    expect(container.querySelector("form")?.getAttribute("data-state")).toBe(
      "initial"
    );
    await act(async () => $builderMode.set("preview"));
    expect(container.querySelector("form")?.getAttribute("data-state")).toBe(
      "initial"
    );
    expect(submit).toHaveBeenCalledTimes(1);
  }
);

test("Preview publishes live unsent DOM values as input/change events occur", async () => {
  const values: Array<Record<string, unknown> | null> = [];
  const cleanup = subscribe("previewFormValues", (event) =>
    values.push(event.values)
  );
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  const submit = vi.fn();
  try {
    await act(async () =>
      root?.render(
        <__testing__.PreviewNativeForm
          data-ws-managed-form-id="live-form"
          action={[{ dataSourceId: "request", enabled: true }]}
          onManagedSubmit={submit}
        >
          <input name="text" />
          <select name="choice">
            <option value="first">First</option>
            <option value="second">Second</option>
          </select>
          <input name="flag" type="checkbox" value="yes" />
        </__testing__.PreviewNativeForm>
      )
    );
    await expect
      .poll(() => values.at(-1))
      .toEqual({ text: "", choice: "first", flag: [] });
    const input = container.querySelector<HTMLInputElement>('[name="text"]')!;
    const select = container.querySelector(
      '[name="choice"]'
    ) as unknown as HTMLSelectElement;
    const checkbox =
      container.querySelector<HTMLInputElement>('[name="flag"]')!;
    await act(async () => {
      input.value = "edited";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      select.value = "second";
      select.dispatchEvent(new Event("change", { bubbles: true }));
      checkbox.checked = true;
      checkbox.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await expect
      .poll(() => values.at(-1))
      .toEqual({ text: "edited", choice: "second", flag: ["yes"] });
    expect(submit).not.toHaveBeenCalled();
  } finally {
    cleanup();
  }
});
