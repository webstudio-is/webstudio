import { languageNames } from "@shikijs/langs";
import { themeNames } from "@shikijs/themes";

// These embedded grammars do not have loaders in Shiki's bundled registry.
const unbundledLanguageNames = new Set([
  "angular-expression",
  "angular-inline-style",
  "angular-inline-template",
  "angular-let-declaration",
  "angular-template",
  "angular-template-blocks",
  "cpp-macro",
  "es-tag-css",
  "es-tag-glsl",
  "es-tag-html",
  "es-tag-sql",
  "es-tag-xml",
  "jinja-html",
  "markdown-nix",
  "markdown-vue",
  "vue-directives",
  "vue-interpolations",
  "vue-sfc-style-variable-injection",
]);

export const codeTextLanguageNames = [
  "plaintext",
  ...languageNames.filter((name) => unbundledLanguageNames.has(name) === false),
];
export const codeTextThemeNames = [...themeNames];
