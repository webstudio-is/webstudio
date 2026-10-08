import { expect, test } from "vitest";
import type { Instance, Instances } from "@webstudio-is/sdk";
import { getCanvasFormVisibility } from "./form-selection-visibility";

const makeInstance = (
  id: string,
  component: string,
  label?: string
): Instance => ({ type: "instance", id, component, label, children: [] });
const instances: Instances = new Map([
  ["page", makeInstance("page", "Body")],
  ["form", makeInstance("form", "NativeForm")],
  ["content", makeInstance("content", "ws:element", "Form Content")],
  ["success", makeInstance("success", "ws:element", "Success Message")],
  ["error", makeInstance("error", "ws:element", "Error Message")],
  ["input", makeInstance("input", "Input")],
]);
const selector = (id: string) =>
  id === "form" ? [id, "page"] : [id, "form", "page"];
const visible = (
  id: string,
  selected: string[] | undefined,
  show: unknown = false,
  isAuthoring = true,
  tree = instances
) =>
  getCanvasFormVisibility({
    show,
    isPreviewMode: !isAuthoring,
    instanceSelector: selector(id),
    selectedSelector: selected,
    instances: tree,
  });

for (const state of ["initial", "success", "error"] as const) {
  for (const selected of ["form", "content", "success", "error"]) {
    test(`selected ${selected} is visible in ${state} without changing the authored binding or siblings`, () => {
      const snapshot = JSON.stringify([...instances]);
      const shows = {
        form: false,
        content: state !== "success",
        success: state === "success",
        error: state === "error",
      };
      for (const [id, show] of Object.entries(shows)) {
        expect(visible(id, selector(selected), show)).toBe(
          id === selected || id === "form" || show
        );
      }
      expect(
        getCanvasFormVisibility({
          show: false,
          isPreviewMode: false,
          instanceSelector: ["page"],
          selectedSelector: selector(selected),
          instances,
        })
      ).toBe(true);
      expect(JSON.stringify([...instances])).toBe(snapshot);
    });
  }
}

test("Preview rendering, unrelated selections, and legacy Forms retain bound visibility", () => {
  for (const id of ["form", "content", "success", "error"]) {
    expect(visible(id, selector(id), false, false)).toBe(false);
    expect(visible(id, selector(id), true, false)).toBe(true);
    expect(visible(id, undefined)).toBe(false);
    expect(visible(id, selector("input"))).toBe(false);
  }
  for (const component of ["WebhookForm", "Form"]) {
    const legacy = new Map(instances);
    legacy.set("form", makeInstance("form", component));
    expect(visible("error", selector("error"), false, true, legacy)).toBe(
      false
    );
  }
});

test("selection reveals only the selected occurrence of a repeated Form", () => {
  expect(visible("success", ["success", "form", "other-page"])).toBe(false);
  expect(visible("success", selector("error"))).toBe(false);
});

test("a Form renamed to a feedback label still reveals its selected instance", () => {
  const renamed = new Map(instances);
  renamed.set("form", makeInstance("form", "NativeForm", "Error Message"));
  expect(visible("form", selector("form"), false, true, renamed)).toBe(true);
});
