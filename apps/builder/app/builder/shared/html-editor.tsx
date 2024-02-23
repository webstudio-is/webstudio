import { forwardRef, useMemo, type ReactNode, useState } from "react";
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
import {
  theme,
  textVariants,
  css,
  Dialog,
  DialogContent,
  SmallIconButton,
  DialogTrigger,
  DialogTitle,
  Button,
  DialogClose,
  Grid,
  rawTheme,
} from "@webstudio-is/design-system";
import { CodeEditor } from "./code-editor";
import { CrossIcon, MaximizeIcon, MinimizeIcon } from "@webstudio-is/icons";

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

    const editor = (
      <CodeEditor
        extensions={extensions}
        readOnly={readOnly}
        invalid={invalid}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
      />
    );

    return (
      <div className={wrapperStyle.toString()} ref={ref}>
        {editor}
        <CodeEditorDialog title={title} content={editor}>
          <SmallIconButton
            icon={<MaximizeIcon />}
            css={{
              position: "absolute",
              top: 2,
              right: 2,
              display: `var(--ws-code-editor-dialog-maximize-icon-display, none)`,
            }}
          />
        </CodeEditorDialog>
      </div>
    );
  }
);

HtmlEditor.displayName = "HtmlEditor";

const CodeEditorDialog = ({
  title,
  content,
  children,
}: {
  title: ReactNode;
  content: ReactNode;
  children: ReactNode;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const width = isExpanded ? "80vw" : "640px";
  const height = isExpanded ? "80vh" : "480px";
  const padding = rawTheme.spacing[7];

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        // Left Aside panels (e.g., Pages, Components) use zIndex: theme.zIndices[1].
        // For a dialog to appear above these panels, both overlay and content should also have zIndex: theme.zIndices[1].
        css={{
          maxWidth: "none",
          maxHeight: "none",
          zIndex: theme.zIndices[1],
        }}
        overlayCss={{ zIndex: theme.zIndices[1] }}
      >
        <Grid
          css={{
            padding,
            width,
            height,
            overflow: "hidden",
            boxSizing: "content-box",
            "& .cm-content": {
              maxHeight: `calc(${height} - ${padding})`,
            },
          }}
        >
          {content}
        </Grid>
        {/* Title is at the end intentionally,
         * to make the close button last in the tab order
         */}
        <DialogTitle
          suffix={
            <>
              <Button
                color="ghost"
                prefix={isExpanded ? <MinimizeIcon /> : <MaximizeIcon />}
                aria-label="Expand"
                onClick={() => {
                  setIsExpanded(isExpanded ? false : true);
                }}
              />
              <DialogClose asChild>
                <Button
                  color="ghost"
                  prefix={<CrossIcon />}
                  aria-label="Close"
                />
              </DialogClose>
            </>
          }
        >
          {title}
        </DialogTitle>
      </DialogContent>
    </Dialog>
  );
};
