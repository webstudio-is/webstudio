import { languageNames } from "@shikijs/langs";
import { themeNames } from "@shikijs/themes";

export const codeTextLanguages = ["plaintext", ...languageNames];
export const codeTextThemes = [...themeNames];

const codeTextLanguageSet = new Set<string>(codeTextLanguages);
const codeTextThemeSet = new Set<string>(codeTextThemes);

export const isCodeTextLanguage = (value: string) =>
  codeTextLanguageSet.has(value);

export const isCodeTextTheme = (value: string) => codeTextThemeSet.has(value);
