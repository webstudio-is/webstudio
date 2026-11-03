import { useEffect, useMemo, useRef, useState } from "react";
import { linter, type Diagnostic } from "@codemirror/lint";
import { cssCompletionSource, cssLanguage } from "@codemirror/lang-css";
import { syntaxTree } from "@codemirror/language";
import { EditorState, StateField } from "@codemirror/state";
import { Decoration, EditorView, keymap, placeholder } from "@codemirror/view";
import type { CompletionSource } from "@codemirror/autocomplete";
import { generate, parse, tokenize, tokenTypes } from "css-tree";
import {
  theme,
  Box,
  Button,
  menuItemCss,
  Tooltip,
} from "@webstudio-is/design-system";
import { LockIcon } from "@webstudio-is/icons";
import {
  camelCaseProperty,
  keywordValues,
  propertyDescriptions,
} from "@webstudio-is/css-data";
import {
  hyphenateProperty,
  toValue,
  type CssProperty,
  type CssStyleMap,
  type StyleValue,
} from "@webstudio-is/css-engine";
import { $availableVariables, $cssVarsMap } from "../../shared/model";
import { CssFragmentEditorContent } from "../../shared/css-fragment";
import { EditorDialog, linterTooltipTheme } from "~/shared/code-editor-base";
import {
  parsePropertyName,
  parseStyleInput,
} from "~/builder/shared/css-editor/parse-style-input";
import { cannotRoundTripAsCssText } from "~/builder/shared/css-editor/css-editor";
import type { StyleBlockEditorSource } from "./style-block-editor-state";
import { formatStyleBlock } from "./style-block-format";
import {
  getAutocompleteItems,
  matchOrSuggestToCreate,
} from "~/builder/shared/css-editor/property-autocomplete";

type Declaration = { property: CssProperty; value: StyleValue };
type ApplyChanges = {
  oldStyles: CssStyleMap;
  initialParsedStyles: CssStyleMap;
  protectedProperties: ReadonlySet<CssProperty>;
  newStyles: CssStyleMap;
  mentionedProperties: ReadonlySet<CssProperty>;
  canDelete: boolean;
};

const readonlyTooltip =
  "These styles are read-only here. Edit their original source, or add a local declaration to override them.";

const dialogTitles: Record<StyleBlockEditorSource, string> = {
  local: "Local styles",
  cascaded: "Cascaded styles",
  preset: "Preset styles",
  globalVariables: "Global variables",
};

export const cssBlockLanguage = cssLanguage.configure({ top: "Styles" });

export const blockCompletionSource: CompletionSource = async (context) => {
  const completion = await cssCompletionSource(context);
  const { state, pos } = context;
  const tree = syntaxTree(state);
  const node = tree.resolveInner(pos, -1);
  const firstType = completion?.options[0]?.type;
  const line = state.doc.lineAt(pos);
  const isPropertyLine =
    state.doc.sliceString(line.from, node.from).trim() === "" &&
    (node.name === "TagName" ||
      (node.name === "Styles" && line.text.trim() === ""));
  const isVariableProperty =
    node.name === "VariableName" &&
    node.parent?.name === "Declaration" &&
    (node.parent.getChild(":")?.from ?? Infinity) > node.from;

  if (node.name === "VariableName" && node.parent?.name === "ArgList") {
    return {
      from: node.from,
      to: node.to,
      options: [
        ...(completion?.options ?? []),
        ...$availableVariables.get().map(({ value }) => ({
          label: `--${value}`,
          type: "variable",
        })),
      ],
    };
  }

  let declaration = node;
  while (declaration.parent !== null && declaration.name !== "Declaration") {
    declaration = declaration.parent;
  }
  if (declaration.name !== "Declaration" && !isPropertyLine) {
    const previous = tree.topNode.childBefore(pos);
    if (
      previous?.name === "Declaration" &&
      state.doc.sliceString(previous.to, pos).trim() === ""
    ) {
      declaration = previous;
    }
  }
  const colon = declaration.getChild(":");
  if (colon !== null && pos >= colon.to && !isPropertyLine) {
    const propertyNode =
      declaration.getChild("PropertyName") ??
      declaration.getChild("VariableName");
    const property = propertyNode
      ? state.doc.sliceString(propertyNode.from, propertyNode.to)
      : "";
    const keywords = keywordValues[property as CssProperty] ?? [];
    return {
      from:
        node.name === "VariableName"
          ? node.from
          : firstType === "keyword"
            ? (completion?.from ?? pos)
            : pos,
      to:
        node.name === "VariableName" || node.name === "ValueName"
          ? node.to
          : undefined,
      options: [
        ...keywords.map((value) => ({ label: value, type: "keyword" })),
        ...$availableVariables.get().map(({ value }) => ({
          label: `var(--${value})`,
          displayLabel: `--${value}`,
          type: "variable",
        })),
      ],
    };
  }

  if (!isVariableProperty && firstType !== "property" && !isPropertyLine) {
    return null;
  }
  const from =
    isVariableProperty || (isPropertyLine && node.name === "TagName")
      ? node.from
      : (completion?.from ?? pos);
  const search = state.doc.sliceString(from, pos);
  const items = matchOrSuggestToCreate(search, getAutocompleteItems());
  return {
    from,
    to:
      node.name === "PropertyName" ||
      node.name === "TagName" ||
      isVariableProperty
        ? node.to
        : undefined,
    filter: false,
    options: items.map((item) => {
      const description =
        propertyDescriptions[camelCaseProperty(item.property as CssProperty)];
      return {
        label: item.label,
        apply:
          colon === null || isPropertyLine
            ? `${item.property}: ${item.value ?? ""}`
            : item.property,
        type: "property",
        info: description
          ? () => {
              const content = document.createElement("div");
              content.className = menuItemCss({ hint: true }).className;
              content.textContent = description;
              return content;
            }
          : undefined,
      };
    }),
  };
};

const getProtectedProperties = (styles: CssStyleMap) =>
  new Set(
    Array.from(styles)
      .filter(([, value]) => cannotRoundTripAsCssText(value))
      .map(([property]) => property)
  );

const hasMissingSeparator = (source: string, offset: number) => {
  let propertyStart: number | undefined;
  let previousToken: { type: number; start: number } | undefined;
  tokenize(source, (type, start) => {
    if (start === offset && type === tokenTypes.Colon) {
      if (previousToken?.type === tokenTypes.Ident) {
        propertyStart = previousToken.start;
      }
    }
    if (type !== tokenTypes.WhiteSpace) {
      previousToken = { type, start };
    }
  });
  if (propertyStart === undefined) {
    return false;
  }
  const isDeclarationList = (text: string) => {
    let hasError = false;
    const ast = parse(text, {
      context: "declarationList",
      onParseError: () => {
        hasError = true;
      },
    });
    const last = ast.children.last;
    return (
      !hasError &&
      last?.type === "Declaration" &&
      generate(last.value).trim() !== ""
    );
  };
  return (
    isDeclarationList(source.slice(0, propertyStart)) &&
    isDeclarationList(source.slice(propertyStart))
  );
};

export const parseBlock = (source: string) => {
  const diagnostics: Diagnostic[] = [];
  const declarations: Array<{
    text: string;
    property: string;
    from: number;
    to: number;
  }> = [];
  const draftCssVars = new Map($cssVarsMap.get());
  const mentionedProperties = new Set<CssProperty>();
  const propertyRanges = new Map<CssProperty, { from: number; to: number }>();
  const previousValidRanges = new Map<string, { from: number; to: number }>();
  const overriddenRanges: Array<{ from: number; to: number }> = [];
  const invalidProperties = new Set<CssProperty>();
  let canDelete = true;
  try {
    const ast = parse(source, {
      context: "declarationList",
      positions: true,
      onParseError: (error) => {
        canDelete = false;
        diagnostics.push({
          from: error.offset,
          to: Math.min(source.length, error.offset + 1),
          severity: "error",
          message: hasMissingSeparator(source, error.offset)
            ? "Add a semicolon after the previous declaration."
            : error.message,
        });
      },
    });
    ast.children.forEach((node) => {
      if (node.type === "Declaration") {
        const text = generate(node);
        const range = {
          from: node.loc?.start.offset ?? 0,
          to: node.loc?.end.offset ?? source.length,
        };
        if (node.property.startsWith("--")) {
          draftCssVars.set(node.property, generate(node.value));
        }
        declarations.push({ text, property: node.property, ...range });
        return;
      }
      canDelete = false;
      diagnostics.push({
        from: node.loc?.start.offset ?? 0,
        to: node.loc?.end.offset ?? source.length,
        severity: "error",
        message: "Only property: value declarations are supported.",
      });
    });
  } catch (error) {
    canDelete = false;
    diagnostics.push({
      from: 0,
      to: source.length,
      severity: "error",
      message: String(error),
    });
  }

  const validDeclarations: string[] = [];
  for (const { text, property: rawProperty, from, to } of declarations) {
    const parsed = parseStyleInput(text, draftCssVars);
    const property =
      parsed.styleMap.size === 1
        ? parsed.styleMap.keys().next().value
        : parsed.styleMap.size === 0
          ? parsePropertyName(rawProperty, draftCssVars)
          : undefined;
    const duplicateKey =
      property ??
      (rawProperty.startsWith("--") ? rawProperty : rawProperty.toLowerCase());
    if (property !== undefined) {
      mentionedProperties.add(property);
      propertyRanges.set(property, { from, to });
    }
    const isInvalid =
      parsed.styleMap.size === 0 ||
      parsed.errors.length > 0 ||
      parsed.hasSyntaxErrors ||
      Array.from(parsed.styleMap.values()).some(
        (value) => value.type === "invalid"
      );
    if (isInvalid) {
      canDelete = false;
    } else {
      validDeclarations.push(text);
      const previousRange = previousValidRanges.get(duplicateKey);
      if (previousRange !== undefined) {
        overriddenRanges.push(previousRange);
      }
      previousValidRanges.set(duplicateKey, { from, to });
    }
    for (const message of parsed.errors) {
      diagnostics.push({ from, to, severity: "error", message });
    }
    for (const [property, value] of parsed.styleMap) {
      if (value.type === "invalid") {
        invalidProperties.add(property);
        diagnostics.push({
          from,
          to,
          severity: "error",
          message: `Invalid value for ${property}.`,
        });
      }
    }
  }

  const { styleMap, errors } = parseStyleInput(
    validDeclarations.join(";\n"),
    $cssVarsMap.get()
  );
  if (errors.length > 0) {
    canDelete = false;
  }
  for (const [property, value] of styleMap) {
    if (value.type === "invalid") {
      canDelete = false;
      styleMap.delete(property);
      if (!invalidProperties.has(property)) {
        const range = propertyRanges.get(property);
        diagnostics.push({
          from: range?.from ?? 0,
          to: range?.to ?? source.length,
          severity: "error",
          message: `Invalid value for ${property}.`,
        });
      }
    }
  }
  return {
    styleMap,
    diagnostics,
    mentionedProperties,
    propertyRanges,
    overriddenRanges,
    canDelete,
  };
};

const blockParseField = StateField.define<ReturnType<typeof parseBlock>>({
  create: (state) => parseBlock(state.doc.toString()),
  update: (parsed, transaction) =>
    transaction.docChanged
      ? parseBlock(transaction.state.doc.toString())
      : parsed,
  provide: (field) =>
    EditorView.decorations.from(field, ({ overriddenRanges }) =>
      Decoration.set(
        overriddenRanges.map(({ from, to }) =>
          Decoration.mark({ class: "cm-overridden-declaration" }).range(
            from,
            to
          )
        ),
        true
      )
    ),
});

const overriddenDeclarationTheme = EditorView.theme({
  ".cm-overridden-declaration": { textDecoration: "line-through" },
});

const StyleBlockEditor = ({
  declarations,
  readonly,
  onApply,
  open,
  onOpenChange,
  inline = false,
  source = "local",
  sourceBlock,
}: {
  declarations: Declaration[];
  readonly: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (changes: ApplyChanges) => void;
  inline?: boolean;
  source?: StyleBlockEditorSource;
  sourceBlock?: { value: string };
}) => {
  const [code, setCode] = useState("");
  const declarationsRef = useRef(declarations);
  declarationsRef.current = declarations;
  const initialStylesRef = useRef<CssStyleMap>(new Map());
  const initialParsedStylesRef = useRef<CssStyleMap>(new Map());
  const protectedPropertiesRef = useRef<ReadonlySet<CssProperty>>(new Set());
  const initialCodeRef = useRef("");
  const appliedCodeRef = useRef("");
  const codeRef = useRef("");
  const extensions = useMemo(
    () => [
      blockParseField,
      overriddenDeclarationTheme,
      keymap.of([
        {
          key: "Enter",
          run(view) {
            const { from, to } = view.state.selection.main;
            const line = view.state.doc.lineAt(from);
            if (
              view.state.facet(EditorState.readOnly) ||
              from !== to ||
              from !== line.to ||
              line.text.trimEnd().endsWith(";")
            ) {
              return false;
            }
            let hasError = false;
            const ast = parse(line.text, {
              context: "declarationList",
              positions: true,
              onParseError: () => {
                hasError = true;
              },
            });
            const last = ast.children.last;
            if (
              hasError ||
              last?.type !== "Declaration" ||
              last.loc?.end.offset !== line.text.length ||
              generate(last.value).trim() === ""
            ) {
              return false;
            }
            view.dispatch({
              changes: { from, insert: ";\n" },
              selection: { anchor: from + 2 },
            });
            return true;
          },
        },
      ]),
      linter(
        (view) => {
          const {
            styleMap,
            propertyRanges,
            diagnostics: parsedDiagnostics,
          } = view.state.field(blockParseField);
          const diagnostics = [...parsedDiagnostics];
          for (const property of protectedPropertiesRef.current) {
            const value = styleMap.get(property);
            if (
              value === undefined ||
              (initialParsedStylesRef.current.has(property) &&
                toValue(initialParsedStylesRef.current.get(property)) ===
                  toValue(value))
            ) {
              continue;
            }
            const range = propertyRanges.get(property);
            diagnostics.push({
              from: range?.from ?? 0,
              to: range?.to ?? view.state.doc.length,
              severity: "error",
              message: `Invalid value for ${property}.`,
            });
          }
          return diagnostics;
        },
        { delay: 200 }
      ),
      linterTooltipTheme,
      ...(inline ? [placeholder("Add local styles")] : []),
    ],
    [inline]
  );

  const setInitialStyles = (oldStyles: CssStyleMap, value: string) => {
    initialStylesRef.current = oldStyles;
    protectedPropertiesRef.current = getProtectedProperties(oldStyles);
    initialParsedStylesRef.current = parseBlock(value).styleMap;
    initialCodeRef.current = value;
    appliedCodeRef.current = value;
    codeRef.current = value;
    setCode(value);
  };

  useEffect(() => {
    if (open) {
      const oldStyles: CssStyleMap = new Map(
        declarationsRef.current.map(({ property, value }) => [
          hyphenateProperty(property),
          value,
        ])
      );
      const value = formatStyleBlock(oldStyles, $cssVarsMap.get());
      setInitialStyles(oldStyles, value);
    }
  }, [open]);

  useEffect(() => {
    if (inline) {
      const oldStyles: CssStyleMap = new Map(
        declarations.map(({ property, value }) => [
          hyphenateProperty(property),
          value,
        ])
      );
      const savedCode = formatStyleBlock(oldStyles, $cssVarsMap.get());
      if (codeRef.current === initialCodeRef.current) {
        if (savedCode !== initialCodeRef.current) {
          setInitialStyles(oldStyles, savedCode);
        } else {
          initialStylesRef.current = oldStyles;
          protectedPropertiesRef.current = getProtectedProperties(oldStyles);
        }
      }
    }
  }, [inline, declarations]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (
      !nextOpen &&
      open &&
      source === "local" &&
      codeRef.current !== initialCodeRef.current
    ) {
      applyChanges();
    }
    onOpenChange(nextOpen);
  };

  const applyChanges = () => {
    if (
      codeRef.current !==
      (inline ? appliedCodeRef.current : initialCodeRef.current)
    ) {
      const { styleMap, mentionedProperties, canDelete } = parseBlock(
        codeRef.current
      );
      onApply({
        oldStyles: initialStylesRef.current,
        initialParsedStyles: initialParsedStylesRef.current,
        protectedProperties: protectedPropertiesRef.current,
        newStyles: styleMap,
        mentionedProperties,
        canDelete,
      });
      if (inline) {
        appliedCodeRef.current = codeRef.current;
        initialParsedStylesRef.current = styleMap;
        if (canDelete) {
          initialCodeRef.current = codeRef.current;
        }
      }
    }
  };

  const content = (
    <Box
      css={
        inline
          ? {
              paddingInline: `calc(${theme.panel.paddingInline} + ${theme.spacing[2]} + 1px)`,
              paddingBlock: theme.spacing[2],
              "& > div": {
                background: "transparent",
                borderWidth: 0,
                padding: 0,
              },
            }
          : {
              height: "100%",
              "& > div, & .cm-editor, & .cm-scroller": { height: "100%" },
            }
      }
    >
      <CssFragmentEditorContent
        key={source}
        ariaLabel={inline ? "Style block editor" : dialogTitles[source]}
        language={cssBlockLanguage}
        completionSource={
          source === "local" ? blockCompletionSource : undefined
        }
        autoFocus={!inline}
        chromeless={inline}
        showLineNumbers={!inline}
        readOnly={readonly || source !== "local"}
        extensions={source === "local" ? extensions : undefined}
        value={source === "local" ? code : (sourceBlock?.value ?? "")}
        onChange={(value) => {
          if (source === "local") {
            codeRef.current = value;
            setCode(value);
          }
        }}
        onChangeComplete={(_value, event) => {
          if (source !== "local") {
            return;
          }
          if (inline) {
            applyChanges();
          } else if (event === undefined) {
            handleOpenChange(false);
          }
        }}
      />
    </Box>
  );

  if (inline) {
    return content;
  }
  return (
    <EditorDialog
      title={dialogTitles[source]}
      titleSuffix={
        source !== "local" && (
          <Tooltip content={readonlyTooltip} variant="wrapped" openOnFocus>
            <Button
              color="ghost"
              prefix={<LockIcon />}
              aria-label={readonlyTooltip}
            />
          </Tooltip>
        )
      }
      modal
      open={open}
      onOpenChange={handleOpenChange}
      content={content}
    />
  );
};

export const StyleBlockDialog = (
  props: Omit<Parameters<typeof StyleBlockEditor>[0], "inline">
) => <StyleBlockEditor {...props} />;

export const InlineStyleBlockEditor = (
  props: Omit<
    Parameters<typeof StyleBlockEditor>[0],
    "open" | "onOpenChange" | "inline" | "source" | "sourceBlock"
  >
) => <StyleBlockEditor {...props} inline open onOpenChange={() => {}} />;
