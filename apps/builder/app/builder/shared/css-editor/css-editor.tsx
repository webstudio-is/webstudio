import { mergeRefs } from "@react-aria/utils";
import { EditorView } from "@codemirror/view";
import { color } from "@webstudio-is/css-engine";
import { PlusIcon } from "@webstudio-is/icons";
import {
  memo,
  useCallback,
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
import {
  PanelContent,
  Box,
  ComboboxAnchor,
  ComboboxContent,
  ComboboxItemDescription,
  ComboboxListbox,
  ComboboxListboxItem,
  ComboboxRoot,
  ComboboxScrollArea,
  Flex,
  InputField,
  SearchField,
  Separator,
  SectionTitleButton,
  Text,
  theme,
  toast,
  Tooltip,
  cssVar,
  styleSourceColor,
  useCombobox,
} from "@webstudio-is/design-system";
import {
  camelCaseProperty,
  keywordValues,
  propertyDescriptions,
  shorthandProperties,
  parseCssValue,
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
import {
  getAutocompleteItems,
  getNewPropertyDescription,
  matchOrSuggestToCreate,
  type SearchItem,
} from "./property-autocomplete";
import {
  parsePropertyName,
  parseStyleInput,
  splitStyleInputAtColon,
} from "./parse-style-input";
import { getMatchingDeclarations } from "./property-search";
import { declarationLineBreak } from "./declaration-line-break";
import {
  type DeleteProperty,
  type SetProperty,
} from "../../features/style-panel/shared/use-style-data";
import { validateCssVariableName } from "~/builder/shared/css-variable-utils";
import type { ComputedStyleDecl } from "~/shared/style-object-model";
import {
  PropertyStatusIcon,
  PropertyStatusIndicator,
} from "../../features/style-panel/property-status";
import {
  getCodeEditorCssVars,
  type EditorApi,
} from "~/shared/code-editor-base";

// Used to indent the values when they are on the next line. This way its easier to see
// where the property ends and value begins, especially in case of presets.
const initialIndentation = `20px`;
const shorthandSet = new Set<string>(shorthandProperties);

const getLineBreakSelection = (input: HTMLInputElement) => {
  const end = input.selectionEnd ?? input.value.length;
  const start = input.selectionStart ?? end;
  return {
    start: start === 0 && end === input.value.length ? end : start,
    end,
  };
};

export const insertStyleDeclarations = (
  cssText: string,
  onAddDeclarations: (styleMap: CssStyleMap) => void,
  requireAllValid = false
) => {
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

const PropertyComboboxMenu = ({
  combobox,
  onSuggestionPointerDown,
}: {
  combobox: ReturnType<typeof useCombobox<SearchItem>>;
  onSuggestionPointerDown?: () => void;
}) => (
  <ComboboxContent>
    <ComboboxListbox {...combobox.getMenuProps()}>
      <ComboboxScrollArea>
        {combobox.items.map((item, index) => (
          <ComboboxListboxItem
            {...combobox.getItemProps({ item, index })}
            onPointerDownCapture={onSuggestionPointerDown}
            key={index}
          >
            <Flex align="center" gap="1">
              <Text truncate css={{ maxWidth: "25ch" }}>
                {item.label}
              </Text>
              <PropertyStatusIcon property={item.property} />
            </Flex>
          </ComboboxListboxItem>
        ))}
      </ComboboxScrollArea>
      <ComboboxItemDescription
        descriptions={combobox.items.map(getNewPropertyDescription)}
      >
        {getNewPropertyDescription(
          combobox.items[combobox.highlightedIndex] ?? null
        )}
      </ComboboxItemDescription>
    </ComboboxListbox>
  </ComboboxContent>
);

const AdvancedPropertyLabel = ({
  styleDecl,
  readonly,
  existingProperties,
  deletableProperties,
  onSetProperty,
  onRenameProperty,
  onReset,
  onDeleteProperty,
}: {
  styleDecl: ComputedStyleDecl;
  readonly: boolean;
  existingProperties: ReadonlyMap<CssProperty, ComputedStyleDecl>;
  deletableProperties?: ReadonlySet<CssProperty>;
  onSetProperty: SetProperty;
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
  const selectingSuggestionRef = useRef(false);
  const editable =
    !readonly &&
    (styleDecl.source.name === "local" ||
      styleDecl.source.name === "overwritten");
  const canDelete =
    !readonly &&
    (deletableProperties?.has(styleDecl.property) ??
      (styleDecl.source.name === "local" ||
        styleDecl.source.name === "overwritten"));

  useEffect(() => {
    nameRef.current = styleDecl.property;
    setName(styleDecl.property);
  }, [styleDecl.property]);

  const resetName = () => {
    nameRef.current = styleDecl.property;
    setName(styleDecl.property);
  };

  const completeRename = (suggestion?: SearchItem) => {
    const nextName = (suggestion?.property ?? nameRef.current).trim();
    if (nextName === styleDecl.property && suggestion?.value === undefined) {
      resetName();
      return;
    }
    const nextProperty = parsePropertyName(nextName, $cssVarsMap.get());
    if (
      nextProperty === undefined ||
      (nextProperty !== styleDecl.property &&
        existingProperties.has(nextProperty)) ||
      (suggestion?.value === undefined &&
        cannotRoundTripAsCssText(styleDecl.cascadedValue, true)) ||
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
      `${nextProperty}: ${suggestion?.value ?? value}`,
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
    if (
      suggestion?.value === undefined &&
      restoredAssets !== assetImages.size
    ) {
      resetName();
      return;
    }
    if (nextProperty === styleDecl.property) {
      onSetProperty(nextProperty)(renamedValue, { listed: true });
    } else {
      onRenameProperty(styleDecl.property, nextProperty, renamedValue);
    }
  };

  const propertyCombobox = useCombobox<SearchItem>({
    getItems: () =>
      editable
        ? getAutocompleteItems().filter(
            ({ property }) => !shorthandSet.has(property)
          )
        : [],
    itemToString: (item) => item?.label ?? "",
    value: { property: name, label: name, key: name },
    getItemProps: () => ({ text: "sentence" }),
    match: (search, items) =>
      matchOrSuggestToCreate(search, items).filter(
        ({ property }) => !shorthandSet.has(property)
      ),
    onChange: (input) => {
      if (input !== undefined) {
        nameRef.current = input;
        setName(input);
      }
    },
    onItemSelect: (item) => {
      selectingSuggestionRef.current = false;
      nameRef.current = item.property;
      setName(item.property);
      completeRename(item);
    },
  });
  const propertyInputProps = propertyCombobox.getInputProps();

  const description =
    propertyDescriptions[camelCaseProperty(styleDecl.property)];
  const sourceColor =
    styleDecl.source.name === "local" ||
    styleDecl.source.name === "remote" ||
    styleDecl.source.name === "overwritten"
      ? styleSourceColor[styleDecl.source.name]
      : undefined;

  return (
    <ComboboxRoot open={propertyCombobox.isOpen}>
      <Box {...propertyCombobox.getComboboxProps()}>
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
              property={styleDecl.property}
              description={description}
              styles={[styleDecl]}
              onReset={() => {
                onDeleteProperty(styleDecl.property);
                setIsOpen(false);
                onReset?.();
              }}
              resetType="delete"
            />
          }
        >
          <ComboboxAnchor asChild>
            <InputField
              aria-label={`Property name: ${styleDecl.property}`}
              inputRef={nameInputRef}
              variant="chromeless"
              text="mono"
              fieldSizing="content"
              readOnly={!editable}
              {...propertyInputProps}
              onFocus={(event) => {
                propertyInputProps.onFocus?.(event);
                setIsOpen(false);
              }}
              onBlur={(event) => {
                propertyInputProps.onBlur?.(event);
                if (!selectingSuggestionRef.current) {
                  completeRename();
                }
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  resetName();
                  propertyInputProps.onKeyDown?.(event);
                  return;
                }
                if (
                  event.key !== "Enter" ||
                  (nameRef.current.trim() !== "" &&
                    propertyCombobox.highlightedIndex !== -1)
                ) {
                  propertyInputProps.onKeyDown?.(event);
                }
                if (event.defaultPrevented) {
                  return;
                }
                if (event.key === "Enter") {
                  event.preventDefault();
                  if (nameRef.current.trim() === "" && canDelete) {
                    resetName();
                    onDeleteProperty(styleDecl.property);
                    onReset?.();
                    return;
                  }
                  event.currentTarget.blur();
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
                "&:hover:not([data-input-field-input])": {
                  backgroundColor: sourceColor?.background,
                },
              }}
            />
          </ComboboxAnchor>
        </Tooltip>
        <PropertyComboboxMenu
          combobox={propertyCombobox}
          onSuggestionPointerDown={() => {
            selectingSuggestionRef.current = true;
          }}
        />
      </Box>
    </ComboboxRoot>
  );
};

export const cannotRoundTripAsCssText = (
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
  multilineDrafts,
  onDeleteProperty,
  onSetProperty,
  onChangeComplete,
  onReset,
  inputRef: inputRefProp,
}: {
  styleDecl: ComputedStyleDecl;
  readonly?: boolean;
  multilineDrafts: Map<CssProperty, string>;
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
  const restoredDraftRef = useRef(multilineDrafts.has(styleDecl.property));
  const [multilineValue, setMultilineValue] = useState<string | undefined>(() =>
    multilineDrafts.get(styleDecl.property)
  );
  const [invalidMultilineValue, setInvalidMultilineValue] = useState(false);
  const isMultiline = multilineValue !== undefined;

  let isColor = false;
  try {
    color.parse(toValue(styleDecl.usedValue));
    isColor = true;
  } catch {
    isColor = false;
  }

  const completeMultilineValue = (value: string, restoreFocus = false) => {
    if (closingRef.current) {
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
      setInvalidMultilineValue(true);
      return;
    }
    closingRef.current = true;
    onSetProperty(styleDecl.property)(parsed, { listed: true });
    multilineDrafts.delete(styleDecl.property);
    setMultilineValue(undefined);
    if (restoreFocus) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

  return (
    <>
      {isMultiline ? (
        <Box
          css={{
            flexBasis: "100%",
            ...getCodeEditorCssVars({ minHeight: "2lh", maxHeight: "none" }),
          }}
        >
          <CssFragmentEditorContent
            ariaLabel={styleDecl.property}
            editorApiRef={editorRef}
            autoFocus={!restoredDraftRef.current}
            readOnly={readonly}
            initialSelection={selectionRef.current}
            invalid={invalidMultilineValue}
            value={multilineValue}
            onChange={(value) => {
              multilineDrafts.set(styleDecl.property, value);
              setMultilineValue(value);
              setInvalidMultilineValue(false);
              if (!value.includes("\n")) {
                completeMultilineValue(value, true);
              }
            }}
            onChangeComplete={(value, event) =>
              completeMultilineValue(value, event === undefined)
            }
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                closingRef.current = true;
                multilineDrafts.delete(styleDecl.property);
                setMultilineValue(undefined);
                requestAnimationFrame(() => inputRef.current?.focus());
              }
            }}
          />
        </Box>
      ) : (
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
                  onSetProperty(styleDecl.property)(styleValue, {
                    listed: true,
                  });
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
            const { start, end } = getLineBreakSelection(input);
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
            const multiline = `${value.slice(0, insertionPoint)}\n${value.slice(replacementEnd)}`;
            multilineDrafts.set(styleDecl.property, multiline);
            setMultilineValue(multiline);
          }}
          onEnter={() => {
            const input = inputRef.current;
            return (
              input !== null &&
              input.selectionStart === input.value.length &&
              input.selectionEnd === input.value.length
            );
          }}
          onTab={() => true}
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
          onReset={(reason) => {
            if (reason === "tab") {
              onChangeComplete?.({ type: "tab" }, true);
            } else {
              onReset?.();
            }
          }}
        />
      )}
    </>
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
    multilineDrafts,
    onChangeComplete,
    onDeleteProperty,
    onSetProperty,
    onRenameProperty,
    existingProperties,
    deletableProperties,
    onReset,
    valueInputRef,
    indentation = initialIndentation,
  }: {
    styleDecl: ComputedStyleDecl;
    readonly?: boolean;
    multilineDrafts: Map<CssProperty, string>;
    indentation?: string;
    onReset?: () => void;
    onSetProperty: SetProperty;
    onRenameProperty: (
      oldProperty: CssProperty,
      newProperty: CssProperty,
      value: StyleValue
    ) => void;
    existingProperties: ReadonlyMap<CssProperty, ComputedStyleDecl>;
    deletableProperties?: ReadonlySet<CssProperty>;
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
          deletableProperties={deletableProperties}
          onSetProperty={onSetProperty}
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
          multilineDrafts={multilineDrafts}
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
  deletableProperties,
  readonly = false,
  showSearch = true,
  virtualize = true,
  propertiesPosition = "bottom",
  recentProperties = [],
  showInlineAddButton = false,
}: {
  declarations: Array<ComputedStyleDecl>;
  existingDeclarations?: Array<ComputedStyleDecl>;
  deletableProperties?: ReadonlySet<CssProperty>;
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
  showInlineAddButton?: boolean;
}) => {
  const multilineDrafts = useRef(new Map<CssProperty, string>()).current;
  const draftRowRef = useRef<HTMLDivElement>(null);
  const draftPropertyInputRef = useRef<HTMLInputElement>(null);
  const draftValueInputRef = useRef<HTMLInputElement>(null);
  const draftEditorRef = useRef<EditorApi>();
  const bulkEditorRef = useRef<EditorApi>();
  const highlightedDraftItemRef = useRef<SearchItem>();
  const onDeletePropertyRef = useRef(onDeleteProperty);
  onDeletePropertyRef.current = onDeleteProperty;
  const relocatedDraftFocusRef = useRef<
    | { field: "property" | "value"; start: number; end: number }
    | { field: "editor"; selection: { anchor: number; head: number } }
  >();
  const draftSelectionRef = useRef(0);
  const closingDraftRef = useRef(false);
  const switchingDraftRef = useRef(false);
  const wasDraftPropertySetRef = useRef(false);
  const lastRecentValueInputRef = useRef<HTMLInputElement>(null);
  const lastRegularValueInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [newEntryAfter, setNewEntryAfter] = useState<CssProperty>();
  const [draftPropertyName, setDraftPropertyName] = useState<string>();
  const [bulkDraft, setBulkDraft] = useState<{
    code: string;
    selection: number;
  }>();
  const [draftValue, setDraftValue] = useState("");
  const [draftMultiline, setDraftMultiline] = useState(false);
  const [invalidDraft, setInvalidDraft] = useState(false);
  const [searchTerm, setSearchTerm] = useState<string>();
  const containerRef = useRef<HTMLDivElement>(null);
  const bulkCodeExtensions = useMemo(() => [declarationLineBreak], []);
  const clearHighlightedDraftPreview = useCallback(() => {
    const item = highlightedDraftItemRef.current;
    if (item !== undefined) {
      onDeletePropertyRef.current(item.property as CssProperty, {
        isEphemeral: true,
      });
      highlightedDraftItemRef.current = undefined;
    }
  }, []);
  useEffect(() => clearHighlightedDraftPreview, [clearHighlightedDraftPreview]);
  const draftPropertyCombobox = useCombobox<SearchItem>({
    getItems: getAutocompleteItems,
    itemToString: (item) => item?.label ?? "",
    value: {
      property: draftPropertyName ?? "",
      label: draftPropertyName ?? "",
      key: draftPropertyName ?? "",
    },
    getItemProps: () => ({ text: "sentence" }),
    match: matchOrSuggestToCreate,
    onChange: (input) => {
      if (input !== undefined) {
        clearHighlightedDraftPreview();
        setDraftPropertyName(input);
        setInvalidDraft(false);
      }
    },
    onItemSelect: (item) => {
      clearHighlightedDraftPreview();
      switchingDraftRef.current = false;
      setDraftPropertyName(item.property);
      if (item.value !== undefined) {
        setDraftValue(item.value);
      }
      requestAnimationFrame(() => draftValueInputRef.current?.focus());
    },
    onItemHighlight: (item) => {
      const previousItem = highlightedDraftItemRef.current;
      if (
        previousItem?.property === item?.property &&
        previousItem?.value === item?.value
      ) {
        return;
      }
      clearHighlightedDraftPreview();
      if (item?.value !== undefined) {
        const value = parseCssValue(item.property as CssProperty, item.value);
        if (value.type !== "invalid") {
          onSetProperty(item.property as CssProperty)(value, {
            isEphemeral: true,
          });
          highlightedDraftItemRef.current = item;
        }
      }
    },
  });
  const draftPropertyInputProps = draftPropertyCombobox.getInputProps();

  const guardedSetProperty: SetProperty = readonly
    ? () => () => undefined
    : onSetProperty;

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

  const declarationsMap = new Map(
    declarations.map((decl) => [decl.property, decl])
  );
  const existingDeclarationsMap = new Map(
    existingDeclarations
      .filter((decl) => decl.source.name !== "default")
      .map((decl) => [decl.property, decl])
  );

  const advancedProperties = declarations.map(({ property }) => property);
  const searchProperties = useMemo(
    () =>
      getMatchingDeclarations(declarations, searchTerm)?.map(
        ({ property }) => property
      ),
    [declarations, searchTerm]
  );

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
    const content =
      draftRowRef.current?.querySelector<HTMLElement>(".cm-content");
    if (
      (draftPropertyName === undefined && bulkDraft === undefined) ||
      (document.activeElement !== document.body &&
        document.activeElement !== content)
    ) {
      return;
    }
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
  }, [draftAnchor, draftPropertyName, bulkDraft]);

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
    return insertStyleDeclarations(cssText, onAddDeclarations, requireAllValid);
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
    clearHighlightedDraftPreview();
    setNewEntryAfter(undefined);
    setDraftPropertyName(undefined);
    setBulkDraft(undefined);
    setDraftValue("");
    setDraftMultiline(false);
    switchingDraftRef.current = false;
    setInvalidDraft(false);
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
    const multilineDraft = multilineDrafts.get(oldProperty);
    if (multilineDraft !== undefined) {
      multilineDrafts.delete(oldProperty);
      multilineDrafts.set(newProperty, multilineDraft);
    }
    onRenameProperty(oldProperty, newProperty, value);
  };

  const startNewEntry = (property?: CssProperty) => {
    if (
      draftAnchor !== undefined ||
      draftPropertyName !== undefined ||
      bulkDraft !== undefined
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
        bulkEditorRef.current?.focus();
      }
      return;
    }
    closingDraftRef.current = false;
    switchingDraftRef.current = false;
    setDraftPropertyName("");
    setBulkDraft(undefined);
    setDraftValue("");
    setDraftMultiline(false);
    setInvalidDraft(false);
    setNewEntryAfter(property);
  };

  const completeDraft = (value = draftValue, focusValue = true) => {
    if (closingDraftRef.current || draftPropertyName === undefined) {
      return false;
    }
    if (draftPropertyName.trim() === "" && value.trim() === "") {
      closingDraftRef.current = true;
      afterChangingStyles(focusValue);
      return true;
    }
    const name = draftPropertyName.trim();
    const variableError = name.startsWith("--")
      ? validateCssVariableName(name)
      : undefined;
    if (variableError !== undefined && variableError.type !== "duplicate") {
      toast.error(variableError.message);
      setInvalidDraft(true);
      return false;
    }
    const property = parsePropertyName(name, $cssVarsMap.get(), true);
    if (property === undefined) {
      setInvalidDraft(true);
      return false;
    }
    if (variableError?.type === "duplicate") {
      toast.warn(
        `CSS variable "${property}" already exists. Its value will be updated.`
      );
    }
    const styles = handleInsertStyles(`${property}: ${value}`, true);
    if (styles.size === 0) {
      setInvalidDraft(true);
      return false;
    }
    closingDraftRef.current = true;
    afterChangingStyles(focusValue);
    return true;
  };

  const openBulkDraft = (code: string, selection: number) => {
    clearHighlightedDraftPreview();
    closingDraftRef.current = false;
    switchingDraftRef.current = true;
    setBulkDraft({ code, selection });
    setDraftPropertyName(undefined);
    setDraftValue("");
    setDraftMultiline(false);
    setInvalidDraft(false);
    requestAnimationFrame(() => {
      switchingDraftRef.current = false;
    });
  };

  const completeBulkDraft = (code: string, focusValue: boolean) => {
    if (closingDraftRef.current) {
      return;
    }
    if (code.trim() === "") {
      closingDraftRef.current = true;
      afterChangingStyles(focusValue);
      return;
    }
    const styles = handleInsertStyles(code, true);
    if (styles.size === 0) {
      setInvalidDraft(true);
      return;
    }
    closingDraftRef.current = true;
    afterChangingStyles(focusValue);
  };

  const openValueDraft = (value: string, selection: number) => {
    switchingDraftRef.current = true;
    draftSelectionRef.current = selection;
    setDraftValue(value);
    setDraftMultiline(true);
    requestAnimationFrame(() => {
      switchingDraftRef.current = false;
    });
  };

  const handleDeleteProperty: DeleteProperty = (property, options = {}) => {
    if (readonly) {
      return;
    }
    onDeleteProperty(property, options);
    if (options.isEphemeral === true) {
      return;
    }
    multilineDrafts.delete(property);
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

  const draftRow = (draftPropertyName !== undefined ||
    bulkDraft !== undefined) && (
    <DraftRow
      rowRef={draftRowRef}
      onUnmount={captureDraftFocus}
      css={{ paddingLeft: initialIndentation }}
    >
      {bulkDraft !== undefined ? (
        <Box
          css={{
            width: "100%",
            ...getCodeEditorCssVars({ minHeight: "2lh", maxHeight: "none" }),
          }}
        >
          <CssFragmentEditorContent
            ariaLabel="Add styles"
            editorApiRef={bulkEditorRef}
            autoFocus
            initialSelection={bulkDraft.selection}
            invalid={invalidDraft}
            extensions={bulkCodeExtensions}
            value={bulkDraft.code}
            onChange={(code) => {
              setInvalidDraft(false);
              if (!code.includes("\n")) {
                const declaration = splitStyleInputAtColon(code);
                switchingDraftRef.current = true;
                setBulkDraft(undefined);
                setDraftPropertyName(declaration?.property ?? code);
                setDraftValue(declaration?.value ?? "");
                requestAnimationFrame(() => {
                  const input = declaration
                    ? draftValueInputRef.current
                    : draftPropertyInputRef.current;
                  input?.focus();
                  input?.setSelectionRange(
                    input.value.length,
                    input.value.length
                  );
                  switchingDraftRef.current = false;
                });
                return;
              }
              setBulkDraft((draft) =>
                draft === undefined ? draft : { ...draft, code }
              );
            }}
            onChangeComplete={(code, event) => {
              if (switchingDraftRef.current) {
                return;
              }
              completeBulkDraft(code, event === undefined);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                closingDraftRef.current = true;
                afterChangingStyles();
              }
            }}
          />
        </Box>
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
          <ComboboxRoot open={draftPropertyCombobox.isOpen}>
            <Box
              {...draftPropertyCombobox.getComboboxProps()}
              css={{ marginLeft: `-${initialIndentation}` }}
            >
              <ComboboxAnchor asChild>
                <InputField
                  aria-label={`Property name: ${draftPropertyName}`}
                  inputRef={draftPropertyInputRef}
                  variant="chromeless"
                  text="mono"
                  fieldSizing="content"
                  color={invalidDraft ? "error" : undefined}
                  css={{
                    backgroundColor: "transparent",
                    "& input": {
                      marginLeft: 0,
                      paddingLeft: theme.spacing[2],
                      minWidth: "10ch",
                    },
                  }}
                  {...draftPropertyInputProps}
                  onBlur={(event) => {
                    draftPropertyInputProps.onBlur?.(event);
                    clearHighlightedDraftPreview();
                  }}
                  onKeyDown={(event) => {
                    if (
                      event.key === ":" &&
                      !event.altKey &&
                      !event.metaKey &&
                      !event.ctrlKey &&
                      !event.nativeEvent.isComposing
                    ) {
                      event.preventDefault();
                      draftValueInputRef.current?.focus();
                      return;
                    }
                    if (!event.shiftKey) {
                      draftPropertyInputProps.onKeyDown?.(event);
                    }
                    if (event.defaultPrevented) {
                      return;
                    }
                    if (event.key === "Enter" && event.shiftKey) {
                      event.preventDefault();
                      const input = event.currentTarget;
                      const { value } = input;
                      const { start, end } = getLineBreakSelection(input);
                      if (draftValue !== "") {
                        const delimiter = draftValue.trimEnd().endsWith(";")
                          ? ""
                          : ";";
                        const code = `${value}: ${draftValue}${delimiter}\n`;
                        openBulkDraft(code, code.length);
                        return;
                      }
                      openBulkDraft(
                        `${value.slice(0, start)}\n${value.slice(end)}`,
                        start + 1
                      );
                      return;
                    }
                    if (event.key === "Enter") {
                      event.preventDefault();
                      if (draftPropertyName?.trim() === "") {
                        closingDraftRef.current = true;
                        afterChangingStyles();
                        return;
                      }
                      if (draftMultiline) {
                        draftEditorRef.current?.focus();
                      } else {
                        draftValueInputRef.current?.focus();
                      }
                    }
                    if (event.key === "Escape") {
                      event.preventDefault();
                      if (draftPropertyCombobox.isOpen) {
                        return;
                      }
                      closingDraftRef.current = true;
                      afterChangingStyles();
                    }
                  }}
                  onPaste={(event) => {
                    const text = event.clipboardData
                      .getData("text/plain")
                      .replaceAll("\r\n", "\n")
                      .replaceAll("\r", "\n");
                    const input = event.currentTarget;
                    const start = input.selectionStart ?? input.value.length;
                    const end = input.selectionEnd ?? start;
                    if (!text.includes("\n")) {
                      const declaration = splitStyleInputAtColon(
                        `${input.value.slice(0, start)}${text}${input.value.slice(end)}`
                      );
                      if (declaration === undefined) {
                        return;
                      }
                      event.preventDefault();
                      setDraftPropertyName(declaration.property);
                      setDraftValue(declaration.value);
                      requestAnimationFrame(() =>
                        draftValueInputRef.current?.focus()
                      );
                      return;
                    }
                    event.preventDefault();
                    if (draftValue !== "") {
                      const delimiter = draftValue.trimEnd().endsWith(";")
                        ? ""
                        : ";";
                      const code = `${input.value}: ${draftValue}${delimiter}\n${text}`;
                      openBulkDraft(code, code.length);
                      return;
                    }
                    openBulkDraft(
                      `${input.value.slice(0, start)}${text}${input.value.slice(end)}`,
                      start + text.length
                    );
                  }}
                />
              </ComboboxAnchor>
              <PropertyComboboxMenu
                combobox={draftPropertyCombobox}
                onSuggestionPointerDown={() => {
                  switchingDraftRef.current = true;
                }}
              />
            </Box>
          </ComboboxRoot>
          <Text
            variant="mono"
            css={{ textIndent: "-0.5ch", fontWeight: "bold" }}
          >
            :
          </Text>
          {draftMultiline ? (
            <Box
              css={{
                flexBasis: "100%",
                ...getCodeEditorCssVars({
                  minHeight: "2lh",
                  maxHeight: "none",
                }),
              }}
            >
              <CssFragmentEditorContent
                ariaLabel={draftPropertyName || "Add styles"}
                editorApiRef={draftEditorRef}
                autoFocus
                initialSelection={draftSelectionRef.current}
                invalid={invalidDraft}
                value={draftValue}
                onChange={(value) => {
                  setDraftValue(value);
                  setInvalidDraft(false);
                  if (!value.includes("\n")) {
                    switchingDraftRef.current = true;
                    setDraftMultiline(false);
                    requestAnimationFrame(() => {
                      draftValueInputRef.current?.focus();
                      draftValueInputRef.current?.setSelectionRange(
                        value.length,
                        value.length
                      );
                      switchingDraftRef.current = false;
                    });
                  }
                }}
                onChangeComplete={(value, event) => {
                  if (
                    switchingDraftRef.current ||
                    (event?.relatedTarget instanceof Node &&
                      draftRowRef.current?.contains(event.relatedTarget))
                  ) {
                    return;
                  }
                  completeDraft(value, event === undefined);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.preventDefault();
                    event.stopPropagation();
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
                  const input = event.currentTarget;
                  const { value } = input;
                  const { start, end } = getLineBreakSelection(input);
                  openValueDraft(
                    `${value.slice(0, start)}\n${value.slice(end)}`,
                    start + 1
                  );
                  return;
                }
                if (event.key === "Enter") {
                  event.preventDefault();
                  completeDraft();
                }
                if (event.key === "Escape") {
                  closingDraftRef.current = true;
                  afterChangingStyles();
                }
              }}
              onPaste={(event) => {
                const text = event.clipboardData
                  .getData("text/plain")
                  .replaceAll("\r\n", "\n")
                  .replaceAll("\r", "\n");
                if (!text.includes("\n")) {
                  return;
                }
                event.preventDefault();
                const input = event.currentTarget;
                const start = input.selectionStart ?? input.value.length;
                const end = input.selectionEnd ?? start;
                openValueDraft(
                  `${input.value.slice(0, start)}${text}${input.value.slice(end)}`,
                  start + text.length
                );
              }}
            />
          )}
        </Flex>
      )}
    </DraftRow>
  );

  const recentPropertiesAndDraft = (
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
                multilineDrafts={multilineDrafts}
                existingProperties={existingDeclarationsMap}
                deletableProperties={deletableProperties}
                onRenameProperty={handleRenameProperty}
                valueInputRef={lastRecentValueInputRef}
                onChangeComplete={(event, atEnd) => {
                  if (
                    event.type === "tab" ||
                    (event.type === "enter" && atEnd)
                  ) {
                    startNewEntry(property);
                  }
                }}
                onReset={afterChangingStyles}
                onDeleteProperty={handleDeleteProperty}
                onSetProperty={guardedSetProperty}
              />
              {draftAnchor === property && draftRow}
            </Box>
          );
        })}
      {draftAnchor === undefined &&
        (draftRow ||
          (showInlineAddButton ? (
            <SectionTitleButton
              aria-label="Add styles"
              tabIndex={0}
              prefix={<PlusIcon />}
              css={{ alignSelf: "flex-start" }}
              disabled={readonly}
              onClick={() => startNewEntry()}
            />
          ) : null))}
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
        readonly={readonly}
        deletableProperties={deletableProperties}
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
              {recentPropertiesAndDraft}
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
                    multilineDrafts={multilineDrafts}
                    existingProperties={existingDeclarationsMap}
                    deletableProperties={deletableProperties}
                    onRenameProperty={handleRenameProperty}
                    onChangeComplete={(event, atEnd) => {
                      if (
                        event.type === "tab" ||
                        (event.type === "enter" && atEnd)
                      ) {
                        startNewEntry(property);
                      }
                    }}
                    onDeleteProperty={handleDeleteProperty}
                    onSetProperty={guardedSetProperty}
                    valueInputRef={lastRegularValueInputRef}
                  />
                  {draftAnchor === property && draftRow}
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
              {recentPropertiesAndDraft}
            </>
          )}
        </Flex>
      </CssEditorContextMenu>
    </Box>
  );
};
