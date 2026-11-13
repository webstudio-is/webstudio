import {
  useEffect,
  useRef,
  type ReactNode,
  forwardRef,
  type ComponentProps,
  type RefObject,
  useImperativeHandle,
} from "react";
import {
  Annotation,
  Compartment,
  EditorSelection,
  EditorState,
  StateEffect,
  Transaction,
  type Extension,
} from "@codemirror/state";
import {
  EditorView,
  drawSelection,
  dropCursor,
  lineNumbers,
  keymap,
} from "@codemirror/view";
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
import { foldGutter, syntaxHighlighting } from "@codemirror/language";
import {
  theme,
  textVariants,
  css,
  cssVar,
  selectedItemBackground,
  declareCssVar,
  IconButton,
  Grid,
  Flex,
  rawTheme,
  Kbd,
  Text,
  FloatingPanel,
  PanelContent,
} from "@webstudio-is/design-system";
import { MaximizeIcon } from "@webstudio-is/icons";
import { ChevronDownIcon, ChevronRightIcon } from "@webstudio-is/icons/svg";
import { codeHighlightStyle } from "./code-highlight";

// This undocumented flag is required to keep contenteditable fields editable after the first activation of EditorView.
// To reproduce the issue, open any Binding dialog and then try to edit a Navigation Item in the Navigation menu.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
EditorView.EDIT_CONTEXT = false;

export const ExternalChange = Annotation.define<boolean>();

const minHeightVar = declareCssVar("--code-editor-min-height");
const maxHeightVar = declareCssVar("--code-editor-max-height");
const maximizeIconVisibilityVar = declareCssVar(
  "--code-editor-maximize-icon-visibility"
);

export const clampEditorSelection = (
  selection: EditorSelection,
  length: number
) => {
  return EditorSelection.create(
    selection.ranges.map((range) =>
      EditorSelection.range(
        Math.min(range.anchor, length),
        Math.min(range.head, length)
      )
    ),
    selection.mainIndex
  );
};

export const normalizeEditorValue = (value: undefined | string) => value ?? "";

export const getCodeEditorCssVars = ({
  minHeight,
  maxHeight,
}: {
  minHeight: string;
  maxHeight: string;
}) => ({
  [minHeightVar]: minHeight,
  [maxHeightVar]: maxHeight,
});

const editorContentStyle = css({
  ...textVariants.mono,
  // fit editor into parent if stretched
  display: "flex",
  position: "relative",
  minHeight: 0,
  boxSizing: "border-box",
  color: cssVar("--foreground-primary"),
  borderRadius: theme.borderRadius[4],
  border: `1px solid transparent`,
  background: cssVar("--background-secondary"),
  paddingTop: 4,
  paddingBottom: 2,
  paddingRight: theme.spacing[2],
  paddingLeft: theme.spacing[3],
  // required to support copying selected text
  userSelect: "text",
  "&:hover": {
    borderColor: cssVar("--border-default"),
  },
  "&:focus-within": {
    borderColor: cssVar("--border-focus"),
  },
  '&[data-chromeless="true"]': {
    borderRadius: 0,
  },
  '&[data-chromeless="true"]:not([data-invalid="true"]):is(:hover, :focus-within)':
    {
      borderColor: "transparent",
    },
  '&[data-invalid="true"]': {
    borderColor: cssVar("--border-negative"),
    outlineColor: cssVar("--border-negative"),
  },
  "[data-editor-dialog-content] &": {
    background: "transparent",
    borderWidth: 0,
    padding: 0,
  },
  "& .cm-focused": {
    outline: "none",
  },
  "& .cm-cursor, & .cm-dropCursor": {
    borderLeftColor: "currentColor",
  },
  "& .cm-cursor": {
    marginLeft: 0,
  },
  "& .cm-activeLine": {
    backgroundColor: cssVar("--overlay-interaction-hover"),
  },
  "& .cm-selectionBackground, & .cm-content ::selection": {
    backgroundColor: `${cssVar("--background-text-selection")} !important`,
  },
  "& .cm-content ::selection": {
    color: `${cssVar("--foreground-on-text-selection")} !important`,
  },
  // fix scrolls appear on mount
  "& .cm-scroller": {
    overflowX: "hidden",
  },
  "& .cm-content": {
    padding: 0,
    // makes sure you can click to focus when editor content is smaller than the container
    minHeight: "100%",
  },
  "& .cm-line": {
    padding: 0,
  },
  "& .cm-editor": {
    width: "100%",
    // avoid modifying height in .cm-content
    // because it breaks scroll events and makes scrolling laggy
    minHeight: cssVar(minHeightVar, "auto"),
    maxHeight: cssVar(maxHeightVar, "none"),
  },
  "fieldset[disabled] & .cm-editor": {
    opacity: 0.3,
  },
  ".cm-lintRange-error": {
    textDecoration: `underline wavy ${cssVar("--foreground-negative")}`,
    backgroundColor: cssVar("--background-negative-subtle"),
  },
  ".cm-lintRange-warning": {
    textDecoration: `underline wavy ${cssVar("--foreground-warning")}`,
    backgroundColor: cssVar("--background-warning-subtle"),
  },
  ".cm-gutters": {
    backgroundColor: "transparent",
    border: 0,
  },
});

const shortcutStyle = css({
  position: "absolute",
  left: 0,
  bottom: 0,
  width: "100%",
  paddingInline: theme.spacing[3],
  background: `oklch(from ${cssVar("--background-primary")} l c h / 50%)`,
  "[data-editor-dialog-content] &": {
    background: `oklch(from ${cssVar("--background-floating")} l c h / 50%)`,
  },
  zIndex: 1,
  pointerEvents: "none",
});

const autocompletionTooltipTheme = EditorView.theme({
  ".cm-tooltip.cm-tooltip-autocomplete": {
    ...textVariants.mono,
    display: "flex",
    flexDirection: "column",
    width: "max-content",
    minWidth: "160px",
    maxWidth: "260px",
    boxSizing: "border-box",
    borderRadius: rawTheme.borderRadius[6],
    border: `1px solid ${cssVar("--border-default")}`,
    backgroundColor: cssVar("--background-primary"),
    boxShadow: rawTheme.shadows.menuDropShadow,
    padding: `${rawTheme.spacing[3]} 0`,
    // override none set on body by radix popover
    pointerEvents: "auto",
  },
  ".cm-tooltip.cm-tooltip-autocomplete ul": {
    width: "100%",
    boxSizing: "border-box",
    maxHeight: rawTheme.spacing[34],
    padding: 0,
    order: 1,
  },
  ".cm-tooltip.cm-tooltip-autocomplete ul li": {
    ...textVariants.labels,
    textTransform: "none",
    position: "relative",
    display: "flex",
    alignItems: "center",
    color: cssVar("--foreground-primary"),
    marginInline: rawTheme.spacing[3],
    padding: rawTheme.spacing[3],
    paddingLeft: rawTheme.spacing[11],
    borderRadius: rawTheme.borderRadius[3],
  },
  ".cm-tooltip.cm-tooltip-autocomplete li:hover": {
    color: cssVar("--foreground-primary"),
    backgroundColor: cssVar("--overlay-interaction-hover"),
  },
  '.cm-tooltip.cm-tooltip-autocomplete li[aria-selected="true"]': {
    backgroundColor: selectedItemBackground,
  },
  ".cm-tooltip.cm-tooltip-autocomplete .cm-completionLabel": {
    flexGrow: 1,
  },
  ".cm-tooltip.cm-tooltip-autocomplete .cm-completionDetail": {
    overflow: "hidden",
    textOverflow: "ellipsis",
    fontStyle: "normal",
    color: cssVar("--foreground-secondary"),
  },
  ".cm-tooltip.cm-completionInfo": {
    position: "static",
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
    border: "none",
    borderTop: `1px solid ${cssVar("--border-default")}`,
    backgroundColor: "transparent",
    boxShadow: "none",
    order: 2,
    padding: 0,
    whiteSpace: "normal",
  },
  ".cm-tooltip.cm-completionInfo.cm-completionInfo-above": {
    borderTop: "none",
    borderBottom: `1px solid ${cssVar("--border-default")}`,
    order: 0,
  },
});

const keyBindings = [
  ...defaultKeymap.filter((binding) => {
    // We are redefining it later and CodeMirror won't take an override
    return binding.key !== "Mod-Enter";
  }),
  ...historyKeymap,
  indentWithTab,
];

export const foldGutterExtension = foldGutter({
  markerDOM: (isOpen) => {
    const div = document.createElement("div");
    div.style.width = "16px";
    div.style.height = "16px";
    div.style.cursor = "pointer";
    div.innerHTML = isOpen ? ChevronDownIcon : ChevronRightIcon;
    return div;
  },
});

export const linterTooltipTheme = EditorView.theme({
  ".cm-tooltip:has(.cm-tooltip-lint)": {
    backgroundColor: "transparent",
    borderWidth: 0,
    paddingTop: rawTheme.spacing[5],
    paddingBottom: rawTheme.spacing[5],
    pointerEvents: "none",
  },
  ".cm-tooltip-lint": {
    backgroundColor: cssVar("--background-inverse"),
    color: cssVar("--foreground-on-inverse"),
    borderRadius: rawTheme.borderRadius[7],
    padding: rawTheme.spacing[5],
  },
  ".cm-tooltip-lint .cm-diagnostic": {
    borderWidth: 0,
    padding: 0,
    margin: 0,
    ...textVariants.regular,
  },
});

export type EditorApi = {
  replaceSelection: (string: string) => void;
  insertTemplate: (template: {
    prefix: string;
    suffix?: string;
    placeholder: string;
  }) => void;
  focus: () => void;
};

export const getTemplateInsertion = ({
  from,
  selectedText,
  prefix,
  suffix = "",
  placeholder,
}: {
  from: number;
  selectedText: string;
  prefix: string;
  suffix?: string;
  placeholder: string;
}) => {
  const content = selectedText || placeholder;
  const selectionFrom = from + prefix.length;
  return {
    text: `${prefix}${content}${suffix}`,
    selection: EditorSelection.range(
      selectionFrom,
      selectionFrom + content.length
    ),
  };
};

type EditorContentProps = {
  editorApiRef?: RefObject<undefined | EditorApi>;
  ariaLabel?: string;
  extensions?: Extension[];
  readOnly?: boolean;
  autoFocus?: boolean;
  initialSelection?: number;
  invalid?: boolean;
  showShortcuts?: boolean;
  showLineNumbers?: boolean;
  chromeless?: boolean;
  resetHistoryOnExternalChange?: boolean;
  value?: string;
  onChange: (value: string) => void;
  onChangeComplete: (value: string, event?: FocusEvent) => void;
};

export const EditorContent = ({
  editorApiRef,
  ariaLabel,
  extensions = [],
  readOnly = false,
  autoFocus = false,
  initialSelection,
  invalid = false,
  showShortcuts = false,
  showLineNumbers = true,
  chromeless = false,
  resetHistoryOnExternalChange = false,
  value,
  onChange,
  onChangeComplete,
}: EditorContentProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<undefined | EditorView>(undefined);
  const historyCompartment = useRef(new Compartment());

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onChangeCompleteRef = useRef(onChangeComplete);
  onChangeCompleteRef.current = onChangeComplete;

  useEffect(() => {
    const abortController = new AbortController();

    document.addEventListener(
      // https://github.com/radix-ui/primitives/blob/dac4fd8ab0c1974020e316c865db258ab10d2279/packages/react/dismissable-layer/src/DismissableLayer.tsx#L14
      "dismissableLayer.pointerDownOutside",
      (event) => {
        if (
          event.target instanceof Element &&
          // Prevent radix dialogs and popups from closing when clicking on the editor's autocomplete items
          event.target.closest(".cm-tooltip.cm-tooltip-autocomplete")
        ) {
          event.preventDefault();
        }
      },
      {
        capture: true,
        signal: abortController.signal,
      }
    );
    return () => {
      abortController.abort();
    };
  }, []);

  // setup editor
  useEffect(() => {
    if (editorRef.current === null) {
      return;
    }
    const view = new EditorView({
      doc: "",
      parent: editorRef.current,
    });

    viewRef.current = view;
    return () => {
      view.destroy();
    };
  }, []);

  useEffect(() => {
    if (autoFocus) {
      viewRef.current?.focus();
    }
  }, [autoFocus]);

  // update extensions whenever variables data is changed

  useEffect(() => {
    const view = viewRef.current;
    if (view === undefined) {
      return;
    }
    const hasDisabledFieldset =
      editorRef.current?.closest("fieldset[disabled]");

    view.dispatch({
      effects: StateEffect.reconfigure.of([
        ...(showLineNumbers ? [lineNumbers()] : []),
        ...extensions,
        ...(hasDisabledFieldset ? [EditorView.editable.of(false)] : []),
        autocompletionTooltipTheme,
        historyCompartment.current.of(history()),
        drawSelection(),
        dropCursor(),
        syntaxHighlighting(codeHighlightStyle, { fallback: true }),
        keymap.of([
          ...keyBindings,
          {
            key: "Mod-Enter",
            run(view) {
              onChangeCompleteRef.current(view.state.doc.toString());
              return true;
            },
          },
          {
            key: "Mod-s",
            run(view) {
              onChangeCompleteRef.current(view.state.doc.toString());
              return true;
            },
          },
        ]),
        EditorView.lineWrapping,
        // Read-only editors must keep keyboard focus instead of leaving
        // destructive Builder shortcuts active after clicking their content.
        EditorView.contentAttributes.of({ tabindex: "0" }),
        ...(ariaLabel === undefined
          ? []
          : [EditorView.contentAttributes.of({ "aria-label": ariaLabel })]),
        EditorView.editable.of(readOnly === false),
        EditorState.readOnly.of(readOnly === true),
        // https://github.com/uiwjs/react-codemirror/blob/5d7a37245ce70e61f215b77dc42a7eaf295c46e7/core/src/useCodeMirror.ts#L57-L70
        EditorView.updateListener.of((update) => {
          if (
            // prevent invoking callback when focus or selection is changed
            update.docChanged &&
            // prevent invoking callback when the change came from react value
            update.transactions.some((trx) =>
              trx.annotation(ExternalChange)
            ) === false
          ) {
            onChangeRef.current(update.state.doc.toString());
          }
        }),
        EditorView.domEventHandlers({
          blur(event) {
            onChangeCompleteRef.current(view.state.doc.toString(), event);
          },
          cut(event) {
            // prevent catching cut by global copy paste
            // with target outside of contenteditable
            event.stopPropagation();
          },
        }),
      ]),
    });
  }, [ariaLabel, readOnly, extensions, showLineNumbers]);

  // update editor with react value
  // https://github.com/uiwjs/react-codemirror/blob/5d7a37245ce70e61f215b77dc42a7eaf295c46e7/core/src/useCodeMirror.ts#L158-L169
  useEffect(() => {
    const view = viewRef.current;
    if (view === undefined) {
      return;
    }
    const nextValue = normalizeEditorValue(value);
    // prevent updating when editor has the same state
    // and can be the source of new value
    if (nextValue === view.state.doc.toString()) {
      return;
    }

    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: nextValue },
      selection: clampEditorSelection(view.state.selection, nextValue.length),
      annotations: [
        ExternalChange.of(true),
        ...(resetHistoryOnExternalChange
          ? [Transaction.addToHistory.of(false)]
          : []),
      ],
    });
    if (resetHistoryOnExternalChange) {
      // A full replacement changes declaration offsets, so old undo events cannot be mapped safely.
      view.dispatch({ effects: historyCompartment.current.reconfigure([]) });
      view.dispatch({
        effects: historyCompartment.current.reconfigure(history()),
      });
    }
  }, [value, resetHistoryOnExternalChange]);

  useEffect(() => {
    if (initialSelection !== undefined) {
      const view = viewRef.current;
      if (view !== undefined) {
        view.dispatch({
          selection: {
            anchor: Math.min(initialSelection, view.state.doc.length),
          },
        });
      }
    }
  }, [initialSelection]);

  useImperativeHandle(editorApiRef, () => ({
    replaceSelection: (string) => {
      const view = viewRef.current;
      if (view === undefined) {
        return;
      }

      view.dispatch(view.state.replaceSelection(string));
      view.focus();
    },
    insertTemplate({ prefix, suffix, placeholder }) {
      const view = viewRef.current;
      if (view === undefined) {
        return;
      }
      const { from, to } = view.state.selection.main;
      const insertion = getTemplateInsertion({
        from,
        selectedText: view.state.doc.sliceString(from, to),
        prefix,
        suffix,
        placeholder,
      });
      view.dispatch({
        changes: { from, to, insert: insertion.text },
        selection: insertion.selection,
      });
      view.focus();
    },
    focus() {
      viewRef.current?.focus();
    },
  }));

  return (
    <div
      className={editorContentStyle()}
      data-invalid={invalid}
      data-chromeless={chromeless ? "true" : undefined}
      ref={editorRef}
    >
      {showShortcuts && (
        <Flex align="center" justify="end" gap="1" className={shortcutStyle()}>
          <Text variant="small">Submit</Text>
          <Kbd value={["meta", "enter"]} />
        </Flex>
      )}
    </div>
  );
};

const editorDialogControlStyle = css({
  position: "relative",
  "&:hover, &:focus-within": {
    [maximizeIconVisibilityVar]: "visible",
  },
});

export const EditorDialogControl = ({ children }: { children: ReactNode }) => {
  return <div className={editorDialogControlStyle()}>{children}</div>;
};

export const EditorDialogButton = forwardRef<
  HTMLButtonElement,
  ComponentProps<typeof IconButton>
>((props, ref) => {
  return (
    <IconButton
      type="button"
      {...props}
      ref={ref}
      css={{
        position: "absolute",
        top: 4,
        right: 4,
        visibility: cssVar(maximizeIconVisibilityVar, "hidden"),
      }}
    >
      <MaximizeIcon />
    </IconButton>
  );
});
EditorDialogButton.displayName = "EditorDialogButton";

export const EditorDialog = ({
  content,
  children,
  placement = "center",
  width = 640,
  height = 480,
  contentPadding = true,
  ...panelProps
}: {
  title: ReactNode;
  titleSuffix?: ReactNode;
  content: ReactNode;
  children?: ReactNode;
  width?: number;
  height?: number;
  contentPadding?: boolean;
  placement?: ComponentProps<typeof FloatingPanel>["placement"];
  resize?: ComponentProps<typeof FloatingPanel>["resize"];
  open?: boolean;
  modal?: boolean;
  onOpenChange?: (newOpen: boolean) => void;
}) => {
  return (
    <FloatingPanel
      {...panelProps}
      width={width}
      height={height}
      placement={placement}
      maximizable
      resize="both"
      content={
        <PanelContent
          data-editor-dialog-content
          as={Grid}
          align="stretch"
          css={{
            padding: contentPadding ? undefined : 0,
            height: "100%",
            overflow: "auto",
            boxSizing: "border-box",
          }}
        >
          {content}
        </PanelContent>
      }
    >
      {children}
    </FloatingPanel>
  );
};
