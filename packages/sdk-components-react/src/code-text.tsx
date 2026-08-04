import {
  Fragment,
  forwardRef,
  useEffect,
  useMemo,
  useState,
  type ComponentProps,
  type CSSProperties,
  type ElementRef,
  type ReactElement,
} from "react";
import { jsx, jsxs } from "react/jsx-runtime";
import { toJsxRuntime } from "hast-util-to-jsx-runtime";
import {
  createHighlighterCoreSync,
  type LanguageRegistration,
  type MaybeArray,
  type ShikiTransformer,
  type ThemeRegistrationAny,
} from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import { CodeText, defaultTag } from "./code-text-base";
import {
  codeTextThemeBackgroundVariable,
  codeTextThemeColorVariable,
} from "./code-text-theme";

type CodeTextProps = ComponentProps<typeof CodeText>;
type Highlighter = ReturnType<typeof createHighlighterCoreSync>;
type LanguageLoader = (
  language: string
) => Promise<MaybeArray<LanguageRegistration> | undefined>;
type ThemeLoader = (theme: string) => Promise<ThemeRegistrationAny | undefined>;
type AssetLoaders = {
  language: LanguageLoader;
  theme: ThemeLoader;
};

const joinClassNames = (
  first: string | undefined,
  second: string | undefined
) => [first, second].filter(Boolean).join(" ") || undefined;

// Canvas assets load after the first paint, so theme typography must not
// change text metrics when highlighting appears.
const colorOnlyThemeTransformer: ShikiTransformer = {
  tokens: (lines) =>
    lines.map((line) =>
      line.map((token) => ({ ...token, fontStyle: undefined }))
    ),
};

const highlightCode = ({
  highlighter,
  code,
  language,
  theme,
}: {
  highlighter: Highlighter;
  code: string;
  language: string;
  theme: string;
}) => {
  let root;
  try {
    root = highlighter.codeToHast(code, {
      lang: language,
      theme,
      tabindex: false,
      transformers: [colorOnlyThemeTransformer],
    });
  } catch {
    return;
  }

  const pre = root.children[0];
  if (pre?.type !== "element" || pre.tagName !== "pre") {
    return;
  }
  const nestedCode = pre.children[0];
  if (nestedCode?.type !== "element" || nestedCode.tagName !== "code") {
    return;
  }

  return toJsxRuntime(
    { ...pre, tagName: "code", children: nestedCode.children },
    { Fragment, jsx, jsxs }
  ) as ReactElement<ComponentProps<"code">>;
};

export const createCodeText = ({
  languages = [],
  themes = [],
  loaders,
}: {
  languages?: MaybeArray<LanguageRegistration>[];
  themes?: ThemeRegistrationAny[];
  loaders?: AssetLoaders;
}) => {
  const highlighter = createHighlighterCoreSync({
    langs: languages,
    themes,
    engine: createJavaScriptRegexEngine({ target: "ES2018" }),
    warnings: false,
  });
  const loadedSelections = new Set<string>();
  const assetLoads = new Map<string, Promise<boolean>>();

  const loadAssets = (language: string, theme: string) => {
    if (loaders === undefined) {
      return;
    }

    const key = JSON.stringify([language, theme]);
    if (loadedSelections.has(key)) {
      return;
    }
    let promise = assetLoads.get(key);
    if (promise !== undefined) {
      return promise;
    }

    promise = (async () => {
      const [languageRegistration, themeRegistration] = await Promise.all([
        language === "plaintext" ? undefined : loaders.language(language),
        loaders.theme(theme),
      ]);
      if (
        themeRegistration === undefined ||
        (language !== "plaintext" && languageRegistration === undefined)
      ) {
        return false;
      }
      if (languageRegistration !== undefined) {
        highlighter.loadLanguageSync(languageRegistration);
      }
      highlighter.loadThemeSync(themeRegistration);
      loadedSelections.add(key);
      return true;
    })().catch(() => false);
    assetLoads.set(key, promise);
    void promise.then((loaded) => {
      if (loaded === false && assetLoads.get(key) === promise) {
        assetLoads.delete(key);
      }
    });
    return promise;
  };

  const HighlightedCodeText = forwardRef<
    ElementRef<typeof defaultTag>,
    CodeTextProps
  >(({ code, children, language, theme, className, style, ...props }, ref) => {
    const [, rerender] = useState(0);

    useEffect(() => {
      if (typeof language !== "string" || typeof theme !== "string") {
        return;
      }
      const promise = loadAssets(language, theme);
      if (promise === undefined) {
        return;
      }

      let active = true;
      void promise.then((loaded) => {
        if (active && loaded) {
          rerender((value) => value + 1);
        }
      });
      return () => {
        active = false;
      };
    }, [language, theme]);

    const assetsReady =
      loaders === undefined ||
      (typeof language === "string" &&
        typeof theme === "string" &&
        loadedSelections.has(JSON.stringify([language, theme])));
    const highlighted = useMemo(() => {
      if (
        assetsReady === false ||
        typeof code !== "string" ||
        code.trim().length === 0 ||
        typeof language !== "string" ||
        typeof theme !== "string"
      ) {
        return;
      }
      return highlightCode({ highlighter, code, language, theme });
    }, [assetsReady, code, language, theme]);

    if (highlighted === undefined) {
      return (
        <CodeText
          {...props}
          ref={ref}
          className={className}
          style={style}
          code={code}
        >
          {children}
        </CodeText>
      );
    }

    const {
      className: highlightedClassName,
      style: highlightedStyle,
      children: highlightedChildren,
      ...highlightedProps
    } = highlighted.props;
    const themedStyle = {
      [`--${codeTextThemeBackgroundVariable}`]:
        highlightedStyle?.backgroundColor,
      [`--${codeTextThemeColorVariable}`]: highlightedStyle?.color,
      ...style,
    } as CSSProperties;
    return (
      <CodeText
        {...highlightedProps}
        {...props}
        ref={ref}
        className={joinClassNames(highlightedClassName, className)}
        style={themedStyle}
      >
        {highlightedChildren}
      </CodeText>
    );
  });

  HighlightedCodeText.displayName = "HighlightedCodeText";
  return HighlightedCodeText;
};
