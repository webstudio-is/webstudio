import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createRoot } from "react-dom/client";
import type { CompletionSource } from "@codemirror/autocomplete";
import { linter } from "@codemirror/lint";
import {
  findNext,
  findPrevious,
  getSearchQuery,
  search,
  SearchQuery,
  setSearchQuery,
} from "@codemirror/search";
import { EditorState, StateEffect, StateField } from "@codemirror/state";
import {
  Decoration,
  EditorView,
  hoverTooltip,
  placeholder,
  showTooltip,
  type Tooltip as CodeMirrorTooltip,
  type ViewUpdate,
  ViewPlugin,
} from "@codemirror/view";
import {
  Box,
  Flex,
  Kbd,
  MenuList,
  PanelContent,
  SearchField,
  SmallIconButton,
  styleSourceColor,
  Text,
  theme,
  Tooltip,
  tooltipContentCss,
  cssVar,
} from "@webstudio-is/design-system";
import { ChevronDownIcon, ChevronUpIcon } from "@webstudio-is/icons";
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
  EditorDialogButton,
  EditorDialogControl,
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
const renderTooltip = (className: string, content: ReactNode) => {
  const dom = document.createElement("div");
  dom.className = className;
  const root = createRoot(dom);
  root.render(content);
  return { dom, destroy: () => root.unmount() };
};
const blockedEdit = StateEffect.define<number>();
const sourceChanged = StateEffect.define<void>();
const searchMatches = StateField.define({
  create: (state) => getSearchDecorations(state),
  update: (decorations, transaction) =>
    transaction.docChanged ||
    transaction.selection !== undefined ||
    transaction.effects.some((effect) => effect.is(setSearchQuery))
      ? getSearchDecorations(transaction.state)
      : decorations,
  provide: (field) => EditorView.decorations.from(field),
});

const getSearchDecorations = (state: EditorState) => {
  const query = getSearchQuery(state);
  if (!query.valid) {
    return Decoration.none;
  }
  const { from, to } = state.selection.main;
  const matches = [];
  const cursor = query.getCursor(state);
  for (let match = cursor.next(); !match.done; match = cursor.next()) {
    matches.push(
      Decoration.mark({
        class:
          match.value.from === from && match.value.to === to
            ? "cm-style-searchMatch cm-style-searchMatch-selected"
            : "cm-style-searchMatch",
      }).range(match.value.from, match.value.to)
    );
  }
  return Decoration.set(matches, true);
};
const blockedEditTooltip = StateField.define<CodeMirrorTooltip | null>({
  create: () => null,
  update: (tooltip, transaction) => {
    const blocked = transaction.effects.find((effect) =>
      effect.is(blockedEdit)
    );
    if (blocked) {
      return {
        pos: blocked.value,
        above: true,
        create: () =>
          renderTooltip(
            "cm-mixed-blocked-tooltip",
            <Box
              className={tooltipContentCss({ variant: "wrapped" }).className}
            >
              <Text>{blockedEditMessage}</Text>
            </Box>
          ),
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
  onPreview?: (styles?: CssStyleMap) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inline?: boolean;
  searchTerm?: string;
  onEditorView?: (view: EditorView | undefined) => void;
  onSearchUpdate?: (navigation: {
    hasPrevious: boolean;
    hasNext: boolean;
  }) => void;
  onMaximize?: () => void;
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
  ".cm-mixed-preset, .cm-mixed-preset *": {
    color: `${cssVar("--foreground-secondary")} !important`,
  },
  ".cm-mixed-readonly-divider": {
    borderTop: `1px solid ${cssVar("--border-default")}`,
    paddingTop: theme.spacing[3],
  },
  ".cm-tooltip-hover:has(> .cm-mixed-property-tooltip), .cm-tooltip.cm-mixed-blocked-tooltip":
    {
      border: 0,
      background: "transparent",
      boxShadow: "none",
      padding: 0,
      pointerEvents: "auto",
    },
  ".cm-overridden-declaration": { textDecoration: "line-through" },
  ".cm-style-searchMatch": {
    backgroundColor: cssVar("--background-warning-subtle"),
  },
  ".cm-style-searchMatch-selected": {
    backgroundColor: cssVar("--background-text-selection"),
  },
  ".cm-style-searchMatch-selected, .cm-style-searchMatch-selected *": {
    color: `${cssVar("--foreground-on-text-selection")} !important`,
  },
});

const getLocalStyles = (declarations: Declaration[]): CssStyleMap =>
  new Map(
    declarations.map(({ property, value }) => [
      hyphenateProperty(property),
      value,
    ])
  );

const preserveAssetLayers = (
  stored: CssStyleMap,
  initiallyParsed: CssStyleMap,
  edited: CssStyleMap
) => {
  const result = new Map(edited);
  for (const [property, value] of edited) {
    const original = stored.get(property);
    const initial = initiallyParsed.get(property);
    if (
      original?.type !== "layers" ||
      initial?.type !== "layers" ||
      value.type !== "layers"
    ) {
      continue;
    }
    const visible = original.value.filter((layer) => layer.hidden !== true);
    if (
      visible.length !== initial.value.length ||
      visible.length !== value.value.length
    ) {
      continue;
    }
    let index = 0;
    result.set(property, {
      ...value,
      value: original.value.map((storedLayer) => {
        if (storedLayer.hidden === true) {
          return storedLayer;
        }
        const initialLayer = initial.value[index];
        const layer = value.value[index++];
        return storedLayer.type === "image" &&
          storedLayer.value.type === "asset" &&
          initialLayer.type === "keyword" &&
          initialLayer.value === "none" &&
          layer.type === "keyword" &&
          layer.value === "none"
          ? storedLayer
          : layer;
      }),
    });
  }
  return result;
};

const mixedCompletionSource: CompletionSource = (context) => {
  const end = context.state.doc.length;
  const group = getMixedStyleGroups(context.state.doc.toString()).find(
    ({ contentFrom, to }) =>
      context.pos >= contentFrom &&
      (context.pos < to || (to === end && context.pos === end))
  );
  return group?.source === "local" ? blockCompletionSource(context) : null;
};

const MixedStyleBlockEditor = ({
  declarations,
  sourceDeclarations,
  readonly,
  onApply,
  onPreview,
  open,
  onOpenChange,
  inline = false,
  searchTerm,
  onEditorView,
  onSearchUpdate,
  onMaximize,
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
  const onPreviewRef = useRef(onPreview);
  onPreviewRef.current = onPreview;

  useEffect(() => () => onPreviewRef.current?.(undefined), []);

  useEffect(() => {
    const view = editorViewRef.current;
    if (view === undefined) {
      return;
    }
    const query = new SearchQuery({ search: searchTerm ?? "", literal: true });
    view.dispatch({ effects: setSearchQuery.of(query) });
    if (query.valid) {
      const first = query.getCursor(view.state).next();
      if (!first.done) {
        view.dispatch({
          selection: { anchor: first.value.from, head: first.value.to },
          effects: EditorView.scrollIntoView(first.value.from),
        });
      }
    }
  }, [searchTerm]);

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
    const wasOpen = wasOpenRef.current;
    wasOpenRef.current = open;
    if (
      !open ||
      (wasOpen && (!inline || codeRef.current !== cleanCodeRef.current))
    ) {
      return;
    }
    const localStyles = getLocalStyles(declarations);
    const nextCode = formatMixedStyleBlock(
      localStyles,
      sourceDeclarations,
      $cssVarsMap.get()
    );
    if (!wasOpen || nextCode !== cleanCodeRef.current) {
      setInitialStyles(localStyles, nextCode);
    } else {
      oldStylesRef.current = localStyles;
      sourceSnapshotRef.current = sourceDeclarations;
      editorViewRef.current?.dispatch({ effects: sourceChanged.of() });
    }
  }, [open, inline, declarations, sourceDeclarations, setInitialStyles]);

  const applyChanges = () => {
    if (codeRef.current === appliedCodeRef.current) {
      onPreview?.(undefined);
      return;
    }
    const parsed = parseMixedStyleBlock(codeRef.current);
    const appliedStyles = onApply({
      oldStyles: oldStylesRef.current,
      initialParsedStyles: initialParsedRef.current,
      newStyles: preserveAssetLayers(
        oldStylesRef.current,
        initialParsedRef.current,
        parsed.styleMap
      ),
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
    onPreview?.(undefined);
  };
  applyRef.current = inline ? applyChanges : () => {};

  const colorSwatches = useMemo(
    () => createColorSwatches(() => applyRef.current()),
    []
  );
  const extensions = useMemo(() => {
    const notifySearchUpdate = (view: EditorView) => {
      if (onSearchUpdate === undefined) {
        return;
      }
      const query = getSearchQuery(view.state);
      const { from, to } = view.state.selection.main;
      let hasPrevious = false;
      let hasNext = false;
      if (query.valid) {
        const cursor = query.getCursor(view.state);
        for (let match = cursor.next(); !match.done; match = cursor.next()) {
          hasPrevious ||= match.value.to <= from;
          hasNext ||= match.value.from >= to;
          if (hasPrevious && hasNext) {
            break;
          }
        }
      }
      onSearchUpdate({ hasPrevious, hasNext });
    };
    const decorate = (value: string) =>
      Decoration.set(
        [
          ...getMixedStyleGroups(value)
            .slice(1, 2)
            .map(({ from }) =>
              Decoration.line({ class: "cm-mixed-readonly-divider" }).range(
                from
              )
            ),
          ...getMixedPropertyRanges(value).map((range) => {
            let source = range.source === "preset" ? "preset" : "remote";
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
      search(),
      searchMatches,
      ViewPlugin.fromClass(
        class {
          constructor(view: EditorView) {
            editorViewRef.current = view;
            onEditorView?.(view);
            notifySearchUpdate(view);
          }
          update(update: ViewUpdate) {
            if (
              update.docChanged ||
              update.selectionSet ||
              update.transactions.some((transaction) =>
                transaction.effects.some((effect) => effect.is(setSearchQuery))
              )
            ) {
              notifySearchUpdate(update.view);
            }
          }
          destroy() {
            editorViewRef.current = undefined;
            onEditorView?.(undefined);
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
            const isLocal = range.source === "local";
            return renderTooltip(
              "cm-mixed-property-tooltip",
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
                            const doc = view.state.doc;
                            let from = range.declarationFrom;
                            let to = range.declarationTo;
                            if (doc.sliceString(to, to + 1) === ";") {
                              to += 1;
                            }
                            const firstLine = doc.lineAt(from);
                            const lastLine = doc.lineAt(Math.max(from, to - 1));
                            if (
                              doc.sliceString(firstLine.from, from).trim() ===
                                "" &&
                              doc.sliceString(to, lastLine.to).trim() === ""
                            ) {
                              from = firstLine.from;
                              to = Math.min(lastLine.to + 1, doc.length);
                            }
                            view.dispatch({
                              changes: { from, to },
                            });
                            applyRef.current();
                          }
                        : undefined
                    }
                  />
                </MenuList>
              </ReadonlyProvider>
            );
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
  }, [colorSwatches, inline, readonly, onEditorView, onSearchUpdate]);

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
          onPreview?.(
            preserveAssetLayers(
              oldStylesRef.current,
              initialParsedRef.current,
              parseMixedStyleBlock(value).styleMap
            )
          );
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
    return (
      <EditorDialogControl>
        {content}
        {onMaximize && (
          <Tooltip
            content={
              <Flex align="center" gap="1">
                <Text>Edit local styles</Text>
                <Kbd value={["alt", "shift", "x"]} color="moreSubtle" />
              </Flex>
            }
          >
            <EditorDialogButton
              aria-label="Edit local styles"
              disabled={readonly}
              onClick={onMaximize}
            />
          </Tooltip>
        )}
      </EditorDialogControl>
    );
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

export const InlineMixedStyleBlockEditor = ({
  searchStickyTop,
  ...props
}: Omit<
  Props,
  | "inline"
  | "open"
  | "onOpenChange"
  | "searchTerm"
  | "onEditorView"
  | "onSearchUpdate"
> & { searchStickyTop?: string }) => {
  const [searchTerm, setSearchTerm] = useState<string>();
  const [searchNavigation, setSearchNavigation] = useState({
    hasPrevious: false,
    hasNext: false,
  });
  const editorRef = useRef<EditorView>();
  const handleEditorView = useCallback((view: EditorView | undefined) => {
    editorRef.current = view;
  }, []);
  const moveSearch = (direction: "previous" | "next") => {
    const view = editorRef.current;
    if (
      view === undefined ||
      (direction === "previous"
        ? !searchNavigation.hasPrevious
        : !searchNavigation.hasNext)
    ) {
      return;
    }
    (direction === "previous" ? findPrevious : findNext)(view);
  };
  return (
    <>
      <PanelContent
        css={{
          position: searchStickyTop === undefined ? undefined : "sticky",
          top: searchStickyTop,
          zIndex: 1,
          background: cssVar("--background-primary"),
        }}
      >
        <SearchField
          suffix={
            searchTerm ? (
              <>
                <SmallIconButton
                  aria-label="Previous match"
                  icon={<ChevronUpIcon />}
                  bleed={false}
                  disabled={!searchNavigation.hasPrevious}
                  onClick={() => moveSearch("previous")}
                />
                <SmallIconButton
                  aria-label="Next match"
                  icon={<ChevronDownIcon />}
                  bleed={false}
                  disabled={!searchNavigation.hasNext}
                  onClick={() => moveSearch("next")}
                />
              </>
            ) : undefined
          }
          onChange={(event) => setSearchTerm(event.target.value || undefined)}
          onAbort={() => setSearchTerm(undefined)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              moveSearch(event.shiftKey ? "previous" : "next");
            }
          }}
        />
      </PanelContent>
      <MixedStyleBlockEditor
        {...props}
        inline
        open
        onOpenChange={() => {}}
        searchTerm={searchTerm}
        onEditorView={handleEditorView}
        onSearchUpdate={setSearchNavigation}
      />
    </>
  );
};

export const MixedStyleBlockDialog = (props: Omit<Props, "inline">) => (
  <MixedStyleBlockEditor {...props} />
);
