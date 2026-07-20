import {
  forwardRef,
  useMemo,
  type ComponentProps,
  useEffect,
  type ReactNode,
} from "react";
import type { Extension } from "@codemirror/state";
import { styleTags, tags } from "@lezer/highlight";
import {
  keymap,
  tooltips,
  highlightSpecialChars,
  highlightActiveLine,
} from "@codemirror/view";
import {
  bracketMatching,
  indentOnInput,
  LanguageSupport,
  LRLanguage,
} from "@codemirror/language";
import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
} from "@codemirror/autocomplete";
import { html } from "@codemirror/lang-html";
import { javascript } from "@codemirror/lang-javascript";
import { markdown } from "@codemirror/lang-markdown";
import { css } from "@webstudio-is/design-system";
import {
  EditorContent,
  EditorDialog,
  EditorDialogButton,
  EditorDialogControl,
  foldGutterExtension,
  getCodeEditorCssVars,
} from "~/shared/code-editor-base";
import { cssCompletionSource, cssLanguage } from "@codemirror/lang-css";

const wrapperStyle = css({
  position: "relative",

  variants: {
    size: {
      default: getCodeEditorCssVars({ minHeight: "160px", maxHeight: "320px" }),
      small: getCodeEditorCssVars({ minHeight: "16px", maxHeight: "120px" }),
      full: {
        ...getCodeEditorCssVars({ minHeight: "100%", maxHeight: "100%" }),
        height: "100%",
        "& > div": { height: "100%" },
        "& > div > div:first-child": { height: "100%" },
        "& .cm-editor, & .cm-scroller": { height: "100%" },
      },
    },
  },
  defaultVariants: {
    size: "default",
  },
});

const noLanguageExtensions: Extension[] = [];

const getHtmlExtensions = () => [
  highlightActiveLine(),
  highlightSpecialChars(),
  indentOnInput(),
  html({}),
  bracketMatching(),
  closeBrackets(),
  // render autocomplete in body
  // to prevent popover scroll overflow
  tooltips({ parent: document.body }),
  autocompletion({ icons: false }),
  keymap.of([...closeBracketsKeymap, ...completionKeymap]),
];

const getMarkdownExtensions = () => [
  highlightActiveLine(),
  highlightSpecialChars(),
  indentOnInput(),
  markdown({
    extensions: [
      {
        props: [
          styleTags({
            HorizontalRule: tags.separator,
            HeaderMark: tags.annotation,
            QuoteMark: tags.annotation,
            ListMark: tags.annotation,
            LinkMark: tags.annotation,
            EmphasisMark: tags.annotation,
            CodeMark: tags.annotation,
            InlineCode: tags.string,
            URL: tags.url,
          }),
        ],
      },
    ],
  }),
  bracketMatching(),
  closeBrackets(),
  keymap.of(closeBracketsKeymap),
];

const getJsonExtensions = () => [
  highlightActiveLine(),
  highlightSpecialChars(),
  indentOnInput(),
  javascript(),
  bracketMatching(),
  closeBrackets(),
  keymap.of(closeBracketsKeymap),
];

const cssPropertiesLanguage = LRLanguage.define({
  name: "css",
  parser: cssLanguage.configure({ top: "Styles" }).parser,
});
const cssProperties = new LanguageSupport(
  cssPropertiesLanguage,
  cssPropertiesLanguage.data.of({
    autocomplete: cssCompletionSource,
  })
);

const getCssPropertiesExtensions = () => [
  highlightActiveLine(),
  highlightSpecialChars(),
  indentOnInput(),
  cssProperties,
  // render autocomplete in body
  // to prevent popover scroll overflow
  tooltips({ parent: document.body }),
  autocompletion({ icons: false }),
];

export const CodeEditor = forwardRef<
  HTMLDivElement,
  Omit<ComponentProps<typeof EditorContent>, "extensions"> & {
    lang?: "html" | "json" | "markdown" | "css-properties";
    languageExtensions?: Extension[];
    title?: ReactNode;
    size?: "default" | "small" | "full";
    expandable?: boolean;
  }
>((props, ref) => {
  const {
    lang,
    languageExtensions = noLanguageExtensions,
    title,
    size,
    expandable = true,
    ...editorContentProps
  } = props;
  const builtInExtensions = useMemo(() => {
    if (lang === "html") {
      return getHtmlExtensions();
    }

    if (lang === "markdown") {
      return getMarkdownExtensions();
    }

    if (lang === "json") {
      return getJsonExtensions();
    }

    if (lang === "css-properties") {
      return getCssPropertiesExtensions();
    }

    if (lang === undefined) {
      return [];
    }

    lang satisfies never;

    return [];
  }, [lang]);

  const extensions = useMemo(
    () => [...builtInExtensions, ...languageExtensions],
    [builtInExtensions, languageExtensions]
  );

  const dialogExtensions = useMemo(
    () => [...extensions, foldGutterExtension],
    [extensions]
  );

  // prevent clicking on autocomplete options propagating to body
  // and closing dialogs and popovers
  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof HTMLElement &&
        event.target.closest(".cm-tooltip-autocomplete")
      ) {
        event.stopPropagation();
      }
    };
    const options = { capture: true };
    document.addEventListener("pointerdown", handlePointerDown, options);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, options);
    };
  }, []);
  return (
    <div className={wrapperStyle({ size })} ref={ref}>
      {expandable === false ? (
        <EditorContent {...editorContentProps} extensions={extensions} />
      ) : (
        <EditorDialogControl>
          <EditorContent {...editorContentProps} extensions={extensions} />
          <EditorDialog
            title={title}
            content={
              <EditorContent
                {...editorContentProps}
                extensions={dialogExtensions}
              />
            }
          >
            <EditorDialogButton />
          </EditorDialog>
        </EditorDialogControl>
      )}
    </div>
  );
});

CodeEditor.displayName = "CodeEditor";
