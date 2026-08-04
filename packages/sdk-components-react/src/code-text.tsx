import {
  Fragment,
  forwardRef,
  useMemo,
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
  type ThemeRegistrationAny,
} from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import { CodeText, defaultTag } from "./code-text-base";

type CodeTextProps = ComponentProps<typeof CodeText>;

const joinClassNames = (
  first: string | undefined,
  second: string | undefined
) => [first, second].filter(Boolean).join(" ") || undefined;

export const createCodeText = ({
  languages,
  themes,
}: {
  languages: MaybeArray<LanguageRegistration>[];
  themes: ThemeRegistrationAny[];
}) => {
  const highlighter = createHighlighterCoreSync({
    langs: languages,
    themes,
    engine: createJavaScriptRegexEngine({ target: "ES2018" }),
    warnings: false,
  });

  const HighlightedCodeText = forwardRef<
    ElementRef<typeof defaultTag>,
    CodeTextProps
  >(({ code, children, lang, theme, className, style, ...props }, ref) => {
    const highlighted = useMemo(() => {
      if (
        typeof code !== "string" ||
        code.trim().length === 0 ||
        typeof lang !== "string" ||
        typeof theme !== "string"
      ) {
        return;
      }

      try {
        return highlighter.codeToHast(code, { lang, theme });
      } catch {
        return;
      }
    }, [code, lang, theme]);

    if (highlighted === undefined) {
      return (
        <CodeText
          {...props}
          className={className}
          style={style}
          code={code}
          ref={ref}
        >
          {children}
        </CodeText>
      );
    }

    return toJsxRuntime(highlighted, {
      Fragment,
      jsx,
      jsxs,
      components: {
        pre: ({
          children: highlightedChildren,
          className: highlightedClassName,
          style: highlightedStyle,
          ...highlightedProps
        }) => (
          <code
            {...highlightedProps}
            {...props}
            ref={ref}
            className={joinClassNames(highlightedClassName, className)}
            style={{
              ...(highlightedStyle as CSSProperties),
              ...style,
            }}
          >
            {highlightedChildren}
          </code>
        ),
        code: ({ children: highlightedChildren }) => <>{highlightedChildren}</>,
      },
    }) as ReactElement;
  });

  HighlightedCodeText.displayName = "HighlightedCodeText";
  return HighlightedCodeText;
};
