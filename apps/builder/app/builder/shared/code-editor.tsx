import { useEffect, useRef, type ReactNode, useState } from "react";
import {
  Annotation,
  EditorState,
  StateEffect,
  type Extension,
} from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import {
  theme,
  textVariants,
  css,
  SmallIconButton,
  rawTheme,
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
    minHeight: "var(--ws-code-editor-min-height, auto)",
    maxHeight: "var(--ws-code-editor-max-height, none)",
  },
});

type EditorContentProps = {
  extensions: Extension[];
  readOnly?: boolean;
  autoFocus?: boolean;
  invalid?: boolean;
  value: string;
  onChange: (newValue: string) => void;
  onBlur?: (event: FocusEvent) => void;
};

const EditorContent = ({
  extensions,
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

export const EditorDialog = ({
  title,
  children,
}: {
  title?: ReactNode;
  children: ReactNode;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const width = isExpanded ? "80vw" : "640px";
  const height = isExpanded ? "80vh" : "480px";
  const padding = rawTheme.spacing[7];
  return (
    <Dialog>
      <DialogTrigger asChild>
        <SmallIconButton
          icon={<MaximizeIcon />}
          css={{
            position: "absolute",
            top: 6,
            right: 4,
            visibility: `var(--ws-code-editor-maximize-icon-visibility, hidden)`,
          }}
        />
      </DialogTrigger>
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
          align="stretch"
          css={{
            padding,
            width,
            height,
            overflow: "hidden",
            boxSizing: "content-box",
          }}
        >
          {children}
        </Grid>
        {/* Title is at the end intentionally,
         * to make the close button last in the tab order
         */}
        <DialogTitle
          suffix={
            <Flex gap="1">
              <Button
                color="ghost"
                prefix={isExpanded ? <MinimizeIcon /> : <MaximizeIcon />}
                aria-label="Expand"
                onClick={() => setIsExpanded(isExpanded ? false : true)}
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

export const CodeEditor = ({
  title,
  ...editorContentProps
}: EditorContentProps & {
  title?: ReactNode;
}) => {
  const content = <EditorContent {...editorContentProps} />;
  return (
    <EditorDialogControl>
      {content}
      <EditorDialog title={title}>{content}</EditorDialog>
    </EditorDialogControl>
  );
};
