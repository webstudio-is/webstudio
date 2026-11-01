import { useEffect, useMemo, useRef, useState } from "react";
import { linter, type Diagnostic } from "@codemirror/lint";
import { generate, parse } from "css-tree";
import { theme, Box } from "@webstudio-is/design-system";
import {
  generateStyleMap,
  hyphenateProperty,
  toValue,
  type CssProperty,
  type CssStyleMap,
  type StyleValue,
} from "@webstudio-is/css-engine";
import { $cssVarsMap } from "../../shared/model";
import { CssFragmentEditorContent } from "../../shared/css-fragment";
import { EditorDialog, linterTooltipTheme } from "~/shared/code-editor-base";
import {
  parsePropertyName,
  parseStyleInput,
} from "~/builder/shared/css-editor/parse-style-input";
import { cannotRoundTripAsCssText } from "~/builder/shared/css-editor/css-editor";

type Declaration = { property: CssProperty; value: StyleValue };

const parseBlock = (source: string) => {
  const diagnostics: Diagnostic[] = [];
  const declarations: Array<{ text: string; from: number; to: number }> = [];
  const draftCssVars = new Map($cssVarsMap.get());
  const mentionedProperties = new Set<CssProperty>();
  const propertyRanges = new Map<CssProperty, { from: number; to: number }>();
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
          message: error.message,
        });
      },
    });
    ast.children.forEach((node) => {
      if (node.type === "Declaration") {
        const text = generate(node);
        declarations.push({
          text,
          from: node.loc?.start.offset ?? 0,
          to: node.loc?.end.offset ?? source.length,
        });
        if (node.property.startsWith("--")) {
          draftCssVars.set(node.property, generate(node.value));
        }
        const property = parsePropertyName(node.property, $cssVarsMap.get());
        if (property !== undefined) {
          mentionedProperties.add(property);
          propertyRanges.set(property, {
            from: node.loc?.start.offset ?? 0,
            to: node.loc?.end.offset ?? source.length,
          });
        }
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

  for (const { text, from, to } of declarations) {
    const parsed = parseStyleInput(text, draftCssVars);
    if (
      parsed.styleMap.size === 0 ||
      parsed.errors.length > 0 ||
      parsed.hasSyntaxErrors ||
      Array.from(parsed.styleMap.values()).some(
        (value) => value.type === "invalid"
      )
    ) {
      canDelete = false;
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
    declarations.map(({ text }) => text).join(";\n"),
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
    canDelete,
  };
};

export const StyleBlockDialog = ({
  declarations,
  readonly,
  onApply,
  open,
  onOpenChange,
}: {
  declarations: Declaration[];
  readonly: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (changes: {
    oldStyles: CssStyleMap;
    initialParsedStyles: CssStyleMap;
    protectedProperties: ReadonlySet<CssProperty>;
    newStyles: CssStyleMap;
    mentionedProperties: ReadonlySet<CssProperty>;
    canDelete: boolean;
  }) => void;
}) => {
  const [code, setCode] = useState("");
  const declarationsRef = useRef(declarations);
  declarationsRef.current = declarations;
  const initialStylesRef = useRef<CssStyleMap>(new Map());
  const initialParsedStylesRef = useRef<CssStyleMap>(new Map());
  const protectedPropertiesRef = useRef<ReadonlySet<CssProperty>>(new Set());
  const initialCodeRef = useRef("");
  const codeRef = useRef("");
  const extensions = useMemo(
    () => [
      linter(
        (view) => {
          const { styleMap, diagnostics, propertyRanges } = parseBlock(
            view.state.doc.toString()
          );
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
    ],
    []
  );

  useEffect(() => {
    if (open) {
      const oldStyles: CssStyleMap = new Map(
        declarationsRef.current.map(({ property, value }) => [
          hyphenateProperty(property),
          value,
        ])
      );
      const value = generateStyleMap(oldStyles);
      initialStylesRef.current = oldStyles;
      protectedPropertiesRef.current = new Set(
        Array.from(oldStyles)
          .filter(([, value]) => cannotRoundTripAsCssText(value))
          .map(([property]) => property)
      );
      initialParsedStylesRef.current = parseBlock(value).styleMap;
      initialCodeRef.current = value;
      codeRef.current = value;
      setCode(value);
    }
  }, [open]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && open && codeRef.current !== initialCodeRef.current) {
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
    }
    onOpenChange(nextOpen);
  };

  return (
    <EditorDialog
      title="Style block editor"
      modal
      open={open}
      onOpenChange={handleOpenChange}
      content={
        <Box
          css={{
            height: "100%",
            padding: theme.spacing[2],
            "& > div, & .cm-editor, & .cm-scroller": { height: "100%" },
          }}
        >
          <CssFragmentEditorContent
            ariaLabel="Style block editor"
            autoFocus
            readOnly={readonly}
            extensions={extensions}
            value={code}
            onChange={(value) => {
              codeRef.current = value;
              setCode(value);
            }}
            onChangeComplete={(_value, event) => {
              if (event === undefined) {
                handleOpenChange(false);
              }
            }}
          />
        </Box>
      }
    />
  );
};
