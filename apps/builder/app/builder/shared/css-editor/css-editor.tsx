import { mergeRefs } from "@react-aria/utils";
import { color } from "@webstudio-is/css-engine";
import {
  memo,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ComponentProps,
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
      (styleDecl.source.name !== "local" &&
        styleDecl.source.name !== "overwritten")
    ) {
      resetName();
      return;
    }
    const { styleMap } = parseStyleInput(
      `${nextProperty}: ${toValue(styleDecl.cascadedValue)}`,
      $cssVarsMap.get()
    );
    const nextValue = styleMap.get(nextProperty);
    if (nextValue === undefined || nextValue.type === "invalid") {
      resetName();
      return;
    }
    onRenameProperty(styleDecl.property, nextProperty, nextValue);
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
      onOpenChange={setIsOpen}
      // prevent closing tooltip on content click
      onPointerDown={(event) => event.preventDefault()}
      triggerProps={{
        onClick: (event) => {
          if (event.altKey) {
            event.preventDefault();
            onDeleteProperty(styleDecl.property);
            onReset?.();
            return;
          }
          setIsOpen(true);
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
          "& input": { color: sourceColor?.foreground },
          "&:hover": { backgroundColor: sourceColor?.background },
        }}
      />
    </Tooltip>
  );
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
              undefined,
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
        const input = event.currentTarget;
        const start = input.selectionStart ?? input.value.length;
        const end = input.selectionEnd ?? start;
        selectionRef.current = start + 1;
        closingRef.current = false;
        keyboardSubmitRef.current = false;
        setMultilineValue(
          `${input.value.slice(0, start)}\n${input.value.slice(end)}`
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
  const draftValueInputRef = useRef<HTMLInputElement>(null);
  const draftEditorRef = useRef<EditorApi>();
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
  const [searchProperties, setSearchProperties] =
    useState<Array<CssProperty>>();
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
      draftValueInputRef.current?.focus();
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

  const currentProperties =
    searchProperties ??
    advancedProperties.filter(
      (property) => recentProperties.includes(property) === false
    );

  const showRecentProperties =
    recentProperties.length > 0 && searchProperties === undefined;

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
    setSearchProperties(undefined);
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

    const styles = declarations.map(({ property, cascadedValue }) => {
      return {
        key: `${property.replaceAll("-", " ")} ${toValue(cascadedValue)}`,
        property,
      };
    });

    const matched = matchSorter(styles, search, {
      keys: ["key"],
    }).map(({ property }) => property);

    setSearchProperties(matched);
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
    onRenameProperty(oldProperty, newProperty, value);
  };

  const startNewEntry = (property: CssProperty) => {
    if (newEntryAfter !== undefined || hasAddStyleDraftRef.current) {
      if (draftPropertyName !== undefined) {
        if (draftMultiline) {
          draftEditorRef.current?.focus();
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
    setDraftPropertyName(undefined);
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
    setSearchProperties(
      searchProperties?.filter((searchProperty) => searchProperty !== property)
    );
  };

  const handleDeleteAllDeclarations = (styleMap: CssStyleMap) => {
    if (readonly) {
      return;
    }
    setSearchProperties(
      searchProperties?.filter(
        (searchProperty) => styleMap.has(searchProperty) === false
      )
    );
    onDeleteAllDeclarations(styleMap);
  };

  const addStyleInput = (
    <Box
      css={
        effectiveShowAddStyleInput
          ? newEntryAfter === undefined
            ? { paddingTop: theme.spacing[3] }
            : { paddingLeft: initialIndentation }
          : { overflow: "hidden", height: 0 }
      }
    >
      {draftPropertyName === undefined ? (
        <AddStyleInput
          inline={newEntryAfter !== undefined}
          onSubmit={(cssText: string) => {
            const property =
              newEntryAfter === undefined
                ? undefined
                : parsePropertyName(cssText, $cssVarsMap.get());
            if (property !== undefined) {
              setDraftPropertyName(property);
              return true;
            }
            const styles = handleInsertStyles(cssText, true);
            if (styles.size > 0) {
              afterChangingStyles();
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
            if (draftMultiline || switchingDraftRef.current) {
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
            variant="chromeless"
            text="mono"
            fieldSizing="content"
            color={invalidDraft ? "error" : undefined}
            value={draftPropertyName}
            onChange={(event) => {
              setDraftPropertyName(event.target.value);
              setInvalidDraft(false);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                draftValueInputRef.current?.focus();
              }
              if (event.key === "Escape") {
                afterChangingStyles();
              }
            }}
          />
          <Text variant="mono" css={{ fontWeight: "bold" }}>
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
                ariaLabel={draftPropertyName}
                editorApiRef={draftEditorRef}
                autoFocus
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
                onChangeComplete={(value) => {
                  if (closingDraftRef.current) {
                    closingDraftRef.current = false;
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
              aria-label={draftPropertyName}
              variant="chromeless"
              text="mono"
              fieldSizing="content"
              color={invalidDraft ? "error" : undefined}
              value={draftValue}
              inputRef={draftValueInputRef}
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
    </Box>
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
              {newEntryAfter === property && addStyleInput}
            </Box>
          );
        })}
      {newEntryAfter === undefined && addStyleInput}
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
                  {newEntryAfter === property && addStyleInput}
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
