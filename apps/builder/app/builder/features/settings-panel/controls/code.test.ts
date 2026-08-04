import { expect, test } from "vitest";
import { matchCodeTextEditorLanguage } from "./code";

test("matches the selected Code Text language with CodeMirror", () => {
  expect(matchCodeTextEditorLanguage("python")?.name).toBe("Python");
  expect(matchCodeTextEditorLanguage("bash")?.name).toBe("Shell");
});

test("falls back to plain text for unsupported Code Text languages", () => {
  expect(matchCodeTextEditorLanguage("astro")).toBeUndefined();
});
