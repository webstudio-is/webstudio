import { useEffect, useMemo, type RefObject } from "react";
import { matchSorter } from "match-sorter";
import type { SyntaxNode } from "@lezer/common";
import { Facet, RangeSetBuilder } from "@codemirror/state";
import {
  type DecorationSet,
  type ViewUpdate,
  Decoration,
  WidgetType,
  ViewPlugin,
  keymap,
  EditorView,
  tooltips,
} from "@codemirror/view";
import { bracketMatching, syntaxTree } from "@codemirror/language";
import { linter } from "@codemirror/lint";
import {
  type Completion,
  type CompletionSource,
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
  CompletionContext,
  insertCompletionText,
  pickedCompletion,
} from "@codemirror/autocomplete";
import { javascript } from "@codemirror/lang-javascript";
import { textVariants, css, rawTheme } from "@webstudio-is/design-system";
import {
  decodeDataVariableId,
  lintExpression,
  allowedStringMethods,
  allowedArrayMethods,
  getExpressionValueKind,
} from "@webstudio-is/sdk";
import {
  EditorContent,
  EditorDialog,
  EditorDialogButton,
  EditorDialogControl,
  type EditorApi,
  normalizeEditorValue,
} from "~/shared/code-editor-base";
import {
  decodeDataVariableName,
  encodeDataVariableName,
  restoreExpressionVariables,
  unsetExpressionVariables,
} from "~/shared/data-variables";

export type { EditorApi };

export const formatValue = (value: unknown): string => {
  try {
    if (value === undefined) {
      return "";
    }
    if (Array.isArray(value)) {
      // format arrays as multiline
      return JSON.stringify(value, null, 2);
    }
    if (typeof value === "object" && value !== null) {
      // format objects with parentheses to enforce correct
      // syntax highlighting as expression instead of block
      return `(${JSON.stringify(value, null, 2)})`;
    }
    return JSON.stringify(value) ?? "";
  } catch {
    // show nothing when value is invalid
    return "";
  }
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
    return "";
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

type ExpressionCompletionOption = {
  label: string;
  displayLabel?: string;
  detail: string;
  type?: "method" | "property";
  insertText?: string;
};

type CompletionPath =
  | { path: string[]; name: string; expression?: undefined }
  | { path: []; name: string; expression: string };

const createMethodCompletionOptions = ({
  methods,
  pathName,
  detail,
}: {
  methods: ReadonlySet<string>;
  pathName: string;
  detail: string;
}): Array<ExpressionCompletionOption> => {
  const query = pathName.toLowerCase();
  const options: Array<ExpressionCompletionOption> = [];

  for (const method of methods) {
    if (method.toLowerCase().includes(query)) {
      options.push({
        label: method,
        displayLabel: `${method}()`,
        detail,
        type: "method",
        insertText: `${method}()`,
      });
    }
  }

  return options;
};

const pathFor = (
  read: (node: SyntaxNode) => string,
  member: SyntaxNode,
  name: string
): CompletionPath | undefined => {
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
export const completionPath = (
  context: CompletionContext
): CompletionPath | undefined => {
  const read = (node: SyntaxNode) =>
    context.state.doc.sliceString(node.from, node.to);
  const inner = syntaxTree(context.state).resolveInner(context.pos, -1);
  const pathForMemberExpression = (member: SyntaxNode, name: string) => {
    const path = pathFor(read, member, name);
    if (path) {
      return path;
    }
    const object = member.firstChild;
    if (object) {
      return { path: [] as [], name, expression: read(object) };
    }
  };
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
    return pathForMemberExpression(inner.parent, "");
  }
  // complete property when enter "object.prope"
  if (
    inner.name === "PropertyName" &&
    inner.parent?.name === "MemberExpression"
  ) {
    return pathForMemberExpression(inner.parent, read(inner));
  }
  return;
};

export const getCompletionTarget = ({
  expression,
  path,
  scope,
}: CompletionPath & {
  scope: Scope;
}) => {
  if (expression) {
    const valueKind = getExpressionValueKind({
      expression,
      variableValues: scope,
    });
    if (valueKind === "array") {
      return [];
    }
    if (valueKind === "string") {
      return "";
    }
    return;
  }

  let target: unknown = scope;
  for (const step of path) {
    target = (target as Record<string, unknown> | undefined)?.[step];
    if (target == null) {
      return;
    }
  }
  return target;
};

/**
 * Generate completion options for object properties and array/string methods.
 * Exported for testing.
 */
export const generateCompletionOptions = ({
  target,
  pathName,
  pathLength,
}: {
  target: unknown;
  pathName: string;
  pathLength: number;
}): Array<ExpressionCompletionOption> => {
  const options: Array<ExpressionCompletionOption> = [];

  // Add object properties
  if (typeof target === "object" && target !== null) {
    for (const [name, value] of Object.entries(target)) {
      options.push({
        label: name,
        detail: formatValuePreview(value),
      });
    }
  }

  // Add string/array methods and properties for nested paths
  if (pathLength > 0) {
    const isString = typeof target === "string";
    const isArray = Array.isArray(target);

    if (isString) {
      options.push(
        ...createMethodCompletionOptions({
          methods: allowedStringMethods,
          pathName,
          detail: "string method",
        })
      );
    }

    if (isArray) {
      // Add length property
      if ("length".toLowerCase().includes(pathName.toLowerCase())) {
        options.push({
          label: "length",
          detail: `${target.length}`,
          type: "property",
        });
      }

      options.push(
        ...createMethodCompletionOptions({
          methods: allowedArrayMethods,
          pathName,
          detail: "array method",
        })
      );
    }
  }

  return options;
};

export const getCompletionReplacement = ({
  label,
  insertText,
  type,
  pathLength,
  from,
  to,
}: {
  label: string;
  insertText?: string;
  type?: ExpressionCompletionOption["type"];
  pathLength: number;
  from: number;
  to: number;
}) => {
  if (type === "method") {
    const textToInsert =
      insertText ?? (label.endsWith("()") ? label : `${label}()`);
    return { text: textToInsert, from, to };
  }

  const textToInsert = insertText ?? label;

  // complete valid js identifier or top level variable without quotes
  if (Identifier.test(textToInsert) || pathLength === 0) {
    return { text: textToInsert, from, to };
  }

  return {
    // `param with spaces` -> ["param with spaces"]
    // `0` -> [0]
    text: `[${/^\d+$/.test(textToInsert) ? textToInsert : JSON.stringify(textToInsert)}]`,
    // remove dot when autocomplete computed member expression
    // variable.
    // variable["name"]
    from: from - 1,
    to,
  };
};

// Defines a completion source that completes from the given scope
// object (for example `globalThis`). Will enter properties
// of the object when completing properties on a directly-named path.
const scopeCompletionSource: CompletionSource = (context) => {
  const [{ scope }] = context.state.facet(VariablesData);
  const path = completionPath(context);
  if (path === undefined) {
    return null;
  }
  const target = getCompletionTarget({ ...path, scope });
  if (target === undefined) {
    return null;
  }

  // Generate base completion options using exported function
  const baseOptions = generateCompletionOptions({
    target,
    pathName: path.name,
    pathLength: path.expression ? 1 : path.path.length,
  });

  // Convert to CodeMirror Completion format with apply functions
  let options: Completion[] = baseOptions.map((option) => {
    const name = option.label;
    return {
      label: name,
      displayLabel: option.displayLabel ?? decodeDataVariableName(name),
      detail: option.detail,
      type: option.type,
      apply: (view, completion, from, to) => {
        const replacement = getCompletionReplacement({
          label: name,
          insertText: option.insertText,
          type: option.type,
          pathLength: path.expression ? 1 : path.path.length,
          from,
          to,
        });
        view.dispatch({
          ...insertCompletionText(
            view.state,
            replacement.text,
            replacement.from,
            replacement.to
          ),
          annotations: pickedCompletion.of(completion),
        });
      },
    };
  });

  // Sort options if target is an object
  if (typeof target === "object" && target !== null) {
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
  text: string;
  constructor(text: string) {
    super();
    this.text = text;
  }
  toDOM(): HTMLElement {
    const span = document.createElement("span");
    span.style.backgroundColor = "rgba(24, 119, 232, 0.2)";
    span.textContent = this.text;
    return span;
  }
}

const getVariableDecorations = (view: EditorView) => {
  const builder = new RangeSetBuilder<Decoration>();
  syntaxTree(view.state).iterate({
    from: 0,
    to: view.state.doc.length,
    enter: (node) => {
      if (node.name === "VariableName") {
        const [{ scope }] = view.state.facet(VariablesData);
        const identifier = view.state.doc.sliceString(node.from, node.to);
        const variableName = decodeDataVariableName(identifier);
        if (identifier in scope) {
          builder.add(
            node.from,
            node.to,
            Decoration.replace({
              widget: new VariableWidget(variableName!),
            })
          );
        }
      }
    },
  });
  return builder.finish();
};

const variablesPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = getVariableDecorations(view);
    }
    update(update: ViewUpdate) {
      if (update.docChanged) {
        this.decorations = getVariableDecorations(update.view);
      }
    }
  },
  {
    decorations: (instance) => instance.decorations,
    provide: (plugin) =>
      EditorView.atomicRanges.of((view) => {
        return view.plugin(plugin)?.decorations || Decoration.none;
      }),
  }
);

const emptyScope: Scope = {};
const emptyAliases: Aliases = new Map();

const wrapperStyle = css({
  // 1 line is 16px
  // set and max 20 lines
  "--ws-code-editor-max-height": "320px",
});

const linterTooltipTheme = EditorView.theme({
  ".cm-tooltip:has(.cm-tooltip-lint)": {
    backgroundColor: "transparent",
    borderWidth: 0,
    paddingTop: rawTheme.spacing[5],
    paddingBottom: rawTheme.spacing[5],
    pointerEvents: "none",
  },
  ".cm-tooltip-lint": {
    backgroundColor: rawTheme.colors.backgroundTooltipMain,
    color: rawTheme.colors.foregroundContrastMain,
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

const expressionLinter = linter((view) => {
  const [{ scope }] = view.state.facet(VariablesData);
  return lintExpression({
    expression: view.state.doc.toString(),
    availableVariables: new Set(Object.keys(scope)),
    variableValues: scope,
  });
});

export const ExpressionEditor = ({
  editorApiRef,
  scope = emptyScope,
  aliases = emptyAliases,
  color,
  autoFocus = false,
  readOnly = false,
  value,
  onChange,
  onChangeComplete,
}: {
  editorApiRef?: RefObject<undefined | EditorApi>;
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
  value?: string;
  onChange: (value: string) => void;
  onChangeComplete: (value: string) => void;
}) => {
  const normalizedValue = normalizeEditorValue(value);
  const { nameById, idByName } = useMemo(() => {
    const nameById = new Map();
    const idByName = new Map();
    for (const [identifier, name] of aliases) {
      const id = decodeDataVariableId(identifier);
      if (id) {
        nameById.set(id, name);
        idByName.set(name, id);
      }
    }
    return { nameById, idByName };
  }, [aliases]);
  const expressionWithUnsetVariables = useMemo(() => {
    return unsetExpressionVariables({
      expression: normalizedValue,
      unsetNameById: nameById,
    });
  }, [normalizedValue, nameById]);
  const scopeWithUnsetVariables = useMemo(() => {
    const newScope: typeof scope = {};
    for (const [identifier, value] of Object.entries(scope)) {
      const name = aliases.get(identifier);
      if (name) {
        newScope[encodeDataVariableName(name)] = value;
      }
    }
    return newScope;
  }, [scope, aliases]);
  const aliasesWithUnsetVariables = useMemo(() => {
    const newAliases: typeof aliases = new Map();
    for (const [_identifier, name] of aliases) {
      newAliases.set(encodeDataVariableName(name), name);
    }
    return newAliases;
  }, [aliases]);

  const extensions = useMemo(
    () => [
      bracketMatching(),
      closeBrackets(),
      javascript({}),
      VariablesData.of({
        scope: scopeWithUnsetVariables,
        aliases: aliasesWithUnsetVariables,
      }),
      // render autocomplete in body
      // to prevent popover scroll overflow
      tooltips({ parent: document.body }),
      autocompletion({
        override: [scopeCompletionSource],
        icons: false,
      }),
      variablesPlugin,
      keymap.of([...closeBracketsKeymap, ...completionKeymap]),
      expressionLinter,
      linterTooltipTheme,
    ],
    [scopeWithUnsetVariables, aliasesWithUnsetVariables]
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

  const content = (
    <EditorContent
      editorApiRef={editorApiRef}
      extensions={extensions}
      invalid={color === "error"}
      readOnly={readOnly}
      autoFocus={autoFocus}
      value={expressionWithUnsetVariables}
      onChange={(newValue: string) => {
        const expressionWithRestoredVariables = restoreExpressionVariables({
          expression: newValue,
          maskedIdByName: idByName,
        });
        onChange(expressionWithRestoredVariables);
      }}
      onChangeComplete={(newValue: string) => {
        const expressionWithRestoredVariables = restoreExpressionVariables({
          expression: newValue,
          maskedIdByName: idByName,
        });
        onChangeComplete(expressionWithRestoredVariables);
      }}
    />
  );

  return (
    <div className={wrapperStyle.toString()}>
      <EditorDialogControl>
        {content}
        <EditorDialog title="Expression Editor" content={content}>
          <EditorDialogButton />
        </EditorDialog>
      </EditorDialogControl>
    </div>
  );
};
