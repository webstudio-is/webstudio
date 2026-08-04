import { expect, test } from "vitest";
import { resolveCodeEditorLanguage } from "./code";

test("keeps the configured language for existing code controls", () => {
  expect(resolveCodeEditorLanguage({ control: "code", language: "html" })).toBe(
    "html"
  );
});

test("uses the selected Code Text language in the code editor", () => {
  expect(
    resolveCodeEditorLanguage({
      control: "codetext",
      computedProps: new Map([["language", "typescript"]]),
    })
  ).toBe("typescript");
});

test("falls back to plain text for unsupported Code Text languages", () => {
  expect(
    resolveCodeEditorLanguage({
      control: "codetext",
      computedProps: new Map([["language", "ruby"]]),
    })
  ).toBeUndefined();
});
