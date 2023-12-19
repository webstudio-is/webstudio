import { useEffect, useRef } from "react";
import { matchSorter } from "match-sorter";
import { Annotation, EditorState, Facet, StateEffect } from "@codemirror/state";
import {
  type DecorationSet,
  type ViewUpdate,
  MatchDecorator,
  Decoration,
  WidgetType,
  ViewPlugin,
  keymap,
  drawSelection,
  dropCursor,
  EditorView,
} from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import {
  bracketMatching,
  defaultHighlightStyle,
  syntaxHighlighting,
} from "@codemirror/language";
import {
  type Completion,
  type CompletionSource,
  autocompletion,
  startCompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
} from "@codemirror/autocomplete";
import { completionPath, javascript } from "@codemirror/lang-javascript";
import { theme, textVariants, css } from "@webstudio-is/design-system";

export const formatValue = (value: unknown) => {
  if (Array.isArray(value)) {
    // format arrays as multiline
    return JSON.stringify(value, null, 2);
  }
  if (typeof value === "object" && value !== null) {
    // format objects with parentheses to enforce correct
    // syntax highlighting as expression instead of block
    return `(${JSON.stringify(value, null, 2)})`;
  }
  return JSON.stringify(value);
};

export const formatValuePreview = (value: unknown) => {
  if (typeof value === "string") {
    return JSON.stringify(value);
  }
  if (Number.isNaN(value)) {
    return "nan";
  }
  if (Array.isArray(value)) {
    return "array";
  }
  if (typeof value === "number") {
    return value.toString();
  }
  if (typeof value === "boolean") {
    return value.toString();
  }
  if (value === undefined) {
    return "undefined";
  }
  if (value === null) {
    return "null";
  }
  return typeof value;
};

const ExternalChange = Annotation.define<boolean>();

type Scope = Record<string, unknown>;

type Aliases = Map<string, string>;

const VariablesData = Facet.define<{
  scope: Scope;
  aliases: Aliases;
}>();

// Defines a completion source that completes from the given scope
// object (for example `globalThis`). Will enter properties
// of the object when completing properties on a directly-named path.
const scopeCompletionSource: CompletionSource = (context) => {
  const [{ scope, aliases }] = context.state.facet(VariablesData);
  const path = completionPath(context);
  if (path === null) {
    return null;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let target: any = scope;
  for (const step of path.path) {
    target = target?.[step];
    if (target == null) {
      return null;
    }
  }
  let options: Completion[] = [];
  if (typeof target === "object" && target !== null) {
    options = Object.entries(target).map(([name, value]) => ({
      label: name,
      displayLabel: aliases.get(name),
      detail: formatValuePreview(value),
    }));
    options = matchSorter(options, path.name, {
      keys: [(option) => option.displayLabel ?? option.label],
    });
  }
  return {
    from: context.pos - path.name.length,
    filter: false,
    options,
  };
};

/**
 * Highlight variables and replace their $ws$dataSource$name like labels
 * with user names
 */

class VariableWidget extends WidgetType {
  constructor(readonly text: string) {
    super();
  }
  toDOM(): HTMLElement {
    const span = document.createElement("span");
    span.style.backgroundColor = "rgba(24, 119, 232, 0.2)";
    span.textContent = this.text;
    return span;
  }
}

const variableMatcher = new MatchDecorator({
  regexp: /(\$ws\$dataSource\$\w+)/g,
  decoration: (match, view) => {
    const name = match[1];
    const [data] = view.state.facet(VariablesData);
    return Decoration.replace({
      widget: new VariableWidget(data.aliases.get(name) ?? name),
    });
  },
});

const variables = ViewPlugin.fromClass(
  class {
    variables: DecorationSet;
    constructor(view: EditorView) {
      this.variables = variableMatcher.createDeco(view);
    }
    update(update: ViewUpdate) {
      this.variables = variableMatcher.updateDeco(update, this.variables);
    }
  },
  {
    decorations: (instance) => instance.variables,
    provide: (plugin) =>
      EditorView.atomicRanges.of((view) => {
        return view.plugin(plugin)?.variables || Decoration.none;
      }),
  }
);

const rootStyle = css({
  ...textVariants.mono,
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
  "& .cm-focused": {
    outline: "none",
  },
  "& .cm-content": {
    padding: 0,
  },
  "& .cm-line": {
    padding: 0,
  },
  "& .cm-tooltip": {
    border: "none",
    backgroundColor: "transparent",
  },
  "& .cm-tooltip.cm-tooltip-autocomplete ul": {
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
      // outline: "none",
      // cursor: "default",
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
      "& .cm-completionIcon": {
        display: "none",
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
});

const emptyScope: Scope = {};
const emptyAliases: Aliases = new Map();

export const ExpressionEditor = ({
  scope = emptyScope,
  aliases = emptyAliases,
  readOnly = false,
  value,
  onChange,
  onBlur,
}: {
  /**
   * object with variables and their data to autocomplete
   */
  scope?: Scope;
  /**
   * variable aliases to show instead of $ws$dataSource$id
   */
  aliases?: Aliases;
  readOnly?: boolean;
  value: string;
  onChange: (newValue: string) => void;
  onBlur?: () => void;
}) => {
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
    viewRef.current = view;
    return () => {
      view.destroy();
    };
  }, []);

  // update extensions whenever variables data is changed

  useEffect(() => {
    const view = viewRef.current;
    if (view === undefined) {
      return;
    }
    view.dispatch({
      effects: StateEffect.reconfigure.of([
        history(),
        drawSelection(),
        dropCursor(),
        bracketMatching(),
        closeBrackets(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        javascript({}),
        VariablesData.of({ scope, aliases }),
        autocompletion({ override: [scopeCompletionSource] }),
        variables,
        keymap.of([
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...historyKeymap,
          ...completionKeymap,
          // use tab to trigger completion
          { key: "Tab", run: startCompletion },
        ]),
        EditorView.editable.of(readOnly === false),
        EditorState.readOnly.of(readOnly === true),
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
          blur: () => {
            onBlurRef.current?.();
          },
        }),
      ]),
    });
  }, [scope, aliases, readOnly]);

  // update editor with react value

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

  return <div className={rootStyle.toString()} ref={editorRef}></div>;
};
