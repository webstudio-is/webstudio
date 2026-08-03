import { expect, test } from "vitest";
import { languageNames } from "@shikijs/langs";
import { themeNames } from "@shikijs/themes";
import { meta } from "./code-text.ws";

test("exposes static language and theme selections", () => {
  expect(meta.deprecated).toBeUndefined();
  expect(meta.initialProps).toEqual(["id", "class", "code", "lang", "theme"]);
  expect(meta.props?.lang).toEqual({
    label: "Language",
    required: true,
    control: "select",
    type: "string",
    defaultValue: "javascript",
    options: ["plaintext", ...languageNames],
    bindable: false,
  });
  expect(meta.props?.theme).toEqual({
    label: "Theme",
    required: true,
    control: "select",
    type: "string",
    defaultValue: "github-light",
    options: [...themeNames],
    bindable: false,
  });
});
