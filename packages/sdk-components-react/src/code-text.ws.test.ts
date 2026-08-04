import { expect, test } from "vitest";
import { themeNames } from "@shikijs/themes";
import { bundledLanguagesInfo } from "shiki/langs";
import { meta } from "./code-text.ws";

test("exposes static language and theme selections", () => {
  expect(meta.deprecated).toBeUndefined();
  expect(meta.initialProps).toEqual([
    "id",
    "class",
    "code",
    "language",
    "theme",
  ]);
  expect(meta.props?.language).toEqual({
    label: "Language",
    required: true,
    control: "select",
    type: "string",
    options: ["plaintext", ...bundledLanguagesInfo.map(({ id }) => id)],
    bindable: false,
  });
  expect(meta.props?.theme).toEqual({
    label: "Theme",
    required: true,
    control: "select",
    type: "string",
    options: [...themeNames],
    bindable: false,
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
