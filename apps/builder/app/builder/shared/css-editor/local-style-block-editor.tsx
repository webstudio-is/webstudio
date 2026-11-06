import { useEffect, useMemo, useRef, useState } from "react";
import { completionKeymap } from "@codemirror/autocomplete";
import { linter } from "@codemirror/lint";
import { Decoration, EditorView, keymap, placeholder } from "@codemirror/view";
import { StateField } from "@codemirror/state";
import { Box, theme } from "@webstudio-is/design-system";
import { toValue, type CssStyleMap } from "@webstudio-is/css-engine";
import { EditorContent, linterTooltipTheme } from "~/shared/code-editor-base";
import { declarationLineBreak } from "./declaration-line-break";
import {
  blockCompletionSource,
  cssBlockLanguage,
  parseBlock,
} from "./style-block-parse";
import { formatStyleBlock, sameStyles } from "./style-block-format";
import { createColorSwatches } from "./style-block-colors";
import { cssAutocomplete } from "./css-autocomplete";
import { preserveAssetLayers } from "./preserve-asset-layers";

type Props = {
  styles: CssStyleMap;
  cssVars: Map<string, string>;
  availableVariables: ReadonlyArray<{ value: string }>;
  placeholderText?: string;
  onApply: (styles: CssStyleMap) => void;
  onPreview?: (styles?: CssStyleMap) => void;
};

export const LocalStyleBlockEditor = ({
  styles,
  cssVars,
  availableVariables,
  placeholderText = "Add local styles",
  onApply,
  onPreview,
}: Props) => {
  const [code, setCode] = useState(() => formatStyleBlock(styles, cssVars));
  const codeRef = useRef(code);
  const appliedCodeRef = useRef(code);
  const savedStylesRef = useRef(styles);
  const parsedSavedRef = useRef(parseBlock(code, cssVars).styleMap);
  const onApplyRef = useRef(onApply);
  const onPreviewRef = useRef(onPreview);
  const previewStylesRef = useRef<CssStyleMap>();
  onApplyRef.current = onApply;
  onPreviewRef.current = onPreview;

  useEffect(() => () => onPreviewRef.current?.(undefined), []);

  useEffect(() => {
    if (
      sameStyles(styles, savedStylesRef.current) ||
      (previewStylesRef.current !== undefined &&
        sameStyles(styles, previewStylesRef.current))
    ) {
      return;
    }
    savedStylesRef.current = styles;
    if (codeRef.current === appliedCodeRef.current) {
      const nextCode = formatStyleBlock(styles, cssVars);
      codeRef.current = nextCode;
      appliedCodeRef.current = nextCode;
      parsedSavedRef.current = parseBlock(nextCode, cssVars).styleMap;
      setCode(nextCode);
    }
  }, [styles, cssVars]);

  const mergeStyles = (source: string) => {
    const parsed = parseBlock(source, cssVars);
    const result = new Map(savedStylesRef.current);
    for (const [property] of savedStylesRef.current) {
      if (
        parsed.canDelete &&
        parsedSavedRef.current.has(property) &&
        !parsed.styleMap.has(property) &&
        !parsed.mentionedProperties.has(property)
      ) {
        result.delete(property);
      }
    }
    const edited = preserveAssetLayers(
      savedStylesRef.current,
      parsedSavedRef.current,
      parsed.styleMap
    );
    for (const [property, value] of edited) {
      const roundTripped = parsedSavedRef.current.get(property);
      if (
        roundTripped === undefined ||
        toValue(roundTripped) !== toValue(value)
      ) {
        result.set(property, value);
      }
    }
    return result;
  };

  const applyChanges = () => {
    onPreviewRef.current?.(undefined);
    if (codeRef.current === appliedCodeRef.current) {
      return;
    }
    const nextStyles = mergeStyles(codeRef.current);
    onApplyRef.current(nextStyles);
    savedStylesRef.current = nextStyles;
    previewStylesRef.current = undefined;
    parsedSavedRef.current = parseBlock(codeRef.current, cssVars).styleMap;
    appliedCodeRef.current = codeRef.current;
  };
  const applyRef = useRef(applyChanges);
  applyRef.current = applyChanges;

  const extensions = useMemo(() => {
    const overridden = StateField.define<ReturnType<typeof Decoration.set>>({
      create: (state) =>
        Decoration.set(
          parseBlock(state.doc.toString(), cssVars).overriddenRanges.map(
            ({ from, to }) =>
              Decoration.mark({ class: "cm-overridden-declaration" }).range(
                from,
                to
              )
          ),
          true
        ),
      update: (decorations, transaction) =>
        transaction.docChanged
          ? Decoration.set(
              parseBlock(
                transaction.state.doc.toString(),
                cssVars
              ).overriddenRanges.map(({ from, to }) =>
                Decoration.mark({ class: "cm-overridden-declaration" }).range(
                  from,
                  to
                )
              ),
              true
            )
          : decorations,
      provide: (field) => EditorView.decorations.from(field),
    });
    return [
      cssBlockLanguage,
      createColorSwatches(() => applyRef.current(), {
        getVariables: () => cssVars,
      }),
      ...cssAutocomplete(blockCompletionSource(availableVariables, cssVars)),
      keymap.of(completionKeymap),
      linter(
        (view) => parseBlock(view.state.doc.toString(), cssVars).diagnostics
      ),
      linterTooltipTheme,
      declarationLineBreak,
      placeholder(placeholderText),
      overridden,
      EditorView.theme({
        ".cm-overridden-declaration": { textDecoration: "line-through" },
      }),
    ];
  }, [availableVariables, cssVars, placeholderText]);

  return (
    <Box
      css={{
        paddingInline: theme.panel.paddingInline,
        paddingBlock: theme.spacing[2],
      }}
    >
      <EditorContent
        ariaLabel="Styles"
        showLineNumbers={false}
        extensions={extensions}
        value={code}
        onChange={(nextCode) => {
          codeRef.current = nextCode;
          setCode(nextCode);
          const previewStyles = mergeStyles(nextCode);
          previewStylesRef.current = previewStyles;
          onPreview?.(previewStyles);
        }}
        onChangeComplete={applyChanges}
      />
    </Box>
  );
};
