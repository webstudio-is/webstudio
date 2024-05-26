import {
  useEffect,
  useRef,
  type ReactNode,
  useState,
  forwardRef,
  type ComponentProps,
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
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";
import {
  theme,
  textVariants,
  css,
  SmallIconButton,
  Dialog,
  DialogTrigger,
  DialogContent,
  Grid,
  DialogTitle,
  Button,
  DialogClose,
  Flex,
} from "@webstudio-is/design-system";
import { CrossIcon, MaximizeIcon, MinimizeIcon } from "@webstudio-is/icons";

const ExternalChange = Annotation.define<boolean>();

const minHeightVar = "--ws-code-editor-min-height";
const maxHeightVar = "--ws-code-editor-max-height";

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

const editorContentStyle = css({
  ...textVariants.mono,
  // fit editor into parent if stretched
  display: "flex",
  minHeight: 0,
  boxSizing: "border-box",
  color: theme.colors.foregroundMain,
  borderRadius: theme.borderRadius[4],
  border: `1px solid ${theme.colors.borderMain}`,
  background: theme.colors.backgroundControls,
  paddingTop: 6,
  paddingBottom: 4,
  paddingRight: theme.spacing[2],
  paddingLeft: theme.spacing[3],
  // required to support copying selected text
  userSelect: "text",
  "&:focus-within": {
    borderColor: theme.colors.borderFocus,
    outline: `1px solid ${theme.colors.borderFocus}`,
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
});

// https://thememirror.net/clouds
const highlightStyle = HighlightStyle.define([
  {
    tag: tags.comment,
    color: "#BCC8BA",
  },
  {
    tag: [tags.string, tags.special(tags.brace), tags.regexp],
    color: "#5D90CD",
  },
  {
    tag: [tags.number, tags.bool, tags.null],
    color: "#46A609",
  },
  {
    tag: tags.keyword,
    color: "#AF956F",
  },
  {
    tag: [tags.definitionKeyword, tags.modifier],
    color: "#C52727",
  },
  {
    tag: [tags.angleBracket, tags.tagName, tags.attributeName],
    color: "#606060",
  },
  {
    tag: tags.self,
    color: "#000",
  },
]);

type EditorContentProps = {
  extensions?: Extension[];
  readOnly?: boolean;
  autoFocus?: boolean;
  invalid?: boolean;
  value: string;
  onChange: (newValue: string) => void;
  onBlur?: (event: FocusEvent) => void;
};

export const EditorContent = ({
  extensions = [],
  readOnly = false,
  autoFocus = false,
  invalid = false,
  value,
  onChange,
  onBlur,
}: EditorContentProps) => {
  const editorRef = useRef<null | HTMLDivElement>(null);
  const viewRef = useRef<undefined | EditorView>();

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onBlurRef = useRef(onBlur);
  onBlurRef.current = onBlur;

  // setup editor

  useEffect(() => {
    if (editorRef.current === null) {
      return;
    }
    const view = new EditorView({
      doc: "",
      parent: editorRef.current,
    });
    if (autoFocus) {
      view.focus();
    }
    viewRef.current = view;
    return () => {
      view.destroy();
    };
  }, [autoFocus]);

  // update extensions whenever variables data is changed

  useEffect(() => {
    const view = viewRef.current;
    if (view === undefined) {
      return;
    }
    view.dispatch({
      effects: StateEffect.reconfigure.of([
        ...extensions,
        history(),
        drawSelection(),
        dropCursor(),
        syntaxHighlighting(highlightStyle, { fallback: true }),
        keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
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
          blur(event) {
            onBlurRef.current?.(event);
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

  return (
    <div
      className={editorContentStyle()}
      data-invalid={invalid}
      ref={editorRef}
    />
  );
};

const editorDialogControlStyle = css({
  position: "relative",
  "&:hover": {
    "--ws-code-editor-maximize-icon-visibility": "visible",
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
        top: 6,
        right: 4,
        visibility: `var(--ws-code-editor-maximize-icon-visibility, hidden)`,
      }}
    />
  );
});
EditorDialogButton.displayName = "EditorDialogButton";

export const EditorDialog = ({
  open,
  onOpenChange,
  title,
  content,
  children,
}: {
  open?: boolean;
  onOpenChange?: (newOpen: boolean) => void;
  title?: ReactNode;
  content: ReactNode;
  children: ReactNode;
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={false}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        resize="auto"
        width={640}
        height={480}
        minHeight={240}
        isMaximized={isMaximized}
        onInteractOutside={(event) => {
          event.preventDefault();
        }}
      >
        <Grid
          align="stretch"
          css={{
            padding: theme.spacing[7],
            height: "100%",
            overflow: "hidden",
            boxSizing: "content-box",
          }}
        >
          {content}
        </Grid>
        {/* Title is at the end intentionally,
         * to make the close button last in the tab order
         */}
        <DialogTitle
          draggable
          suffix={
            <Flex
              gap="1"
              onMouseDown={(event) => {
                // Prevent dragging dialog
                event.preventDefault();
              }}
            >
              <Button
                color="ghost"
                prefix={isMaximized ? <MinimizeIcon /> : <MaximizeIcon />}
                aria-label="Expand"
                onClick={() => setIsMaximized(isMaximized ? false : true)}
              />
              <DialogClose asChild>
                <Button
                  color="ghost"
                  prefix={<CrossIcon />}
                  aria-label="Close"
                />
              </DialogClose>
            </Flex>
          }
        >
          {title}
        </DialogTitle>
      </DialogContent>
    </Dialog>
  );
};

export const CodeEditorBase = ({
  title,
  open,
  onOpenChange,
  ...editorContentProps
}: EditorContentProps & {
  title?: ReactNode;
  open?: boolean;
  onOpenChange?: (newOpen: boolean) => void;
}) => {
  const content = <EditorContent {...editorContentProps} />;
  return (
    <EditorDialogControl>
      {content}
      <EditorDialog
        open={open}
        onOpenChange={onOpenChange}
        title={title}
        content={content}
      >
        <EditorDialogButton />
      </EditorDialog>
    </EditorDialogControl>
  );
};
