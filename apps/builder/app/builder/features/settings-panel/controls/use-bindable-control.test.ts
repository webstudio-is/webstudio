import { expect, test } from "vitest";
import { getBindableControlPresentation } from "./use-bindable-control";

test("edits a frontmatter value without exposing its binding", () => {
  expect(
    getBindableControlPresentation({
      bindingState: { overwritable: false, variant: "bound" },
      isFrontmatterBinding: true,
      isEditableFrontmatterBinding: true,
    })
  ).toEqual({
    bindingState: { overwritable: true, variant: "bound" },
    showBinding: false,
  });
});

test("keeps ordinary expression bindings read-only and visible", () => {
  expect(
    getBindableControlPresentation({
      bindingState: { overwritable: false, variant: "bound" },
      isFrontmatterBinding: false,
      isEditableFrontmatterBinding: false,
    })
  ).toEqual({
    bindingState: { overwritable: false, variant: "bound" },
    showBinding: true,
  });
});

test("keeps an unavailable frontmatter value read-only without exposing its binding", () => {
  expect(
    getBindableControlPresentation({
      bindingState: { overwritable: false, variant: "bound" },
      isFrontmatterBinding: true,
      isEditableFrontmatterBinding: false,
    })
  ).toEqual({
    bindingState: { overwritable: false, variant: "bound" },
    showBinding: false,
  });
});
