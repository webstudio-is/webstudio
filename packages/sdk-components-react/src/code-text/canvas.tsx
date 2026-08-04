import { bundledLanguages } from "shiki/langs";
import { bundledThemes } from "shiki/themes";
import { createCodeText } from "./index";

export const CanvasCodeText = createCodeText({
  loaders: {
    language: async (language) => {
      const loader =
        bundledLanguages[language as keyof typeof bundledLanguages];
      return (await loader?.())?.default;
    },
    theme: async (theme) => {
      const loader = bundledThemes[theme as keyof typeof bundledThemes];
      return (await loader?.())?.default;
    },
  },
});
