import { expect, test } from "vitest";
import { bundledLanguagesInfo } from "shiki/langs";
import { themeNames } from "@shikijs/themes";
import { codeTextLanguageNames, codeTextThemeNames } from "./options";

test("matches Shiki's bundled language and theme IDs", () => {
  expect(codeTextLanguageNames).toEqual([
    "plaintext",
    ...bundledLanguagesInfo.map(({ id }) => id),
  ]);
  expect(codeTextThemeNames).toEqual(themeNames);
});
