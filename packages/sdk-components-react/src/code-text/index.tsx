import {
  Fragment,
  Suspense,
  forwardRef,
  useEffect,
  useMemo,
  useRef,
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
import {
  codeTextDefaultLanguage,
  codeTextDefaultTheme,
} from "@webstudio-is/sdk";
import { CodeText, defaultTag } from "./base";
import {
  codeTextThemeBackgroundVariable,
  codeTextThemeColorVariable,
} from "./theme";

type CodeTextProps = ComponentProps<typeof CodeText>;
type Highlighter = ReturnType<typeof createHighlighterCoreSync>;
type LanguageLoader = (
  language: string
) => Promise<MaybeArray<LanguageRegistration> | undefined> | undefined;
type ThemeLoader = (
  theme: string
) => Promise<ThemeRegistrationAny | undefined> | undefined;
type AssetLoaders = {
  language?: LanguageLoader;
  theme?: ThemeLoader;
};

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
  suspense = false,
}: {
  languages?: MaybeArray<LanguageRegistration>[];
  themes?: ThemeRegistrationAny[];
  loaders?: AssetLoaders;
  suspense?: boolean;
}) => {
  const highlighter = createHighlighterCoreSync({
    langs: languages,
    themes,
    engine: createJavaScriptRegexEngine({ target: "ES2018" }),
    warnings: false,
  });
  const languageLoads = new Map<string, Promise<boolean>>();
  const themeLoads = new Map<string, Promise<boolean>>();
  const suspenseLoads = new Map<string, Promise<void>>();

  const isLanguageLoaded = (language: string) =>
    language === "plaintext" ||
    highlighter.getLoadedLanguages().includes(language);
  const isThemeLoaded = (theme: string) =>
    highlighter.getLoadedThemes().includes(theme);
  const isSelectionLoaded = (language: string, theme: string) =>
    isLanguageLoaded(language) && isThemeLoaded(theme);

  const loadAsset = <Registration,>({
    name,
    isLoaded,
    loads,
    loader,
    register,
  }: {
    name: string;
    isLoaded: (name: string) => boolean;
    loads: Map<string, Promise<boolean>>;
    loader:
      | ((name: string) => Promise<Registration | undefined> | undefined)
      | undefined;
    register: (registration: Registration) => void;
  }) => {
    if (isLoaded(name)) {
      return;
    }
    let promise = loads.get(name);
    if (promise !== undefined) {
      return promise;
    }
    const registration = loader?.(name);
    if (registration === undefined) {
      return;
    }
    promise = registration
      .then((loaded) => {
        if (loaded === undefined) {
          return false;
        }
        register(loaded);
        return true;
      })
      .catch(() => false);
    loads.set(name, promise);
    void promise.then((loaded) => {
      if (loaded === false && loads.get(name) === promise) {
        loads.delete(name);
      }
    });
    return promise;
  };

  const loadLanguage = (language: string) =>
    loadAsset({
      name: language,
      isLoaded: isLanguageLoaded,
      loads: languageLoads,
      loader: loaders?.language,
      register: (registration) => highlighter.loadLanguageSync(registration),
    });

  const loadTheme = (theme: string) =>
    loadAsset({
      name: theme,
      isLoaded: isThemeLoaded,
      loads: themeLoads,
      loader: loaders?.theme,
      register: (registration) => highlighter.loadThemeSync(registration),
    });

  const loadAssets = (language: string, theme: string) => {
    if (isSelectionLoaded(language, theme)) {
      return;
    }
    const promises: Promise<boolean>[] = [];
    if (isLanguageLoaded(language) === false) {
      const promise = loadLanguage(language);
      if (promise === undefined) {
        return;
      }
      promises.push(promise);
    }
    if (isThemeLoaded(theme) === false) {
      const promise = loadTheme(theme);
      if (promise === undefined) {
        return;
      }
      promises.push(promise);
    }
    if (promises.length === 0) {
      return;
    }
    return Promise.all(promises).then(() => isSelectionLoaded(language, theme));
  };

  const CodeTextContent = forwardRef<
    ElementRef<typeof defaultTag>,
    CodeTextProps
  >((allProps, ref) => {
    const {
      code: legacyCode,
      children,
      language,
      theme,
      className,
      style,
      ...props
    } = allProps;
    const [, rerender] = useState(0);
    const didCommit = useRef(false);

    useEffect(() => {
      didCommit.current = true;
    }, []);

    const effectiveLanguage = language ?? codeTextDefaultLanguage;
    const effectiveTheme = theme ?? codeTextDefaultTheme;
    const assetsReady = isSelectionLoaded(effectiveLanguage, effectiveTheme);
    if (suspense && didCommit.current === false && assetsReady === false) {
      const key = JSON.stringify([effectiveLanguage, effectiveTheme]);
      let promise = suspenseLoads.get(key);
      if (promise === undefined) {
        const assets = loadAssets(effectiveLanguage, effectiveTheme);
        if (assets !== undefined) {
          promise = assets.then((loaded) => {
            if (loaded === false) {
              return new Promise<void>(() => {});
            }
          });
          suspenseLoads.set(key, promise);
        }
      }
      if (promise !== undefined) {
        throw promise;
      }
    }

    useEffect(() => {
      if (assetsReady) {
        return;
      }
      const promise = loadAssets(effectiveLanguage, effectiveTheme);
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
    }, [assetsReady, effectiveLanguage, effectiveTheme]);

    const source = typeof children === "string" ? children : legacyCode;
    const isTextEditing = props["data-ws-text-editing"] !== undefined;
    const highlighted = useMemo(() => {
      if (
        isTextEditing ||
        assetsReady === false ||
        typeof source !== "string" ||
        source.trim().length === 0
      ) {
        return;
      }
      return highlightCode({
        highlighter,
        code: source,
        language: effectiveLanguage,
        theme: effectiveTheme,
      });
    }, [assetsReady, effectiveLanguage, effectiveTheme, isTextEditing, source]);

    if (highlighted === undefined) {
      return (
        <CodeText
          {...props}
          ref={ref}
          className={className}
          style={style}
          code={legacyCode}
        >
          {children}
        </CodeText>
      );
    }

    const {
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
        className={className}
        style={themedStyle}
      >
        {highlightedChildren}
      </CodeText>
    );
  });

  CodeTextContent.displayName = "CodeTextContent";
  if (suspense === false) {
    return CodeTextContent;
  }

  const SuspenseCodeText = forwardRef<
    ElementRef<typeof defaultTag>,
    CodeTextProps
  >((props, ref) => (
    <Suspense fallback={<CodeText {...props} ref={ref} />}>
      <CodeTextContent {...props} ref={ref} />
    </Suspense>
  ));
  SuspenseCodeText.displayName = "SuspenseCodeText";
  return SuspenseCodeText;
};
