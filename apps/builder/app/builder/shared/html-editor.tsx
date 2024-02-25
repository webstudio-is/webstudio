import { forwardRef, useMemo, type ReactNode } from "react";
import {
  keymap,
  drawSelection,
  dropCursor,
  tooltips,
  highlightSpecialChars,
  highlightActiveLine,
} from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import {
  bracketMatching,
  defaultHighlightStyle,
  indentOnInput,
  syntaxHighlighting,
} from "@codemirror/language";
import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
} from "@codemirror/autocomplete";
import { html } from "@codemirror/lang-html";
import { theme, textVariants, css } from "@webstudio-is/design-system";
import { CodeEditor } from "./code-editor";

const autocompletionStyle = css({
  "&.cm-tooltip.cm-tooltip-autocomplete": {
    ...textVariants.mono,
    border: "none",
    backgroundColor: "transparent",
    "& ul": {
      minWidth: 160,
      maxWidth: 260,
      width: "max-content",
      boxSizing: "border-box",
      borderRadius: theme.borderRadius[6],
      backgroundColor: theme.colors.backgroundMenu,
      border: `1px solid ${theme.colors.borderMain}`,
      boxShadow: `${theme.shadows.menuDropShadow}, inset 0 0 0 1px ${theme.colors.borderMenuInner}`,
      padding: theme.spacing[3],
      "& li": {
        ...textVariants.labelsTitleCase,
        textTransform: "none",
        position: "relative",
        display: "flex",
        alignItems: "center",
        color: theme.colors.foregroundMain,
        padding: theme.spacing[3],
        borderRadius: theme.borderRadius[3],
        "&[aria-selected]": {
          color: theme.colors.foregroundMain,
          backgroundColor: theme.colors.backgroundItemMenuItemHover,
        },
        "& .cm-completionLabel": {
          flexGrow: 1,
        },
        "& .cm-completionDetail": {
          overflow: "hidden",
          textOverflow: "ellipsis",
          fontStyle: "normal",
          color: theme.colors.hint,
        },
      },
    },
  },
});

const wrapperStyle = css({
  position: "relative",
  "& .cm-content": {
    // 1 line is 16px
    // set min 10 lines and max 20 lines
    minHeight: 160,
    maxHeight: 320,
  },
  "&:hover": {
    "--ws-code-editor-dialog-maximize-icon-display": "block",
  },
});

export const HtmlEditor = forwardRef<
  HTMLDivElement,
  {
    readOnly?: boolean;
    invalid?: boolean;
    value: string;
    title?: ReactNode;
    onChange: (newValue: string) => void;
    onBlur?: (event: FocusEvent) => void;
  }
>(
  (
    { readOnly = false, invalid = false, value, title, onChange, onBlur },
    ref
  ) => {
    const extensions = useMemo(
      () => [
        highlightActiveLine(),
        highlightSpecialChars(),
        history(),
        drawSelection(),
        dropCursor(),
        indentOnInput(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        html({}),
        bracketMatching(),
        closeBrackets(),
        // render autocomplete in body
        // to prevent popover scroll overflow
        tooltips({ parent: document.body }),
        autocompletion({
          icons: false,
          tooltipClass: () => autocompletionStyle.toString(),
        }),
        keymap.of([
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...historyKeymap,
          ...completionKeymap,
        ]),
      ],
      []
    );

    return (
      <div className={wrapperStyle()} ref={ref}>
        <CodeEditor
          extensions={extensions}
          readOnly={readOnly}
          invalid={invalid}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
        />
      </div>
    );
  }
);

HtmlEditor.displayName = "HtmlEditor";
