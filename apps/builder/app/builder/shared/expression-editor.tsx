import { useMemo } from "react";
import { matchSorter } from "match-sorter";
import type { SyntaxNode } from "@lezer/common";
import { Facet } from "@codemirror/state";
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
  tooltips,
} from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import {
  bracketMatching,
  defaultHighlightStyle,
  syntaxHighlighting,
  syntaxTree,
} from "@codemirror/language";
import {
  type Completion,
  type CompletionSource,
  autocompletion,
  startCompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
  CompletionContext,
  insertCompletionText,
  pickedCompletion,
} from "@codemirror/autocomplete";
import { javascript } from "@codemirror/lang-javascript";
import { theme, textVariants, css } from "@webstudio-is/design-system";
import {
  decodeDataSourceVariable,
  validateExpression,
} from "@webstudio-is/react-sdk";
import { CodeEditor } from "./code-editor";

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
  return "JSON";
};

type Scope = Record<string, unknown>;

type Aliases = Map<string, string>;

const VariablesData = Facet.define<{
  scope: Scope;
  aliases: Aliases;
}>();

// completion based on
// https://github.com/codemirror/lang-javascript/blob/4dcee95aee9386fd2c8ad55f93e587b39d968489/src/complete.ts

const Identifier = /^[\p{L}$][\p{L}\p{N}$]*$/u;

const pathFor = (
  read: (node: SyntaxNode) => string,
  member: SyntaxNode,
  name: string
) => {
  const path: string[] = [];
  // traverse from current node to the root variable
  for (;;) {
    const object = member.firstChild;
    if (object?.name === "VariableName") {
      path.push(read(object));
      return { path: path.reverse(), name };
    }
    if (object?.name === "MemberExpression") {
      // MemberExpression(SyntaxNode PropertyName)
      if (object.lastChild?.name === "PropertyName") {
        path.push(read(object.lastChild!));
        member = object;
        continue;
      }
      // MemberExpression(SyntaxNode [ SyntaxNode ])
      if (object.lastChild?.name === "]") {
        const computed = object.lastChild.prevSibling;
        if (computed?.name === "Number") {
          path.push(read(computed));
          member = object;
          continue;
        }
        if (computed?.name === "String") {
          // trim quotes from string literal
          path.push(read(computed).slice(1, -1));
          member = object;
          continue;
        }
      }
    }
    // unexpected case
    break;
  }
};

/// Helper function for defining JavaScript completion sources. It
/// returns the completable name and object path for a completion
/// context, or undefined if no name/property completion should happen at
/// that position. For example, when completing after `a.b.c` it will
/// return `{path: ["a", "b"], name: "c"}`. When completing after `x`
/// it will return `{path: [], name: "x"}`. When not in a property or
/// name, it will return undefined if `context.explicit` is false, and
/// `{path: [], name: ""}` otherwise.
const completionPath = (
  context: CompletionContext
): { path: string[]; name: string } | undefined => {
  const read = (node: SyntaxNode) =>
    context.state.doc.sliceString(node.from, node.to);
  const inner = syntaxTree(context.state).resolveInner(context.pos, -1);
  // suggest global variable name when user start completion explicitly
  if (inner.name === "Script") {
    if (context.explicit) {
      return { path: [], name: "" };
    }
    return;
  }
  // complete variable name when start entering
  if (inner.name === "VariableName") {
    return { path: [], name: read(inner) };
  }
  // suggest property name when enter `object.`
  if (inner.name === "." && inner.parent?.name === "MemberExpression") {
    return pathFor(read, inner.parent, "");
  }
  // complete property when enter "object.prope"
  if (
    inner.name === "PropertyName" &&
    inner.parent?.name === "MemberExpression"
  ) {
    return pathFor(read, inner.parent, read(inner));
  }
  return;
};

// Defines a completion source that completes from the given scope
// object (for example `globalThis`). Will enter properties
// of the object when completing properties on a directly-named path.
const scopeCompletionSource: CompletionSource = (context) => {
  const [{ scope, aliases }] = context.state.facet(VariablesData);
  const path = completionPath(context);
  if (path === undefined) {
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
      apply: (view, completion, from, to) => {
        // complete valid js identifier or top level variable without quotes
        if (Identifier.test(name) || path.path.length === 0) {
          // complete with dot
          view.dispatch({
            ...insertCompletionText(view.state, name, from, to),
            annotations: pickedCompletion.of(completion),
          });
        } else {
          // complete with computed member expression
          view.dispatch({
            ...insertCompletionText(
              view.state,
              // `param with spaces` -> ["param with spaces"]
              // `0` -> [0]
              `[${/^\d+$/.test(name) ? name : JSON.stringify(name)}]`,
              // remove dot when autocomplete computed member expression
              // variable.
              // variable["name"]
              from - 1,
              to
            ),
            annotations: pickedCompletion.of(completion),
          });
        }
      },
    }));
    options = matchSorter(options, path.name, {
      keys: [(option) => option.displayLabel ?? option.label],
      baseSort: (left, right) => {
        const leftName = left.item.label;
        const rightName = right.item.label;
        const leftIndex = Number(leftName);
        const rightIndex = Number(rightName);
        // sort string fields
        if (Number.isNaN(leftIndex) || Number.isNaN(rightIndex)) {
          return leftName.localeCompare(rightName);
        }
        // sort indexes if both numbers
        return leftIndex - rightIndex;
      },
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
 *
 * https://codemirror.net/examples/decoration/#atomic-ranges
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

const autocompletionStyle = css({
  "&.cm-tooltip.cm-tooltip-autocomplete": {
    ...textVariants.mono,
    border: "none",
    backgroundColor: "transparent",
    // override none set on body by radix popover
    pointerEvents: "auto",
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
        "&[aria-selected], &:hover": {
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

const emptyScope: Scope = {};
const emptyAliases: Aliases = new Map();

const wrapperStyle = css({
  "& .cm-content": {
    // 1 line is 16px
    // set and max 20 lines
    maxHeight: 320,
  },
});

export const ExpressionEditor = ({
  scope = emptyScope,
  aliases = emptyAliases,
  color,
  autoFocus = false,
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
  color?: "error";
  autoFocus?: boolean;
  readOnly?: boolean;
  value: string;
  onChange: (newValue: string) => void;
  onBlur?: () => void;
}) => {
  const extensions = useMemo(
    () => [
      history(),
      drawSelection(),
      dropCursor(),
      bracketMatching(),
      closeBrackets(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      javascript({}),
      VariablesData.of({ scope, aliases }),
      // render autocomplete in body
      // to prevent popover scroll overflow
      tooltips({ parent: document.body }),
      autocompletion({
        override: [scopeCompletionSource],
        icons: false,
        tooltipClass: () => autocompletionStyle.toString(),
      }),
      variables,
      keymap.of([
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...historyKeymap,
        ...completionKeymap,
        // use tab to trigger completion
        {
          key: "Tab",
          preventDefault: true,
          stopPropagation: true,
          run: startCompletion,
        },
      ]),
    ],
    [scope, aliases]
  );

  return (
    <div className={wrapperStyle.toString()}>
      <CodeEditor
        extensions={extensions}
        invalid={color === "error"}
        readOnly={readOnly}
        autoFocus={autoFocus}
        value={value}
        onChange={(value) => {
          try {
            let hasReplacements = false;
            // replace unknown webstudio variables with undefined
            // to prevent invalid compilation
            const newExpression = validateExpression(value, {
              effectful: true,
              transformIdentifier: (identifier) => {
                if (
                  decodeDataSourceVariable(identifier) &&
                  aliases.has(identifier) === false
                ) {
                  hasReplacements = true;
                  return `undefined`;
                }
                return identifier;
              },
            });
            // reformat only when something is replaced
            // to break user interaction
            if (hasReplacements) {
              value = newExpression;
            }
          } catch {
            // empty block
          }
          onChange(value);
        }}
        onBlur={onBlur}
      />
    </div>
  );
};
