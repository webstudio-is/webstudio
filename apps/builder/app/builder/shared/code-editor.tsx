import {
  forwardRef,
  useMemo,
  type ComponentProps,
  useEffect,
  type ReactNode,
} from "react";
import { styleTags, tags } from "@lezer/highlight";
import {
  keymap,
  tooltips,
  highlightSpecialChars,
  highlightActiveLine,
} from "@codemirror/view";
import { bracketMatching, indentOnInput } from "@codemirror/language";
import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
} from "@codemirror/autocomplete";
import { html } from "@codemirror/lang-html";
import { markdown } from "@codemirror/lang-markdown";
import { css } from "@webstudio-is/design-system";
import {
  EditorContent,
  EditorDialog,
  EditorDialogButton,
  EditorDialogControl,
  getMinMaxHeightVars,
} from "./code-editor-base";

const wrapperStyle = css({
  position: "relative",
  // 1 line is 16px
  // set min 10 lines and max 20 lines
  ...getMinMaxHeightVars({ minHeight: "160px", maxHeight: "320px" }),
});

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

export const CodeEditor = forwardRef<
  HTMLDivElement,
  Omit<ComponentProps<typeof EditorContent>, "extensions"> & {
    lang?: "html" | "markdown";
    title?: ReactNode;
  }
>(({ lang, title, ...editorContentProps }, ref) => {
  const extensions = useMemo(() => {
    if (lang === "html") {
      return getHtmlExtensions();
    }
    if (lang === "markdown") {
      return getMarkdownExtensions();
    }
    return [];
  }, [lang]);

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
  const content = (
    <EditorContent {...editorContentProps} extensions={extensions} />
  );
  return (
    <div className={wrapperStyle()} ref={ref}>
      <EditorDialogControl>
        {content}
        <EditorDialog title={title} content={content}>
          <EditorDialogButton />
        </EditorDialog>
      </EditorDialogControl>
    </div>
  );
});

CodeEditor.displayName = "CodeEditor";
