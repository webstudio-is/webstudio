import {
  forwardRef,
  useEffect,
  useState,
  type ComponentProps,
  type ElementRef,
} from "react";
import { bundledLanguages } from "shiki/langs";
import { bundledThemes } from "shiki/themes";
import { CodeText } from "@webstudio-is/sdk-components-react/components";
import { createCodeText } from "@webstudio-is/sdk-components-react/code-text";

type CodeTextComponent = ReturnType<typeof createCodeText>;
type LoadedCodeText = {
  key: string;
  Component: CodeTextComponent;
};

const componentsBySelection = new Map<string, Promise<CodeTextComponent>>();

const loadCodeText = (lang: string, theme: string) => {
  const key = `${lang}:${theme}`;
  let promise = componentsBySelection.get(key);
  if (promise !== undefined) {
    return promise;
  }

  promise = (async () => {
    const themeLoader = bundledThemes[theme as keyof typeof bundledThemes];
    const languageLoader =
      bundledLanguages[lang as keyof typeof bundledLanguages];
    if (
      themeLoader === undefined ||
      (lang !== "plaintext" && languageLoader === undefined)
    ) {
      return CodeText;
    }

    const [languageModule, themeModule] = await Promise.all([
      languageLoader?.(),
      themeLoader(),
    ]);
    return createCodeText({
      languages: languageModule === undefined ? [] : [languageModule.default],
      themes: [themeModule.default],
    });
  })().catch(() => CodeText);
  componentsBySelection.set(key, promise);
  return promise;
};

export const CanvasCodeText = forwardRef<
  ElementRef<"code">,
  ComponentProps<typeof CodeText>
>(({ lang, theme, ...props }, ref) => {
  const key =
    typeof lang === "string" && typeof theme === "string"
      ? `${lang}:${theme}`
      : undefined;
  const [loaded, setLoaded] = useState<LoadedCodeText>();

  useEffect(() => {
    if (key === undefined || lang === undefined || theme === undefined) {
      return;
    }

    let active = true;
    void loadCodeText(lang, theme).then((Component) => {
      if (active) {
        setLoaded({ key, Component });
      }
    });
    return () => {
      active = false;
    };
  }, [key, lang, theme]);

  const Component =
    loaded !== undefined && loaded.key === key ? loaded.Component : CodeText;
  return <Component {...props} lang={lang} theme={theme} ref={ref} />;
});

CanvasCodeText.displayName = "CanvasCodeText";
