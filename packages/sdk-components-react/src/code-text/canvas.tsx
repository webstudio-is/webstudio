import { bundledLanguages } from "shiki/langs";
import { bundledThemes } from "shiki/themes";
import { createCodeText } from "./index";

const load = async <Registration,>(
  loader: (() => Promise<{ default: Registration }>) | undefined
) => (await loader?.())?.default;

export const CanvasCodeText = createCodeText({
  loaders: {
    language: (language) =>
      load(bundledLanguages[language as keyof typeof bundledLanguages]),
    theme: (theme) => load(bundledThemes[theme as keyof typeof bundledThemes]),
  },
});
