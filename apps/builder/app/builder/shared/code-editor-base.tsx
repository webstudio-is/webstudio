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
  EditorState,
  StateEffect,
  type Extension,
} from "@codemirror/state";
import {
  EditorView,
  drawSelection,
  dropCursor,
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
  SmallIconButton,
  Grid,
  Flex,
  rawTheme,
  globalCss,
  Kbd,
  Text,
  FloatingPanel,
} from "@webstudio-is/design-system";
import { MaximizeIcon } from "@webstudio-is/icons";
import { ChevronDownIcon, ChevronRightIcon } from "@webstudio-is/icons/svg";
import { solarizedLight } from "./code-highlight";

// This undocumented flag is required to keep contenteditable fields editable after the first activation of EditorView.
// To reproduce the issue, open any Binding dialog and then try to edit a Navigation Item in the Navigation menu.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
EditorView.EDIT_CONTEXT = false;

const ExternalChange = Annotation.define<boolean>();

const minHeightVar = "--ws-code-editor-min-height";
const maxHeightVar = "--ws-code-editor-max-height";
const maximizeIconVisibilityVar = "--ws-code-editor-maximize-icon-visibility";

export const getMinMaxHeightVars = ({
  minHeight,
  maxHeight,
}: {
  minHeight: string;
  maxHeight: string;
}) => ({
  [minHeightVar]: minHeight,
  [maxHeightVar]: maxHeight,
});

const globalStyles = globalCss({
  "fieldset[disabled] .cm-editor": {
    opacity: 0.3,
  },
});

const editorContentStyle = css({
  ...textVariants.mono,
  // fit editor into parent if stretched
  display: "flex",
  position: "relative",
  minHeight: 0,
  boxSizing: "border-box",
  color: theme.colors.foregroundMain,
  borderRadius: theme.borderRadius[4],
  border: `1px solid ${theme.colors.borderMain}`,
  background: theme.colors.backgroundControls,
  paddingTop: 4,
  paddingBottom: 2,
  paddingRight: theme.spacing[2],
  paddingLeft: theme.spacing[3],
  // required to support copying selected text
  userSelect: "text",
  "&:focus-within": {
    borderColor: theme.colors.borderFocus,
  },
  '&[data-invalid="true"]': {
    borderColor: theme.colors.borderDestructiveMain,
    outlineColor: theme.colors.borderDestructiveMain,
  },
  "& .cm-focused": {
    outline: "none",
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
    minHeight: `var(${minHeightVar}, auto)`,
    maxHeight: `var(${maxHeightVar}, none)`,
  },
  ".cm-lintRange-error": {
    textDecoration: "underline wavy red",
    backgroundColor: "rgba(255, 0, 0, 0.1)",
  },
  ".cm-lintRange-warning": {
    textDecoration: "underline wavy orange",
    backgroundColor: "rgba(255, 0, 0, 0.1)",
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
  background: "oklch(100% 0 0 / 50%)",
  zIndex: 1,
  pointerEvents: "none",
});

const autocompletionTooltipTheme = EditorView.theme({
  ".cm-tooltip.cm-tooltip-autocomplete": {
    ...textVariants.mono,
    border: "none",
    backgroundColor: "transparent",
    // override none set on body by radix popover
    pointerEvents: "auto",
  },
  ".cm-tooltip.cm-tooltip-autocomplete ul": {
    minWidth: "160px",
    maxWidth: "260px",
    width: "max-content",
    boxSizing: "border-box",
    borderRadius: rawTheme.borderRadius[6],
    backgroundColor: rawTheme.colors.backgroundMenu,
    border: `1px solid ${rawTheme.colors.borderMain}`,
    boxShadow: `${rawTheme.shadows.menuDropShadow}, inset 0 0 0 1px ${rawTheme.colors.borderMenuInner}`,
    padding: rawTheme.spacing[3],
  },
  ".cm-tooltip.cm-tooltip-autocomplete ul li": {
    ...textVariants.labelsTitleCase,
    textTransform: "none",
    position: "relative",
    display: "flex",
    alignItems: "center",
    color: rawTheme.colors.foregroundMain,
    padding: rawTheme.spacing[3],
    borderRadius: rawTheme.borderRadius[3],
  },
  ".cm-tooltip.cm-tooltip-autocomplete li[aria-selected], .cm-tooltip.cm-tooltip-autocomplete li:hover":
    {
      color: rawTheme.colors.foregroundMain,
      backgroundColor: rawTheme.colors.backgroundItemMenuItemHover,
    },
  ".cm-tooltip.cm-tooltip-autocomplete .cm-completionLabel": {
    flexGrow: 1,
  },
  ".cm-tooltip.cm-tooltip-autocomplete .cm-completionDetail": {
    overflow: "hidden",
    textOverflow: "ellipsis",
    fontStyle: "normal",
    color: rawTheme.colors.foregroundSubtle,
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

export type EditorApi = {
  replaceSelection: (string: string) => void;
  focus: () => void;
};

type EditorContentProps = {
  editorApiRef?: RefObject<undefined | EditorApi>;
  extensions?: Extension[];
  readOnly?: boolean;
  autoFocus?: boolean;
  invalid?: boolean;
  showShortcuts?: boolean;
  value: string;
  onChange: (value: string) => void;
  onChangeComplete: (value: string) => void;
};

export const EditorContent = ({
  editorApiRef,
  extensions = [],
  readOnly = false,
  autoFocus = false,
  invalid = false,
  showShortcuts = false,
  value,
  onChange,
  onChangeComplete,
}: EditorContentProps) => {
  globalStyles();

  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<undefined | EditorView>(undefined);

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
        ...extensions,
        ...(hasDisabledFieldset ? [EditorView.editable.of(false)] : []),
        autocompletionTooltipTheme,
        history(),
        drawSelection(),
        dropCursor(),
        syntaxHighlighting(solarizedLight, { fallback: true }),
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
          blur() {
            onChangeCompleteRef.current(view.state.doc.toString());
          },
          cut(event) {
            // prevent catching cut by global copy paste
            // with target outside of contenteditable
            event.stopPropagation();
          },
        }),
      ]),
    });
  }, [readOnly, extensions]);

  // update editor with react value
  // https://github.com/uiwjs/react-codemirror/blob/5d7a37245ce70e61f215b77dc42a7eaf295c46e7/core/src/useCodeMirror.ts#L158-L169
  useEffect(() => {
    const view = viewRef.current;
    if (view === undefined) {
      return;
    }
    // prevent updating when editor has the same state
    // and can be the source of new value
    if (value === view.state.doc.toString()) {
      return;
    }

    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: value },
      annotations: [ExternalChange.of(true)],
    });
  }, [value]);

  useImperativeHandle(editorApiRef, () => ({
    replaceSelection: (string) => {
      const view = viewRef.current;
      if (view === undefined) {
        return;
      }

      view.dispatch(view.state.replaceSelection(string));
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
      ref={editorRef}
    >
      {showShortcuts && (
        <Flex align="center" justify="end" gap="1" className={shortcutStyle()}>
          <Text variant="small">Submit</Text>
          <Kbd value={["cmd", "enter"]} />
        </Flex>
      )}
    </div>
  );
};

const editorDialogControlStyle = css({
  position: "relative",
  "&:hover": {
    [maximizeIconVisibilityVar]: "visible",
  },
});

export const EditorDialogControl = ({ children }: { children: ReactNode }) => {
  return <div className={editorDialogControlStyle()}>{children}</div>;
};

export const EditorDialogButton = forwardRef<
  HTMLButtonElement,
  Partial<ComponentProps<typeof SmallIconButton>>
>((props, ref) => {
  return (
    <SmallIconButton
      {...props}
      ref={ref}
      icon={<MaximizeIcon />}
      css={{
        position: "absolute",
        top: 4,
        right: 4,
        visibility: `var(${maximizeIconVisibilityVar}, hidden)`,
        background: "oklch(100% 0 0 / 50%)",
      }}
    />
  );
});
EditorDialogButton.displayName = "EditorDialogButton";

export const EditorDialog = ({
  content,
  children,
  placement = "center",
  width = 640,
  height = 480,
  ...panelProps
}: {
  title: ReactNode;
  content: ReactNode;
  children: ReactNode;
  width?: number;
  height?: number;
  placement?: ComponentProps<typeof FloatingPanel>["placement"];
  resize?: ComponentProps<typeof FloatingPanel>["resize"];
  open?: boolean;
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
        <Grid
          align="stretch"
          css={{
            padding: theme.panel.padding,
            height: "100%",
            overflow: "hidden",
            boxSizing: "content-box",
          }}
        >
          {content}
        </Grid>
      }
    >
      {children}
    </FloatingPanel>
  );
};
