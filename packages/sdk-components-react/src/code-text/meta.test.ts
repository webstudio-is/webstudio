import { expect, test } from "vitest";
import { themeNames } from "@shikijs/themes";
import { bundledLanguagesInfo } from "shiki/langs";
import { meta } from "./meta";

test("exposes static language and theme selections", () => {
  expect(meta.deprecated).toBeUndefined();
  expect(meta.initialProps).toEqual(["id", "class", "language", "theme"]);
  expect(meta.contentModel).toEqual({
    category: "instance",
    children: ["text"],
  });
  expect(meta.props?.code).toBeUndefined();
  expect(meta.props?.language).toEqual({
    label: "Language",
    required: false,
    control: "select",
    type: "string",
    contentMode: true,
    defaultValue: "javascript",
    options: ["plaintext", ...bundledLanguagesInfo.map(({ id }) => id)],
  });
  expect(meta.props?.theme).toEqual({
    label: "Theme",
    required: false,
    control: "select",
    type: "string",
    contentMode: true,
    defaultValue: "github-light",
    options: [...themeNames],
  });
  expect(meta.presetStyle?.code).toEqual(
    expect.arrayContaining([
      {
        property: "color",
        value: { type: "var", value: "w-code-text-theme-color" },
      },
      {
        property: "background-color",
        value: {
          type: "var",
          value: "w-code-text-theme-background",
          fallback: { type: "rgb", r: 238, g: 238, b: 238, alpha: 1 },
        },
      },
    ])
  );
});
