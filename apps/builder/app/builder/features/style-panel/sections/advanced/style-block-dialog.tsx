import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import type { CompletionSource } from "@codemirror/autocomplete";
import { linter } from "@codemirror/lint";
import { EditorState, StateEffect, StateField } from "@codemirror/state";
import {
  Decoration,
  EditorView,
  hoverTooltip,
  placeholder,
  showTooltip,
  type Tooltip,
  ViewPlugin,
} from "@codemirror/view";
import {
  Box,
  MenuList,
  styleSourceColor,
  Text,
  theme,
  tooltipContentCss,
} from "@webstudio-is/design-system";
import {
  camelCaseProperty,
  propertyDescriptions,
} from "@webstudio-is/css-data";
import {
  hyphenateProperty,
  type CssProperty,
  type CssStyleMap,
  type StyleValue,
} from "@webstudio-is/css-engine";
import type { ComputedStyleDecl } from "~/shared/style-object-model";
import {
  EditorDialog,
  ExternalChange,
  linterTooltipTheme,
} from "~/shared/code-editor-base";
import { declarationLineBreak } from "~/builder/shared/css-editor/declaration-line-break";
import { CssFragmentEditorContent } from "../../shared/css-fragment";
import { $cssVarsMap } from "../../shared/model";
import { PropertyInfo } from "../../property-label";
import { ReadonlyProvider } from "../../shared/readonly";
import { createColorSwatches } from "./style-block-colors";
import {
  blockCompletionSource,
  cssBlockLanguage,
  getProtectedProperties,
  parseBlock,
  type ApplyChanges,
} from "./style-block-parse";
import {
  formatMixedStyleBlock,
  getMixedStyleGroups,
  getMixedPropertyRanges,
  getProtectedMixedRanges,
  parseMixedStyleBlock,
} from "./mixed-style-block";
import { formatStyleBlock } from "./style-block-format";

const blockedEditMessage =
  "This declaration comes from another source. Add a local declaration to override it.";
const blockedEdit = StateEffect.define<number>();
const sourceChanged = StateEffect.define<void>();
const blockedEditTooltip = StateField.define<Tooltip | null>({
  create: () => null,
  update: (tooltip, transaction) => {
    const blocked = transaction.effects.find((effect) =>
      effect.is(blockedEdit)
    );
    if (blocked) {
      return {
        pos: blocked.value,
        above: true,
        create: () => {
          const dom = document.createElement("div");
          dom.className = "cm-mixed-blocked-tooltip";
          const root = createRoot(dom);
          root.render(
            <Box
              className={tooltipContentCss({ variant: "wrapped" }).className}
            >
              <Text>{blockedEditMessage}</Text>
            </Box>
          );
          return { dom, destroy: () => root.unmount() };
        },
      };
    }
    return transaction.docChanged || transaction.selection ? null : tooltip;
  },
  provide: (field) => showTooltip.from(field),
});

type Declaration = { property: CssProperty; value: StyleValue };
type Props = {
  declarations: Declaration[];
  sourceDeclarations: ComputedStyleDecl[];
  readonly: boolean;
  onApply: (changes: ApplyChanges) => CssStyleMap | void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inline?: boolean;
};

const sourceColorTheme = EditorView.theme({
  ".cm-mixed-local, .cm-mixed-local *": {
    color: `${styleSourceColor.local.foreground} !important`,
  },
  ".cm-mixed-overwritten, .cm-mixed-overwritten *": {
    color: `${styleSourceColor.overwritten.foreground} !important`,
  },
  ".cm-mixed-remote, .cm-mixed-remote *": {
    color: `${styleSourceColor.remote.foreground} !important`,
  },
  ".cm-tooltip.cm-mixed-property-tooltip, .cm-tooltip.cm-mixed-blocked-tooltip":
    {
      border: 0,
      background: "transparent",
      boxShadow: "none",
      padding: 0,
      pointerEvents: "auto",
    },
  ".cm-overridden-declaration": { textDecoration: "line-through" },
});

const getLocalStyles = (declarations: Declaration[]): CssStyleMap =>
  new Map(
    declarations.map(({ property, value }) => [
      hyphenateProperty(property),
      value,
    ])
  );

const mixedCompletionSource: CompletionSource = (context) => {
  const group = getMixedStyleGroups(context.state.doc.toString()).find(
    ({ contentFrom, to }) => context.pos >= contentFrom && context.pos < to
  );
  return group?.source === "local" ? blockCompletionSource(context) : null;
};

const MixedStyleBlockEditor = ({
  declarations,
  sourceDeclarations,
  readonly,
  onApply,
  open,
  onOpenChange,
  inline = false,
}: Props) => {
  const [code, setCode] = useState("");
  const codeRef = useRef("");
  const cleanCodeRef = useRef("");
  const appliedCodeRef = useRef("");
  const oldStylesRef = useRef<CssStyleMap>(new Map());
  const initialParsedRef = useRef<CssStyleMap>(new Map());
  const sourceSnapshotRef = useRef(sourceDeclarations);
  const editorViewRef = useRef<EditorView>();
  const wasOpenRef = useRef(false);
  const applyRef = useRef<() => void>(() => {});

  const setInitialStyles = useCallback(
    (localStyles: CssStyleMap, nextCode: string) => {
      oldStylesRef.current = localStyles;
      sourceSnapshotRef.current = sourceDeclarations;
      initialParsedRef.current = parseBlock(
        formatStyleBlock(localStyles, $cssVarsMap.get())
      ).styleMap;
      codeRef.current = nextCode;
      cleanCodeRef.current = nextCode;
      appliedCodeRef.current = nextCode;
      setCode(nextCode);
    },
    [sourceDeclarations]
  );

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      const localStyles = getLocalStyles(declarations);
      const nextCode = formatMixedStyleBlock(
        localStyles,
        sourceDeclarations,
        $cssVarsMap.get()
      );
      setInitialStyles(localStyles, nextCode);
    }
    wasOpenRef.current = open;
  }, [open, declarations, sourceDeclarations, setInitialStyles]);

  useEffect(() => {
    if (!inline || codeRef.current !== cleanCodeRef.current) {
      return;
    }
    const localStyles = getLocalStyles(declarations);
    const nextCode = formatMixedStyleBlock(
      localStyles,
      sourceDeclarations,
      $cssVarsMap.get()
    );
    if (nextCode !== cleanCodeRef.current) {
      setInitialStyles(localStyles, nextCode);
    } else {
      oldStylesRef.current = localStyles;
      sourceSnapshotRef.current = sourceDeclarations;
      editorViewRef.current?.dispatch({ effects: sourceChanged.of() });
    }
  }, [inline, declarations, sourceDeclarations, setInitialStyles]);

  const applyChanges = () => {
    if (codeRef.current === appliedCodeRef.current) {
      return;
    }
    const parsed = parseMixedStyleBlock(codeRef.current);
    const appliedStyles = onApply({
      oldStyles: oldStylesRef.current,
      initialParsedStyles: initialParsedRef.current,
      protectedProperties: getProtectedProperties(oldStylesRef.current),
      newStyles: parsed.styleMap,
      mentionedProperties: parsed.mentionedProperties,
      canDelete: parsed.canDelete,
    });
    if (appliedStyles !== undefined) {
      oldStylesRef.current = appliedStyles;
      initialParsedRef.current = parsed.styleMap;
      appliedCodeRef.current = codeRef.current;
      if (parsed.canDelete && parsed.diagnostics.length === 0) {
        cleanCodeRef.current = codeRef.current;
      }
    }
  };
  applyRef.current = inline ? applyChanges : () => {};

  const colorSwatches = useMemo(
    () => createColorSwatches(() => applyRef.current()),
    []
  );
  const extensions = useMemo(() => {
    const decorate = (value: string) =>
      Decoration.set(
        [
          ...getMixedPropertyRanges(value).map((range) => {
            let source = "remote";
            if (range.source === "local") {
              const parsed = parseBlock(
                value.slice(range.declarationFrom, range.declarationTo)
              ).styleMap;
              const properties = new Set(
                parsed.size > 0 ? parsed.keys() : [range.property]
              );
              source = sourceSnapshotRef.current.some(
                (declaration) =>
                  properties.has(declaration.property) &&
                  declaration.source.name === "overwritten"
              )
                ? "overwritten"
                : "local";
            }
            return Decoration.mark({ class: `cm-mixed-${source}` }).range(
              range.from,
              range.to
            );
          }),
          ...parseMixedStyleBlock(value).overriddenRanges.map(({ from, to }) =>
            Decoration.mark({ class: "cm-overridden-declaration" }).range(
              from,
              to
            )
          ),
        ],
        true
      );
    const propertyField = StateField.define<ReturnType<typeof Decoration.set>>({
      create: (state) => decorate(state.doc.toString()),
      update: (decorations, transaction) =>
        transaction.docChanged ||
        transaction.effects.some((effect) => effect.is(sourceChanged))
          ? decorate(transaction.state.doc.toString())
          : decorations,
      provide: (field) => EditorView.decorations.from(field),
    });
    return [
      colorSwatches,
      propertyField,
      ViewPlugin.fromClass(
        class {
          constructor(view: EditorView) {
            editorViewRef.current = view;
          }
          destroy() {
            editorViewRef.current = undefined;
          }
        }
      ),
      sourceColorTheme,
      blockedEditTooltip,
      EditorState.transactionFilter.of((transaction) => {
        if (!transaction.docChanged || transaction.annotation(ExternalChange)) {
          return transaction;
        }
        const currentGroups = getMixedStyleGroups(
          transaction.startState.doc.toString()
        );
        const nextGroups = getMixedStyleGroups(transaction.newDoc.toString());
        const changedGroups =
          currentGroups.length !== nextGroups.length ||
          nextGroups[0]?.from !== 0 ||
          currentGroups.some(
            (group, index) => group.source !== nextGroups[index]?.source
          );
        const protectedRanges = getProtectedMixedRanges(currentGroups);
        let blocked = changedGroups;
        let blockedPos = transaction.startState.selection.main.head;
        transaction.changes.iterChangedRanges((from, to) => {
          if (
            protectedRanges.some(
              (range) =>
                (from === to &&
                  (range.inclusive
                    ? from >= range.from && from <= range.to
                    : from > range.from && from < range.to)) ||
                (from < to && from < range.to && to > range.from)
            )
          ) {
            blocked = true;
            blockedPos = from;
          }
        });
        return blocked
          ? {
              effects: [
                blockedEdit.of(blockedPos),
                EditorView.announce.of(blockedEditMessage),
              ],
            }
          : transaction;
      }),
      hoverTooltip((view, position) => {
        const range = getMixedPropertyRanges(view.state.doc.toString()).find(
          ({ from, to }) => position >= from && position <= to
        );
        if (range === undefined) {
          return null;
        }
        const line = view.state.doc.sliceString(
          range.declarationFrom,
          range.declarationTo
        );
        const parsed = parseBlock(line).styleMap;
        const source = sourceSnapshotRef.current.find(
          (declaration) => declaration.property === range.property
        );
        const value = parsed.values().next().value ?? source?.cascadedValue;
        const styleDecl: ComputedStyleDecl | undefined =
          value === undefined
            ? undefined
            : {
                property: range.property,
                source: {
                  ...(source?.source ?? {}),
                  name:
                    range.source === "local"
                      ? source?.source.name === "overwritten"
                        ? "overwritten"
                        : "local"
                      : (source?.source.name ?? "remote"),
                },
                cascadedValue: value,
                computedValue: source?.computedValue ?? value,
                usedValue: source?.usedValue ?? value,
              };
        if (styleDecl === undefined) {
          return null;
        }
        return {
          pos: range.from,
          end: range.to,
          create: () => {
            const dom = document.createElement("div");
            dom.className = "cm-mixed-property-tooltip";
            const root = createRoot(dom);
            const isLocal = range.source === "local";
            root.render(
              <ReadonlyProvider value={readonly}>
                <MenuList
                  onPointerDown={(event) => event.preventDefault()}
                  css={{
                    maxWidth: theme.spacing[29],
                    padding: theme.spacing[4],
                  }}
                >
                  <PropertyInfo
                    title={range.property}
                    code={line}
                    property={range.property}
                    description={
                      <>
                        {
                          propertyDescriptions[
                            camelCaseProperty(range.property)
                          ]
                        }
                        {!isLocal && <p>{blockedEditMessage}</p>}
                      </>
                    }
                    styles={[styleDecl]}
                    onReset={
                      isLocal
                        ? () => {
                            const firstLine = view.state.doc.lineAt(
                              range.declarationFrom
                            );
                            const lastLine = view.state.doc.lineAt(
                              Math.max(
                                range.declarationFrom,
                                range.declarationTo - 1
                              )
                            );
                            view.dispatch({
                              changes: {
                                from: firstLine.from,
                                to: Math.min(
                                  lastLine.to + 1,
                                  view.state.doc.length
                                ),
                              },
                            });
                            applyRef.current();
                          }
                        : undefined
                    }
                  />
                </MenuList>
              </ReadonlyProvider>
            );
            return { dom, destroy: () => root.unmount() };
          },
        };
      }),
      linter(
        (view) => parseMixedStyleBlock(view.state.doc.toString()).diagnostics
      ),
      linterTooltipTheme,
      declarationLineBreak,
      ...(inline ? [placeholder("Add local styles")] : []),
    ];
  }, [colorSwatches, inline, readonly]);

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
        ariaLabel="Styles"
        language={cssBlockLanguage}
        completionSource={mixedCompletionSource}
        autoFocus={!inline}
        initialSelection={getMixedStyleGroups(code)[0]?.contentFrom ?? 0}
        chromeless={inline}
        resetHistoryOnExternalChange
        showLineNumbers={!inline}
        readOnly={readonly}
        extensions={extensions}
        value={code}
        onChange={(value) => {
          codeRef.current = value;
          setCode(value);
        }}
        onChangeComplete={(_value, event) => {
          if (inline) {
            applyChanges();
          } else if (event === undefined) {
            applyChanges();
            onOpenChange(false);
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
      title="Styles"
      modal
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          applyChanges();
        }
        onOpenChange(nextOpen);
      }}
      content={content}
    />
  );
};

export const InlineMixedStyleBlockEditor = (
  props: Omit<Props, "inline" | "open" | "onOpenChange">
) => <MixedStyleBlockEditor {...props} inline open onOpenChange={() => {}} />;

export const MixedStyleBlockDialog = (props: Omit<Props, "inline">) => (
  <MixedStyleBlockEditor {...props} />
);
