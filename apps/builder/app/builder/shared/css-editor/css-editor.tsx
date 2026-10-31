import { mergeRefs } from "@react-aria/utils";
import { EditorView } from "@codemirror/view";
import { color } from "@webstudio-is/css-engine";
import {
  memo,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ComponentProps,
  type ReactNode,
  type RefObject,
} from "react";
import { matchSorter } from "match-sorter";
import {
  PanelContent,
  Box,
  Flex,
  InputField,
  SearchField,
  Separator,
  Text,
  theme,
  toast,
  Tooltip,
  cssVar,
  styleSourceColor,
} from "@webstudio-is/design-system";
import {
  camelCaseProperty,
  keywordValues,
  propertiesData,
  propertyDescriptions,
} from "@webstudio-is/css-data";
import {
  toValue,
  type CssProperty,
  type CssStyleMap,
  type ImageValue,
  type StyleValue,
} from "@webstudio-is/css-engine";
// @todo all style panel stuff needs to be moved to shared and/or decoupled from style panel
import { CssValueInputContainer } from "../../features/style-panel/shared/css-value-input";
import { CssFragmentEditorContent } from "../../features/style-panel/shared/css-fragment";
import { parseIntermediateOrInvalidValue } from "../../features/style-panel/shared/css-value-input/parse-intermediate-or-invalid-value";
import {
  $availableVariables,
  $cssVarsMap,
} from "../../features/style-panel/shared/model";
import { PropertyInfo } from "../../features/style-panel/property-label";
import { ColorPicker } from "@webstudio-is/design-system";
import { useClientSupports } from "~/shared/client-supports";
import { CssEditorContextMenu, copyAttribute } from "./css-editor-context-menu";
import { AddStyleInput } from "./add-style-input";
import { parsePropertyName, parseStyleInput } from "./parse-style-input";
import type {
  DeleteProperty,
  SetProperty,
} from "../../features/style-panel/shared/use-style-data";
import type { ComputedStyleDecl } from "~/shared/style-object-model";
import { PropertyStatusIndicator } from "../../features/style-panel/property-status";
import {
  getCodeEditorCssVars,
  type EditorApi,
} from "~/shared/code-editor-base";

// Used to indent the values when they are on the next line. This way its easier to see
// where the property ends and value begins, especially in case of presets.
const initialIndentation = `20px`;

const AdvancedPropertyLabel = ({
  styleDecl,
  readonly,
  existingProperties,
  onRenameProperty,
  onReset,
  onDeleteProperty,
}: {
  styleDecl: ComputedStyleDecl;
  readonly: boolean;
  existingProperties: ReadonlyMap<CssProperty, ComputedStyleDecl>;
  onRenameProperty: (
    oldProperty: CssProperty,
    newProperty: CssProperty,
    value: StyleValue
  ) => void;
  onReset?: () => void;
  onDeleteProperty: DeleteProperty;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState<string>(styleDecl.property);
  const nameRef = useRef(name);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current = styleDecl.property;
    setName(styleDecl.property);
  }, [styleDecl.property]);

  const resetName = () => {
    nameRef.current = styleDecl.property;
    setName(styleDecl.property);
  };

  const completeRename = () => {
    const nextName = nameRef.current.trim();
    if (nextName === styleDecl.property) {
      resetName();
      return;
    }
    const nextProperty = parsePropertyName(nextName, $cssVarsMap.get());
    if (
      nextProperty === undefined ||
      existingProperties.has(nextProperty) ||
      cannotRoundTripAsCssText(styleDecl.cascadedValue, true) ||
      (styleDecl.source.name !== "local" &&
        styleDecl.source.name !== "overwritten")
    ) {
      resetName();
      return;
    }
    const assetImages = new Map<string, ImageValue>();
    const value = toValue(styleDecl.cascadedValue, (styleValue) => {
      if (styleValue.type === "image" && styleValue.value.type === "asset") {
        const placeholder = `webstudio-asset-${assetImages.size}`;
        assetImages.set(placeholder, styleValue);
        return {
          ...styleValue,
          value: { type: "url", url: placeholder },
        };
      }
    });
    const { styleMap } = parseStyleInput(
      `${nextProperty}: ${value}`,
      $cssVarsMap.get()
    );
    const nextValue = styleMap.get(nextProperty);
    if (nextValue === undefined || nextValue.type === "invalid") {
      resetName();
      return;
    }
    let restoredAssets = 0;
    const restoreImage = (image: ImageValue) => {
      const asset =
        image.value.type === "url"
          ? assetImages.get(image.value.url)
          : undefined;
      if (asset !== undefined) {
        restoredAssets += 1;
      }
      return asset ?? image;
    };
    const renamedValue =
      nextValue.type === "image"
        ? restoreImage(nextValue)
        : nextValue.type === "layers"
          ? {
              ...nextValue,
              value: nextValue.value.map((layer) =>
                layer.type === "image" ? restoreImage(layer) : layer
              ),
            }
          : nextValue;
    if (restoredAssets !== assetImages.size) {
      resetName();
      return;
    }
    onRenameProperty(styleDecl.property, nextProperty, renamedValue);
  };

  const description =
    propertyDescriptions[camelCaseProperty(styleDecl.property)];
  const sourceColor =
    styleDecl.source.name === "local" ||
    styleDecl.source.name === "remote" ||
    styleDecl.source.name === "overwritten"
      ? styleSourceColor[styleDecl.source.name]
      : undefined;

  return (
    <Tooltip
      open={isOpen}
      onOpenChange={(open) => {
        if (open && document.activeElement === nameInputRef.current) {
          return;
        }
        setIsOpen(open);
      }}
      // prevent closing tooltip on content click
      onPointerDown={(event) => event.preventDefault()}
      triggerProps={{
        onClick: (event) => {
          setIsOpen(false);
          if (event.altKey) {
            event.preventDefault();
            onDeleteProperty(styleDecl.property);
            onReset?.();
            return;
          }
        },
      }}
      content={
        <PropertyInfo
          title={
            styleDecl.property.startsWith("--")
              ? "CSS variable"
              : styleDecl.property
          }
          description={description}
          styles={[styleDecl]}
          onReset={() => {
            onDeleteProperty(styleDecl.property);
            setIsOpen(false);
            onReset?.();
          }}
          resetType="delete"
          link={propertiesData[styleDecl.property]?.mdnUrl}
        />
      }
    >
      <InputField
        aria-label={`Property name: ${styleDecl.property}`}
        inputRef={nameInputRef}
        onFocus={() => setIsOpen(false)}
        variant="chromeless"
        text="mono"
        fieldSizing="content"
        readOnly={
          readonly ||
          (styleDecl.source.name !== "local" &&
            styleDecl.source.name !== "overwritten")
        }
        value={name}
        onChange={(event) => {
          nameRef.current = event.target.value;
          setName(event.target.value);
        }}
        onBlur={completeRename}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            event.currentTarget.blur();
          }
          if (event.key === "Escape") {
            resetName();
          }
        }}
        css={{
          backgroundColor: "transparent",
          marginLeft: `-${initialIndentation}`,
          "& input": {
            marginLeft: 0,
            paddingLeft: theme.spacing[2],
            color: sourceColor?.foreground,
          },
          "&:hover": { backgroundColor: sourceColor?.background },
        }}
      />
    </Tooltip>
  );
};

const cannotRoundTripAsCssText = (
  value: StyleValue,
  allowAssets = false
): boolean => {
  if (value.hidden === true) {
    return true;
  }
  if (value.type === "image") {
    return !allowAssets && value.value.type === "asset";
  }
  if (value.type === "layers" || value.type === "tuple") {
    return value.value.some((part) =>
      cannotRoundTripAsCssText(part, allowAssets)
    );
  }
  if (value.type === "function") {
    return cannotRoundTripAsCssText(value.args, allowAssets);
  }
  if (value.type === "var") {
    return (
      value.fallback !== undefined &&
      cannotRoundTripAsCssText(value.fallback, allowAssets)
    );
  }
  if (value.type === "color") {
    return (
      typeof value.alpha !== "number" &&
      cannotRoundTripAsCssText(value.alpha, allowAssets)
    );
  }
  if (value.type === "shadow") {
    return [
      value.offsetX,
      value.offsetY,
      value.blur,
      value.spread,
      value.color,
    ].some(
      (part) =>
        part !== undefined && cannotRoundTripAsCssText(part, allowAssets)
    );
  }
  return false;
};

const AdvancedPropertyValue = ({
  styleDecl,
  readonly = false,
  onDeleteProperty,
  onSetProperty,
  onChangeComplete,
  onReset,
  inputRef: inputRefProp,
}: {
  styleDecl: ComputedStyleDecl;
  readonly?: boolean;
  onDeleteProperty: DeleteProperty;
  onSetProperty: SetProperty;
  onChangeComplete?: (event: { type: string }, atEnd: boolean) => void;
  onReset: ComponentProps<typeof CssValueInputContainer>["onReset"];
  inputRef?: RefObject<HTMLInputElement>;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<EditorApi>();
  const selectionRef = useRef(0);
  const closingRef = useRef(false);
  const keyboardSubmitRef = useRef(false);
  const [multilineValue, setMultilineValue] = useState<string>();
  const [invalidMultilineValue, setInvalidMultilineValue] = useState(false);
  const isMultiline = multilineValue !== undefined;

  useEffect(() => {
    if (isMultiline) {
      editorRef.current?.setSelection(selectionRef.current);
    }
  }, [isMultiline]);

  let isColor = false;
  try {
    color.parse(toValue(styleDecl.usedValue));
    isColor = true;
  } catch {
    isColor = false;
  }

  if (multilineValue !== undefined) {
    return (
      <Box
        css={{
          width: "100%",
          ...getCodeEditorCssVars({ minHeight: "3lh", maxHeight: "6lh" }),
        }}
      >
        <CssFragmentEditorContent
          ariaLabel={styleDecl.property}
          editorApiRef={editorRef}
          autoFocus
          invalid={invalidMultilineValue}
          value={multilineValue}
          onChange={(value) => {
            setMultilineValue(value);
            setInvalidMultilineValue(false);
          }}
          onChangeComplete={(value) => {
            if (closingRef.current) {
              closingRef.current = false;
              return;
            }
            const parsed = parseIntermediateOrInvalidValue(
              styleDecl.property,
              { type: "intermediate", value },
              styleDecl.cascadedValue.type === "unit"
                ? styleDecl.cascadedValue.unit
                : undefined,
              value
            );
            if (parsed.type === "invalid") {
              keyboardSubmitRef.current = false;
              setInvalidMultilineValue(true);
              return;
            }
            closingRef.current = true;
            onSetProperty(styleDecl.property)(parsed, { listed: true });
            setMultilineValue(undefined);
            if (keyboardSubmitRef.current) {
              requestAnimationFrame(() => inputRef.current?.focus());
              keyboardSubmitRef.current = false;
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              keyboardSubmitRef.current = true;
            }
            if (event.key === "Escape") {
              event.preventDefault();
              closingRef.current = true;
              setMultilineValue(undefined);
              requestAnimationFrame(() => inputRef.current?.focus());
            }
          }}
        />
      </Box>
    );
  }

  return (
    <CssValueInputContainer
      inputRef={mergeRefs(inputRef, inputRefProp)}
      variant="chromeless"
      text="mono"
      fieldSizing="content"
      disabled={readonly}
      prefix={
        isColor && (
          <ColorPicker
            disabled={readonly}
            value={styleDecl.usedValue}
            onChange={(styleValue) => {
              const options = { isEphemeral: true, listed: true };
              if (styleValue) {
                onSetProperty(styleDecl.property)(styleValue, options);
              } else {
                onDeleteProperty(styleDecl.property, options);
              }
            }}
            onChangeComplete={(styleValue) => {
              onSetProperty(styleDecl.property)(styleValue, { listed: true });
            }}
          />
        )
      }
      property={styleDecl.property}
      styleSource={styleDecl.source.name}
      getOptions={() => [
        ...(keywordValues[styleDecl.property] ?? []).map((value) => ({
          type: "keyword" as const,
          value,
        })),
        ...$availableVariables.get(),
      ]}
      value={styleDecl.cascadedValue}
      onShiftEnter={(event) => {
        if (cannotRoundTripAsCssText(styleDecl.cascadedValue)) {
          return;
        }
        const input = event.currentTarget;
        const start = input.selectionStart ?? input.value.length;
        const end = input.selectionEnd ?? start;
        const isCollapsedVariable =
          styleDecl.cascadedValue.type === "var" &&
          input.value === `--${styleDecl.cascadedValue.value}`;
        const unit =
          styleDecl.cascadedValue.type === "unit" &&
          styleDecl.cascadedValue.unit !== "number" &&
          input.value.trim() !== "" &&
          Number.isFinite(Number(input.value))
            ? styleDecl.cascadedValue.unit
            : "";
        const value = isCollapsedVariable
          ? toValue(styleDecl.cascadedValue)
          : `${input.value}${unit}`;
        let insertionPoint = start;
        let replacementEnd = end;
        if (isCollapsedVariable) {
          if (start === 0 && end === input.value.length) {
            replacementEnd = value.length;
          } else if (start === end && end === input.value.length) {
            insertionPoint = value.length;
            replacementEnd = value.length;
          } else {
            insertionPoint += 4;
            replacementEnd += 4;
          }
        } else if (start === input.value.length && end === start) {
          insertionPoint += unit.length;
          replacementEnd = insertionPoint;
        }
        selectionRef.current = insertionPoint + 1;
        closingRef.current = false;
        keyboardSubmitRef.current = false;
        setMultilineValue(
          `${value.slice(0, insertionPoint)}\n${value.slice(replacementEnd)}`
        );
      }}
      onEnter={() => {
        const input = inputRef.current;
        return (
          input !== null &&
          input.selectionStart === input.value.length &&
          input.selectionEnd === input.value.length
        );
      }}
      onUpdate={(styleValue, options) => {
        if (
          styleValue.type === "keyword" &&
          styleValue.value.startsWith("--")
        ) {
          onSetProperty(styleDecl.property)(
            { type: "var", value: styleValue.value.slice(2) },
            { ...options, listed: true }
          );
        } else {
          onSetProperty(styleDecl.property)(styleValue, {
            ...options,
            listed: true,
          });
        }
      }}
      onDelete={(options) => onDeleteProperty(styleDecl.property, options)}
      onChangeComplete={(event) => {
        const input = inputRef.current;
        onChangeComplete?.(
          event,
          input !== null &&
            input.selectionStart === input.value.length &&
            input.selectionEnd === input.value.length
        );
      }}
      onReset={onReset}
    />
  );
};

/**
 * The Advanced section in the Style Panel on </> Global root has performance issues.
 * To fix this, we skip rendering properties not visible in the viewport using the contentvisibilityautostatechange event,
 * and the contentVisibility and containIntrinsicSize CSS properties.
 */
const LazyRender = ({ children }: ComponentProps<"div">) => {
  const visibilityChangeEventSupported = useClientSupports(
    () => "oncontentvisibilityautostatechange" in document.body
  );
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(!visibilityChangeEventSupported);

  useEffect(() => {
    if (!visibilityChangeEventSupported) {
      return;
    }

    if (ref.current == null) {
      return;
    }

    const controller = new AbortController();

    ref.current.addEventListener(
      "contentvisibilityautostatechange",
      (event) => {
        setIsVisible(!event.skipped);
      },
      {
        signal: controller.signal,
      }
    );

    return () => {
      controller.abort();
    };
  }, [visibilityChangeEventSupported]);

  return (
    <div
      ref={ref}
      style={{
        display: "inline-block",
        contentVisibility: "auto",
        // https://developer.mozilla.org/en-US/docs/Web/CSS/contain-intrinsic-size
        // containIntrinsicSize is used to set the default size of an element before any content is loaded.
        // This helps in preventing layout shifts and provides a better user experience by maintaining a consistent layout.
        // It also affects the contentvisibilityautostatechange event to be called properly,
        // with "auto" it will call it with skipped false for all initial elements.
        // 44px is the height of the property row with 2 lines of text. This value can be adjusted slightly.
        containIntrinsicSize: "auto 44px",
      }}
    >
      {isVisible ? children : undefined}
    </div>
  );
};

const AdvancedDeclarationLonghand = memo(
  ({
    styleDecl,
    readonly = false,
    onChangeComplete,
    onDeleteProperty,
    onSetProperty,
    onRenameProperty,
    existingProperties,
    onReset,
    valueInputRef,
    indentation = initialIndentation,
  }: {
    styleDecl: ComputedStyleDecl;
    readonly?: boolean;
    indentation?: string;
    onReset?: () => void;
    onSetProperty: SetProperty;
    onRenameProperty: (
      oldProperty: CssProperty,
      newProperty: CssProperty,
      value: StyleValue
    ) => void;
    existingProperties: ReadonlyMap<CssProperty, ComputedStyleDecl>;
    onDeleteProperty: DeleteProperty;
    onChangeComplete?: (event: { type: string }, atEnd: boolean) => void;
    valueInputRef?: RefObject<HTMLInputElement>;
  }) => {
    return (
      <Flex
        css={{ paddingLeft: indentation }}
        wrap="wrap"
        align="center"
        justify="start"
        {...{ [copyAttribute]: styleDecl.property }}
      >
        <AdvancedPropertyLabel
          styleDecl={styleDecl}
          readonly={readonly}
          existingProperties={existingProperties}
          onRenameProperty={onRenameProperty}
          onReset={onReset}
          onDeleteProperty={onDeleteProperty}
        />
        <Text
          variant="mono"
          // Improves the visual separation of value from the property.
          css={{
            textIndent: "-0.5ch",
            fontWeight: "bold",
          }}
        >
          :
        </Text>
        <AdvancedPropertyValue
          styleDecl={styleDecl}
          readonly={readonly}
          onChangeComplete={onChangeComplete}
          onReset={onReset}
          onDeleteProperty={onDeleteProperty}
          onSetProperty={onSetProperty}
          inputRef={valueInputRef}
        />
        <PropertyStatusIndicator property={styleDecl.property} />
      </Flex>
    );
  }
);

const DraftRow = ({
  children,
  css,
  rowRef,
  onUnmount,
}: {
  children: ReactNode;
  css: ComponentProps<typeof Box>["css"];
  rowRef: RefObject<HTMLDivElement>;
  onUnmount: (row: HTMLDivElement | null) => void;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const onUnmountRef = useRef(onUnmount);
  onUnmountRef.current = onUnmount;
  useLayoutEffect(() => () => onUnmountRef.current(ref.current), []);
  return (
    <Box ref={mergeRefs(ref, rowRef)} css={css}>
      {children}
    </Box>
  );
};

export const CssEditor = ({
  onDeleteProperty,
  onSetProperty,
  onRenameProperty,
  onAddDeclarations,
  onDeleteAllDeclarations,
  declarations,
  existingDeclarations = declarations,
  readonly = false,
  showSearch = true,
  virtualize = true,
  propertiesPosition = "bottom",
  recentProperties = [],
  showAddStyleInput,
  onToggleAddStyleInput,
}: {
  declarations: Array<ComputedStyleDecl>;
  existingDeclarations?: Array<ComputedStyleDecl>;
  onDeleteProperty: DeleteProperty;
  onSetProperty: SetProperty;
  onRenameProperty: (
    oldProperty: CssProperty,
    newProperty: CssProperty,
    value: StyleValue
  ) => void;
  onAddDeclarations: (styleMap: CssStyleMap) => void;
  onDeleteAllDeclarations: (styleMap: CssStyleMap) => void;
  readonly?: boolean;
  showSearch?: boolean;
  propertiesPosition?: "top" | "bottom";
  virtualize?: boolean;
  recentProperties?: Array<CssProperty>;
  showAddStyleInput?: boolean;
  onToggleAddStyleInput?: (show: boolean) => void;
}) => {
  const addPropertyInputRef = useRef<HTMLInputElement>(null);
  const hasAddStyleDraftRef = useRef(false);
  const draftRowRef = useRef<HTMLDivElement>(null);
  const draftPropertyInputRef = useRef<HTMLInputElement>(null);
  const draftValueInputRef = useRef<HTMLInputElement>(null);
  const draftEditorRef = useRef<EditorApi>();
  const relocatedDraftFocusRef = useRef<
    | { field: "property" | "value"; start: number; end: number }
    | { field: "editor"; selection: { anchor: number; head: number } }
  >();
  const draftSelectionRef = useRef(0);
  const closingDraftRef = useRef(false);
  const draftKeyboardSubmitRef = useRef(false);
  const switchingDraftRef = useRef(false);
  const wasDraftPropertySetRef = useRef(false);
  const lastRecentValueInputRef = useRef<HTMLInputElement>(null);
  const lastRegularValueInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [newEntryAfter, setNewEntryAfter] = useState<CssProperty>();
  const [draftPropertyName, setDraftPropertyName] = useState<string>();
  const [draftValue, setDraftValue] = useState("");
  const [draftMultiline, setDraftMultiline] = useState(false);
  const [invalidDraft, setInvalidDraft] = useState(false);
  const [searchTerm, setSearchTerm] = useState<string>();
  const containerRef = useRef<HTMLDivElement>(null);

  const effectiveShowAddStyleInput = readonly ? false : showAddStyleInput;
  const guardedSetProperty: SetProperty = readonly
    ? () => () => undefined
    : onSetProperty;
  const guardedToggleAddStyleInput = readonly
    ? undefined
    : onToggleAddStyleInput;

  useEffect(() => {
    if (effectiveShowAddStyleInput) {
      addPropertyInputRef.current?.focus();
    }
  }, [effectiveShowAddStyleInput]);

  useEffect(() => {
    if (newEntryAfter !== undefined) {
      addPropertyInputRef.current?.focus();
    }
  }, [newEntryAfter]);

  useEffect(() => {
    const isDraftPropertySet = draftPropertyName !== undefined;
    if (isDraftPropertySet && !wasDraftPropertySetRef.current) {
      if (draftPropertyName === "") {
        draftPropertyInputRef.current?.focus();
      } else {
        draftValueInputRef.current?.focus();
      }
    }
    wasDraftPropertySetRef.current = isDraftPropertySet;
  }, [draftPropertyName]);

  useEffect(() => {
    if (draftMultiline) {
      draftEditorRef.current?.setSelection(draftSelectionRef.current);
      switchingDraftRef.current = false;
    }
  }, [draftMultiline]);

  const declarationsMap = new Map(
    declarations.map((decl) => [decl.property, decl])
  );
  const existingDeclarationsMap = new Map(
    existingDeclarations
      .filter((decl) => decl.source.name !== "default")
      .map((decl) => [decl.property, decl])
  );

  const advancedProperties = declarations.map(({ property }) => property);
  const searchProperties = useMemo(() => {
    if (searchTerm === undefined) {
      return undefined;
    }
    const styles = declarations.map(({ property, cascadedValue }) => ({
      key: `${property.replaceAll("-", " ")} ${toValue(cascadedValue)}`,
      property,
    }));
    return matchSorter(styles, searchTerm, { keys: ["key"] }).map(
      ({ property }) => property
    );
  }, [declarations, searchTerm]);

  const currentProperties =
    searchProperties ??
    advancedProperties.filter(
      (property) => recentProperties.includes(property) === false
    );

  const showRecentProperties =
    recentProperties.length > 0 && searchProperties === undefined;
  const draftAnchor =
    newEntryAfter !== undefined &&
    declarationsMap.has(newEntryAfter) &&
    (currentProperties.includes(newEntryAfter) ||
      (showRecentProperties && recentProperties.includes(newEntryAfter)))
      ? newEntryAfter
      : undefined;

  useLayoutEffect(() => {
    const focused = relocatedDraftFocusRef.current;
    if (focused === undefined || focused.field === "editor") {
      return;
    }
    relocatedDraftFocusRef.current = undefined;
    if (
      draftPropertyName === undefined ||
      document.activeElement !== document.body
    ) {
      return;
    }
    const input =
      focused.field === "property"
        ? draftPropertyInputRef.current
        : draftValueInputRef.current;
    input?.focus();
    input?.setSelectionRange(focused.start, focused.end);
  }, [draftAnchor, draftPropertyName]);

  useEffect(() => {
    const focused = relocatedDraftFocusRef.current;
    if (focused?.field !== "editor") {
      return;
    }
    relocatedDraftFocusRef.current = undefined;
    if (
      draftPropertyName === undefined ||
      document.activeElement !== document.body
    ) {
      return;
    }
    const content =
      draftRowRef.current?.querySelector<HTMLElement>(".cm-content");
    const view = content && EditorView.findFromDOM(content);
    if (view) {
      const { anchor, head } = focused.selection;
      view.dispatch({
        selection: {
          anchor: Math.min(anchor, view.state.doc.length),
          head: Math.min(head, view.state.doc.length),
        },
      });
      view.focus();
    }
  }, [draftAnchor, draftPropertyName]);

  const captureDraftFocus = (row: HTMLDivElement | null) => {
    const active = document.activeElement;
    if (row === null || !row.contains(active)) {
      return;
    }
    if (
      active instanceof HTMLInputElement &&
      (active === draftPropertyInputRef.current ||
        active === draftValueInputRef.current)
    ) {
      relocatedDraftFocusRef.current = {
        field: active === draftPropertyInputRef.current ? "property" : "value",
        start: active.selectionStart ?? active.value.length,
        end: active.selectionEnd ?? active.value.length,
      };
    } else if (
      active instanceof HTMLElement &&
      active.classList.contains("cm-content")
    ) {
      const selection = EditorView.findFromDOM(active)?.state.selection.main;
      relocatedDraftFocusRef.current = {
        field: "editor",
        selection: selection ?? { anchor: 0, head: 0 },
      };
    }
  };

  const handleInsertStyles = (cssText: string, requireAllValid = false) => {
    if (readonly) {
      return new Map();
    }
    const { styleMap, errors, hasSyntaxErrors } = parseStyleInput(
      cssText,
      $cssVarsMap.get()
    );
    for (const error of errors) {
      toast.error(error);
    }
    if (
      styleMap.size === 0 ||
      (requireAllValid &&
        (errors.length > 0 ||
          hasSyntaxErrors ||
          [...styleMap.values()].some((value) => value.type === "invalid")))
    ) {
      return new Map();
    }
    onAddDeclarations(styleMap);
    return styleMap;
  };

  const handleAbortSearch = () => {
    if (containerRef.current) {
      containerRef.current.style.minHeight = "auto";
    }
    setSearchTerm(undefined);
  };

  const handleSearch = (event: ChangeEvent<HTMLInputElement>) => {
    const search = event.target.value.trim().replaceAll("-", " ");

    if (search === "") {
      return handleAbortSearch();
    }
    // This keeps container height big enough to avoid scroll position jumping around while user types.
    if (containerRef.current) {
      containerRef.current.style.height = `${window.innerHeight}px`;
      // Min height is needed as long as the search is active.
      containerRef.current.style.minHeight = `${window.innerHeight}px`;
      requestAnimationFrame(() => {
        // We can't keep it permanently because we need user to see all of the content.
        // Fixed height only needed temporarily while react rerenders the tree to avoid jumps.
        if (containerRef.current) {
          containerRef.current.style.height = "auto";
        }
      });
    }

    setSearchTerm(search);
  };

  const afterChangingStyles = (focusValue = true) => {
    setNewEntryAfter(undefined);
    setDraftPropertyName(undefined);
    setDraftValue("");
    setDraftMultiline(false);
    setInvalidDraft(false);
    guardedToggleAddStyleInput?.(false);
    if (!focusValue) {
      return;
    }
    requestAnimationFrame(() => {
      // We are either focusing the last value input from the recent list if available or the search input.
      const element =
        lastRecentValueInputRef.current ??
        lastRegularValueInputRef.current ??
        searchInputRef.current;

      element?.focus();
      element?.select();
    });
  };

  const handleRenameProperty = (
    oldProperty: CssProperty,
    newProperty: CssProperty,
    value: StyleValue
  ) => {
    if (readonly || oldProperty === newProperty) {
      return;
    }
    if (newEntryAfter === oldProperty) {
      setNewEntryAfter(newProperty);
    }
    onRenameProperty(oldProperty, newProperty, value);
  };

  const startNewEntry = (property: CssProperty) => {
    if (
      draftAnchor !== undefined ||
      draftPropertyName !== undefined ||
      hasAddStyleDraftRef.current
    ) {
      if (draftPropertyName !== undefined) {
        if (draftMultiline) {
          draftEditorRef.current?.focus();
        } else if (draftPropertyName === "") {
          draftPropertyInputRef.current?.focus();
        } else {
          draftValueInputRef.current?.focus();
        }
      } else {
        addPropertyInputRef.current?.focus();
      }
      return;
    }
    closingDraftRef.current = false;
    draftKeyboardSubmitRef.current = false;
    switchingDraftRef.current = false;
    setDraftPropertyName("");
    setDraftValue("");
    setDraftMultiline(false);
    setInvalidDraft(false);
    setNewEntryAfter(property);
    guardedToggleAddStyleInput?.(true);
  };

  const completeDraft = (value = draftValue, focusValue = true) => {
    if (draftPropertyName === undefined) {
      return false;
    }
    if (draftPropertyName.trim() === "" && value.trim() === "") {
      afterChangingStyles(focusValue);
      return true;
    }
    const property = parsePropertyName(draftPropertyName, $cssVarsMap.get());
    if (property === undefined) {
      setInvalidDraft(true);
      return false;
    }
    const styles = handleInsertStyles(`${property}: ${value}`, true);
    if (styles.size === 0) {
      setInvalidDraft(true);
      return false;
    }
    afterChangingStyles(focusValue);
    return true;
  };

  const handleDeleteProperty: DeleteProperty = (property, options = {}) => {
    if (readonly) {
      return;
    }
    onDeleteProperty(property, options);
    if (options.isEphemeral === true) {
      return;
    }
    if (newEntryAfter === property) {
      setNewEntryAfter(undefined);
    }
  };

  const handleDeleteAllDeclarations = (styleMap: CssStyleMap) => {
    if (readonly) {
      return;
    }
    onDeleteAllDeclarations(styleMap);
  };

  const addStyleInput = (
    <DraftRow
      rowRef={draftRowRef}
      onUnmount={captureDraftFocus}
      css={
        effectiveShowAddStyleInput
          ? draftAnchor === undefined && draftPropertyName === undefined
            ? { paddingTop: theme.spacing[3] }
            : { paddingLeft: initialIndentation }
          : { overflow: "hidden", height: 0 }
      }
    >
      {draftPropertyName === undefined ? (
        <AddStyleInput
          inline={draftAnchor !== undefined}
          onSubmit={(cssText: string, focusValue = true) => {
            const property =
              draftAnchor === undefined
                ? undefined
                : parsePropertyName(cssText, $cssVarsMap.get());
            if (property !== undefined) {
              setDraftPropertyName(property);
              return true;
            }
            const styles = handleInsertStyles(cssText, true);
            if (styles.size > 0) {
              afterChangingStyles(focusValue);
            }
            return styles.size > 0;
          }}
          onClose={afterChangingStyles}
          onFocus={() => guardedToggleAddStyleInput?.(true)}
          onDraftChange={(hasDraft) => {
            hasAddStyleDraftRef.current = hasDraft;
          }}
          onBlur={(hasDraft) => {
            if (hasDraft) {
              return;
            }
            setNewEntryAfter(undefined);
            guardedToggleAddStyleInput?.(false);
          }}
          ref={addPropertyInputRef}
        />
      ) : (
        <Flex
          align="center"
          wrap="wrap"
          onBlur={(event) => {
            if (
              switchingDraftRef.current ||
              (draftMultiline && event.target !== draftPropertyInputRef.current)
            ) {
              return;
            }
            if (
              event.relatedTarget instanceof Node &&
              event.currentTarget.contains(event.relatedTarget)
            ) {
              return;
            }
            completeDraft(draftValue, false);
          }}
        >
          <InputField
            aria-label={`Property name: ${draftPropertyName}`}
            inputRef={draftPropertyInputRef}
            variant="chromeless"
            text="mono"
            fieldSizing="content"
            color={invalidDraft ? "error" : undefined}
            value={draftPropertyName}
            css={{
              backgroundColor: "transparent",
              marginLeft: `-${initialIndentation}`,
              "& input": {
                marginLeft: 0,
                paddingLeft: theme.spacing[2],
                minWidth: "10ch",
              },
            }}
            onChange={(event) => {
              setDraftPropertyName(event.target.value);
              setInvalidDraft(false);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                if (draftMultiline) {
                  draftEditorRef.current?.focus();
                } else {
                  draftValueInputRef.current?.focus();
                }
              }
              if (event.key === "Escape") {
                afterChangingStyles();
              }
            }}
          />
          <Text
            variant="mono"
            css={{ textIndent: "-0.5ch", fontWeight: "bold" }}
          >
            :
          </Text>
          {draftMultiline ? (
            <Box
              css={{
                width: "100%",
                ...getCodeEditorCssVars({ minHeight: "3lh", maxHeight: "6lh" }),
              }}
            >
              <CssFragmentEditorContent
                ariaLabel={draftPropertyName || "Add styles"}
                editorApiRef={draftEditorRef}
                invalid={invalidDraft}
                value={draftValue}
                onChange={(value) => {
                  setDraftValue(value);
                  setInvalidDraft(false);
                  if (!value.includes("\n")) {
                    closingDraftRef.current = true;
                    setDraftMultiline(false);
                    requestAnimationFrame(() => {
                      draftValueInputRef.current?.focus();
                      draftValueInputRef.current?.setSelectionRange(
                        value.length,
                        value.length
                      );
                    });
                  }
                }}
                onChangeComplete={(value, event) => {
                  if (closingDraftRef.current) {
                    closingDraftRef.current = false;
                    return;
                  }
                  if (
                    event?.relatedTarget instanceof Node &&
                    draftRowRef.current?.contains(event.relatedTarget)
                  ) {
                    return;
                  }
                  closingDraftRef.current = completeDraft(
                    value,
                    draftKeyboardSubmitRef.current
                  );
                  draftKeyboardSubmitRef.current = false;
                }}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    (event.metaKey || event.ctrlKey)
                  ) {
                    draftKeyboardSubmitRef.current = true;
                  }
                  if (event.key === "Escape") {
                    event.preventDefault();
                    closingDraftRef.current = true;
                    afterChangingStyles();
                  }
                }}
              />
            </Box>
          ) : (
            <InputField
              aria-label={draftPropertyName || "Add styles"}
              variant="chromeless"
              text="mono"
              fieldSizing="content"
              color={invalidDraft ? "error" : undefined}
              value={draftValue}
              inputRef={draftValueInputRef}
              css={{ "& input": { minWidth: "5ch" } }}
              onChange={(event) => {
                setDraftValue(event.target.value);
                setInvalidDraft(false);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && event.shiftKey) {
                  event.preventDefault();
                  closingDraftRef.current = false;
                  switchingDraftRef.current = true;
                  const { value, selectionStart, selectionEnd } =
                    event.currentTarget;
                  const start = selectionStart ?? value.length;
                  const end = selectionEnd ?? start;
                  draftSelectionRef.current = start + 1;
                  setDraftValue(
                    `${value.slice(0, start)}\n${value.slice(end)}`
                  );
                  setDraftMultiline(true);
                  return;
                }
                if (event.key === "Enter") {
                  event.preventDefault();
                  completeDraft();
                }
                if (event.key === "Escape") {
                  afterChangingStyles();
                }
              }}
            />
          )}
        </Flex>
      )}
    </DraftRow>
  );

  const recentPropertiesAndAddStyleInput = (
    <Flex
      direction="column"
      css={{ paddingInline: theme.panel.paddingInline, gap: 2 }}
    >
      {showRecentProperties &&
        recentProperties.map((property) => {
          const styleDecl = declarationsMap.get(property);
          if (styleDecl === undefined) {
            return;
          }
          return (
            <Box key={property}>
              <AdvancedDeclarationLonghand
                styleDecl={styleDecl}
                readonly={readonly}
                existingProperties={existingDeclarationsMap}
                onRenameProperty={handleRenameProperty}
                valueInputRef={lastRecentValueInputRef}
                onChangeComplete={(event, atEnd) => {
                  if (event.type === "enter" && atEnd) {
                    startNewEntry(property);
                  }
                }}
                onReset={afterChangingStyles}
                onDeleteProperty={handleDeleteProperty}
                onSetProperty={guardedSetProperty}
              />
              {draftAnchor === property && addStyleInput}
            </Box>
          );
        })}
      {draftAnchor === undefined && addStyleInput}
    </Flex>
  );

  return (
    <Box css={{ isolation: "isolate" }}>
      {showSearch && (
        <PanelContent
          as={Box}
          css={{
            position: "sticky",
            top: 0,
            background: cssVar("--background-primary"),
            zIndex: 1,
          }}
        >
          <SearchField
            inputRef={searchInputRef}
            onChange={handleSearch}
            onAbort={handleAbortSearch}
          />
        </PanelContent>
      )}
      <CssEditorContextMenu
        onPaste={handleInsertStyles}
        onDeleteProperty={handleDeleteProperty}
        onDeleteAllDeclarations={handleDeleteAllDeclarations}
        declarations={declarations}
        foundProperties={
          searchProperties ?? [...recentProperties, ...currentProperties]
        }
      >
        <Flex gap="1" direction="column">
          {propertiesPosition === "bottom" && (
            <>
              {recentPropertiesAndAddStyleInput}
              {showRecentProperties && <Separator />}
            </>
          )}
          <Flex
            direction="column"
            css={{
              paddingInline: theme.panel.paddingInline,
              gap: 2,
            }}
            ref={containerRef}
          >
            {currentProperties.map((property) => {
              const styleDecl = declarationsMap.get(property);
              if (styleDecl === undefined) {
                return;
              }

              const declarationElement = (
                <Box key={property}>
                  <AdvancedDeclarationLonghand
                    styleDecl={styleDecl}
                    readonly={readonly}
                    existingProperties={existingDeclarationsMap}
                    onRenameProperty={handleRenameProperty}
                    onChangeComplete={(event, atEnd) => {
                      if (event.type === "enter" && atEnd) {
                        startNewEntry(property);
                      }
                    }}
                    onDeleteProperty={handleDeleteProperty}
                    onSetProperty={guardedSetProperty}
                    valueInputRef={lastRegularValueInputRef}
                  />
                  {draftAnchor === property && addStyleInput}
                </Box>
              );
              // When using it in keyframes with layout where delcarations are on top of add input button,
              // we need to focus last added value, but the logic for waiting for the last rendered event would add up complexity.
              // For now we just manually avoid virtualization in this layout.
              if (virtualize) {
                return (
                  <LazyRender key={property}>{declarationElement}</LazyRender>
                );
              }
              return declarationElement;
            })}
          </Flex>
          {propertiesPosition === "top" && (
            <>
              {showRecentProperties && <Separator />}
              {recentPropertiesAndAddStyleInput}
            </>
          )}
        </Flex>
      </CssEditorContextMenu>
    </Box>
  );
};
