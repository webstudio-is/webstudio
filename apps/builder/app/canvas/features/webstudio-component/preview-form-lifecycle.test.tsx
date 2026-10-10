import { createRoot, type Root } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { useState } from "react";
import { useStore } from "@nanostores/react";
import { afterEach, expect, test, vi } from "vitest";
import { $builderMode, $isPreviewMode } from "~/shared/nano-states";
import { __testing__ } from "./webstudio-component";
import { subscribe } from "~/shared/pubsub";
import { encodeDataVariableId, type Instance } from "@webstudio-is/sdk";
import { $dataSources, $instances, $props } from "~/shared/sync/data-stores";
import { $variableValuesByInstanceSelector } from "~/shared/nano-states";
import { WebstudioComponentPreview } from "./webstudio-component";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root | undefined;
const initialInstances = $instances.get();
const initialDataSources = $dataSources.get();
const initialProps = $props.get();
const initialVariableValues = $variableValuesByInstanceSelector.get();
afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  $builderMode.set("design");
  $instances.set(initialInstances);
  $dataSources.set(initialDataSources);
  $props.set(initialProps);
  $variableValuesByInstanceSelector.set(initialVariableValues);
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
      const isPreviewMode = useStore($isPreviewMode);
      const [state, setState] = useState<"initial" | "success" | "error">(
        "initial"
      );
      if (!isPreviewMode) {
        return <div data-renderer="canvas" />;
      }
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
    expect(container.querySelector("form")).toBeNull();
    expect(container.querySelector('[data-renderer="canvas"]')).not.toBeNull();
    await act(async () => $builderMode.set("preview"));
    expect(container.querySelector("form")?.getAttribute("data-state")).toBe(
      "initial"
    );
    expect(submit).toHaveBeenCalledTimes(1);
  }
);

test.each([true, false])(
  "uncontrolled managed Form resets after renderer switch from Preview outcome %s",
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
      const isPreviewMode = useStore($isPreviewMode);
      return isPreviewMode ? (
        <__testing__.PreviewNativeForm
          action={[{ dataSourceId: "request", enabled: true }]}
          onManagedSubmit={submit}
        >
          <button type="submit">Send</button>
        </__testing__.PreviewNativeForm>
      ) : (
        <div data-renderer="canvas" />
      );
    };
    await act(async () => root?.render(<Harness />));
    await act(async () => container.querySelector("button")?.click());
    await expect
      .poll(() => container.querySelector("form")?.getAttribute("data-state"))
      .toBe(success ? "success" : "error");
    await act(async () => $builderMode.set("design"));
    expect(container.querySelector("form")).toBeNull();
    await act(async () => $builderMode.set("preview"));
    expect(container.querySelector("form")?.getAttribute("data-state")).toBe(
      null
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

test.each([
  [[{ message: "First" }, { message: "Second" }], "FirstSecond"],
  [{ message: "Malformed" }, ""],
  [[null, { message: 42 }, { message: "Valid" }], "Valid"],
] as const)(
  "saved error placeholder renders bound result errors in Preview",
  async (errors, expected) => {
    const slot: Instance = {
      type: "instance" as const,
      id: "feedback",
      component: "ws:element",
      tag: "div",
      label: "Renamed feedback",
      children: [
        {
          type: "text" as const,
          value: "Sorry, something went wrong.",
          placeholder: true,
        },
      ],
    };
    const form: Instance = {
      type: "instance" as const,
      id: "form",
      component: "NativeForm",
      children: [{ type: "id" as const, value: slot.id }],
    };
    $instances.set(
      new Map([
        [form.id, form],
        [slot.id, slot],
      ])
    );
    $dataSources.set(
      new Map([
        [
          "renamed-errors",
          {
            id: "renamed-errors",
            name: "customErrors",
            type: "variable" as const,
            scopeInstanceId: form.id,
            value: { type: "json" as const, value: [] },
          },
        ],
      ])
    );
    $props.set(
      new Map([
        [
          "result-action",
          {
            id: "result-action",
            instanceId: form.id,
            name: "onResultChange",
            type: "action" as const,
            value: [
              {
                type: "execute" as const,
                args: ["result"],
                code: `${encodeDataVariableId("renamed-errors")} = result.errors`,
              },
            ],
          },
        ],
      ])
    );
    const container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () =>
      root?.render(
        <WebstudioComponentPreview
          instance={slot}
          instanceSelector={[slot.id]}
          components={new Map()}
        />
      )
    );
    await act(async () =>
      $variableValuesByInstanceSelector.set(
        new Map([
          [JSON.stringify([slot.id]), new Map([["renamed-errors", errors]])],
        ])
      )
    );
    await expect.poll(() => container.textContent).toBe(expected);
  }
);
