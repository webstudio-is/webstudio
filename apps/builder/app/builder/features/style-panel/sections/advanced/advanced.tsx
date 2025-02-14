import { mergeRefs } from "@react-aria/utils";
import { lexer } from "css-tree";
import { colord } from "colord";
import {
  forwardRef,
  memo,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ComponentProps,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { useStore } from "@nanostores/react";
import { matchSorter } from "match-sorter";
import { PlusIcon } from "@webstudio-is/icons";
import {
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
  Label,
  NestedInputButton,
  SearchField,
  SectionTitle,
  SectionTitleButton,
  SectionTitleLabel,
  Separator,
  Text,
  theme,
  Tooltip,
  useCombobox,
} from "@webstudio-is/design-system";
import {
  parseCss,
  properties as propertiesData,
  keywordValues,
  propertyDescriptions,
  parseCssValue,
} from "@webstudio-is/css-data";
import {
  cssWideKeywords,
  hyphenateProperty,
  toValue,
  type StyleProperty,
} from "@webstudio-is/css-engine";
import {
  CollapsibleSectionRoot,
  useOpenState,
} from "~/builder/shared/collapsible-section";
import { CssValueInputContainer } from "../../shared/css-value-input";
import { styleConfigByName } from "../../shared/configs";
import {
  createBatchUpdate,
  deleteProperty,
  setProperty,
} from "../../shared/use-style-data";
import {
  $availableVariables,
  useComputedStyleDecl,
  useComputedStyles,
} from "../../shared/model";
import { getDots } from "../../shared/style-section";
import { PropertyInfo } from "../../property-label";
import { ColorPopover } from "../../shared/color-picker";
import { useClientSupports } from "~/shared/client-supports";
import { composeEventHandlers } from "~/shared/event-utils";
import { CopyPasteMenu, propertyContainerAttribute } from "./copy-paste-menu";
import { $advancedStyles } from "./stores";

// Only here to keep the same section module interface
export const properties = [];

const AdvancedStyleSection = (props: {
  label: string;
  properties: StyleProperty[];
  onAdd: () => void;
  children: ReactNode;
}) => {
  const { label, children, properties, onAdd } = props;
  const [isOpen, setIsOpen] = useOpenState(label);
  const styles = useComputedStyles(properties);
  return (
    <CollapsibleSectionRoot
      label={label}
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      fullWidth
      trigger={
        <SectionTitle
          dots={getDots(styles)}
          suffix={
            <SectionTitleButton
              prefix={<PlusIcon />}
              onClick={() => {
                setIsOpen(true);
                onAdd();
              }}
            />
          }
        >
          <SectionTitleLabel>{label}</SectionTitleLabel>
        </SectionTitle>
      }
    >
      {children}
    </CollapsibleSectionRoot>
  );
};

type SearchItem = { property: string; label: string; value?: string };

const autoCompleteItems: Array<SearchItem> = [];

const getAutocompleteItems = () => {
  if (autoCompleteItems.length > 0) {
    return autoCompleteItems;
  }
  for (const property in propertiesData) {
    autoCompleteItems.push({
      property,
      label: hyphenateProperty(property),
    });
  }

  const ignoreValues = new Set([...cssWideKeywords, ...keywordValues.color]);

  for (const property in keywordValues) {
    const values = keywordValues[property as keyof typeof keywordValues];
    for (const value of values) {
      if (ignoreValues.has(value)) {
        continue;
      }
      autoCompleteItems.push({
        property,
        value,
        label: `${hyphenateProperty(property)}: ${value}`,
      });
    }
  }

  autoCompleteItems.sort((a, b) =>
    Intl.Collator().compare(a.property, b.property)
  );

  return autoCompleteItems;
};

const matchOrSuggestToCreate = (
  search: string,
  items: Array<SearchItem>,
  itemToString: (item: SearchItem) => string
) => {
  const matched = matchSorter(items, search, {
    keys: [itemToString],
  });

  // Limit the array to 100 elements
  matched.length = Math.min(matched.length, 100);

  const property = search.trim();
  if (
    property.startsWith("--") &&
    lexer.match("<custom-ident>", property).matched
  ) {
    matched.unshift({
      property,
      label: `Create "${property}"`,
    });
  }
  // When there is no match we suggest to create a custom property.
  if (
    matched.length === 0 &&
    lexer.match("<custom-ident>", `--${property}`).matched
  ) {
    matched.unshift({
      property: `--${property}`,
      label: `--${property}: unset;`,
    });
  }

  return matched;
};

const getNewPropertyDescription = (item: null | SearchItem) => {
  let description: string | undefined = `Create CSS variable.`;
  if (item && item.property in propertyDescriptions) {
    description = propertyDescriptions[item.property];
  }
  return <Box css={{ width: theme.spacing[28] }}>{description}</Box>;
};

const insertStyles = (text: string) => {
  let parsedStyles = parseCss(`selector{${text}}`);
  if (parsedStyles.length === 0) {
    // Try a single property without a value.
    parsedStyles = parseCss(`selector{${text}: unset}`);
  }

  if (parsedStyles.length === 0) {
    return [];
  }
  const batch = createBatchUpdate();
  for (const { property, value } of parsedStyles) {
    batch.setProperty(property)(value);
  }
  batch.publish({ listed: true });
  return parsedStyles;
};

/**
 *
 * Advanced search control supports following interactions
 *
 * find property
 * create custom property
 * submit css declarations
 * paste css declarations
 *
 */
const AddProperty = forwardRef<
  HTMLInputElement,
  {
    onClose: () => void;
    onSubmit: (css: string) => void;
    onFocus: () => void;
    onBlur: () => void;
  }
>(({ onClose, onSubmit, onFocus, onBlur }, forwardedRef) => {
  const [item, setItem] = useState<SearchItem>({
    property: "",
    label: "",
  });
  const highlightedItemRef = useRef<SearchItem>();

  const combobox = useCombobox<SearchItem>({
    getItems: getAutocompleteItems,
    itemToString: (item) => item?.label ?? "",
    value: item,
    defaultHighlightedIndex: 0,
    getItemProps: () => ({ text: "sentence" }),
    match: matchOrSuggestToCreate,
    onChange: (value) => setItem({ property: value ?? "", label: value ?? "" }),
    onItemSelect: (item) => {
      clear();
      onSubmit(`${item.property}: ${item.value ?? "unset"}`);
    },
    onItemHighlight: (item) => {
      const previousHighlightedItem = highlightedItemRef.current;
      if (item?.value === undefined && previousHighlightedItem) {
        deleteProperty(previousHighlightedItem.property as StyleProperty, {
          isEphemeral: true,
        });
        highlightedItemRef.current = undefined;
        return;
      }

      if (item?.value) {
        const value = parseCssValue(item.property as StyleProperty, item.value);
        setProperty(item.property as StyleProperty)(value, {
          isEphemeral: true,
        });
        highlightedItemRef.current = item;
      }
    },
  });

  const descriptionItem = combobox.items[combobox.highlightedIndex];
  const description = getNewPropertyDescription(descriptionItem);
  const descriptions = combobox.items.map(getNewPropertyDescription);
  const inputProps = combobox.getInputProps();

  const clear = () => {
    setItem({ property: "", label: "" });
  };

  const handleKeys = (event: KeyboardEvent) => {
    // Dropdown might handle enter or escape.
    if (event.defaultPrevented) {
      return;
    }
    if (event.key === "Enter") {
      clear();
      onSubmit(item.property);
      return;
    }
    if (event.key === "Escape") {
      clear();
      onClose();
    }
  };

  const handleKeyDown = composeEventHandlers(inputProps.onKeyDown, handleKeys, {
    // Pass prevented events to the combobox (e.g., the Escape key doesn't work otherwise, as it's blocked by Radix)
    checkForDefaultPrevented: false,
  });

  return (
    <ComboboxRoot open={combobox.isOpen}>
      <div {...combobox.getComboboxProps()}>
        <ComboboxAnchor>
          <InputField
            {...inputProps}
            autoFocus
            onFocus={onFocus}
            onBlur={(event) => {
              inputProps.onBlur(event);
              onBlur();
            }}
            inputRef={forwardedRef}
            onKeyDown={handleKeyDown}
            placeholder="Add styles"
            suffix={<NestedInputButton {...combobox.getToggleButtonProps()} />}
          />
        </ComboboxAnchor>
        <ComboboxContent>
          <ComboboxListbox {...combobox.getMenuProps()}>
            <ComboboxScrollArea>
              {combobox.items.map((item, index) => (
                <ComboboxListboxItem
                  {...combobox.getItemProps({ item, index })}
                  key={index}
                  asChild
                >
                  <Text
                    variant="labelsSentenceCase"
                    truncate
                    css={{ maxWidth: "25ch" }}
                  >
                    {item.label}
                  </Text>
                </ComboboxListboxItem>
              ))}
            </ComboboxScrollArea>
            {description && (
              <ComboboxItemDescription descriptions={descriptions}>
                {description}
              </ComboboxItemDescription>
            )}
          </ComboboxListbox>
        </ComboboxContent>
      </div>
    </ComboboxRoot>
  );
});

// Used to indent the values when they are on the next line. This way its easier to see
// where the property ends and value begins, especially in case of presets.
const indentation = `20px`;

const AdvancedPropertyLabel = ({
  property,
  onReset,
}: {
  property: StyleProperty;
  onReset?: () => void;
}) => {
  const styleDecl = useComputedStyleDecl(property);
  const label = hyphenateProperty(property);
  const description = propertyDescriptions[property];
  const [isOpen, setIsOpen] = useState(false);
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
            deleteProperty(property);
            onReset?.();
            return;
          }
          setIsOpen(true);
        },
      }}
      content={
        <PropertyInfo
          title={property.startsWith("--") ? "CSS Variable" : label}
          description={description}
          styles={[styleDecl]}
          onReset={() => {
            deleteProperty(property);
            setIsOpen(false);
            onReset?.();
          }}
        />
      }
    >
      <Label
        color={styleDecl.source.name}
        text="mono"
        css={{
          backgroundColor: "transparent",
          marginLeft: `-${indentation}`,
        }}
      >
        {label}
      </Label>
    </Tooltip>
  );
};

const AdvancedPropertyValue = ({
  autoFocus,
  property,
  onChangeComplete,
  inputRef: inputRefProp,
}: {
  autoFocus?: boolean;
  property: StyleProperty;
  onChangeComplete: ComponentProps<
    typeof CssValueInputContainer
  >["onChangeComplete"];
  inputRef?: RefObject<HTMLInputElement>;
}) => {
  const styleDecl = useComputedStyleDecl(property);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [autoFocus]);
  const isColor = colord(toValue(styleDecl.usedValue)).isValid();
  return (
    <CssValueInputContainer
      inputRef={mergeRefs(inputRef, inputRefProp)}
      variant="chromeless"
      text="mono"
      fieldSizing="content"
      prefix={
        isColor && (
          <ColorPopover
            value={styleDecl.usedValue}
            onChange={(styleValue) => {
              const options = { isEphemeral: true, listed: true };
              if (styleValue) {
                setProperty(property)(styleValue, options);
              } else {
                deleteProperty(property, options);
              }
            }}
            onChangeComplete={(styleValue) => {
              setProperty(property)(styleValue);
            }}
          />
        )
      }
      property={property}
      styleSource={styleDecl.source.name}
      getOptions={() => [
        ...styleConfigByName(property).items.map((item) => ({
          type: "keyword" as const,
          value: item.name,
        })),
        ...$availableVariables.get(),
      ]}
      value={styleDecl.cascadedValue}
      setValue={(styleValue, options) => {
        if (
          styleValue.type === "keyword" &&
          styleValue.value.startsWith("--")
        ) {
          setProperty(property)(
            { type: "var", value: styleValue.value.slice(2) },
            { ...options, listed: true }
          );
        } else {
          setProperty(property)(styleValue, { ...options, listed: true });
        }
      }}
      deleteProperty={deleteProperty}
      onChangeComplete={onChangeComplete}
    />
  );
};

/**
 * The Advanced section in the Style Panel on </> Global Root has performance issues.
 * To fix this, we skip rendering properties not visible in the viewport using the contentvisibilityautostatechange event,
 * and the contentVisibility and containIntrinsicSize CSS properties.
 */
const AdvancedProperty = memo(
  ({
    property,
    autoFocus,
    onChangeComplete,
    onReset,
    valueInputRef,
  }: {
    property: StyleProperty;
    autoFocus?: boolean;
    onReset?: () => void;
    onChangeComplete?: ComponentProps<
      typeof CssValueInputContainer
    >["onChangeComplete"];
    valueInputRef?: RefObject<HTMLInputElement>;
  }) => {
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
      <Flex
        ref={ref}
        css={{
          contentVisibility: "auto",
          // https://developer.mozilla.org/en-US/docs/Web/CSS/contain-intrinsic-size
          // containIntrinsicSize is used to set the default size of an element before any content is loaded.
          // This helps in preventing layout shifts and provides a better user experience by maintaining a consistent layout.
          // It also affects the contentvisibilityautostatechange event to be called properly,
          // with "auto" it will call it with skipped false for all initial elements.
          // 44px is the height of the property row with 2 lines of text. This value can be adjusted slightly.
          containIntrinsicSize: "auto 44px",
          paddingLeft: indentation,
        }}
        key={property}
        wrap="wrap"
        align="center"
        justify="start"
        {...{ [propertyContainerAttribute]: property }}
      >
        {isVisible && (
          <>
            <AdvancedPropertyLabel property={property} onReset={onReset} />
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
            <Box css={{ color: "red" }}>
              <AdvancedPropertyValue
                autoFocus={autoFocus}
                property={property}
                onChangeComplete={onChangeComplete}
                inputRef={valueInputRef}
              />
            </Box>
          </>
        )}
      </Flex>
    );
  }
);

export const Section = () => {
  const [isAdding, setIsAdding] = useState(false);
  const advancedStyles = useStore($advancedStyles);
  const [recentProperties, setRecentProperties] = useState<StyleProperty[]>([]);
  const addPropertyInputRef = useRef<HTMLInputElement>(null);
  const recentValueInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchProperties, setSearchProperties] =
    useState<Array<StyleProperty>>();
  const containerRef = useRef<HTMLDivElement>(null);
  const [minHeight, setMinHeight] = useState<number>(0);

  const advancedProperties = Array.from(
    advancedStyles.keys()
  ) as Array<StyleProperty>;

  const currentProperties = searchProperties ?? advancedProperties;

  const showRecentProperties =
    recentProperties.length > 0 && searchProperties === undefined;

  const memorizeMinHeight = () => {
    setMinHeight(containerRef.current?.getBoundingClientRect().height ?? 0);
  };

  const handleInsertStyles = (cssText: string) => {
    const styles = insertStyles(cssText);
    const insertedProperties = styles.map(({ property }) => property);
    setRecentProperties(
      Array.from(new Set([...recentProperties, ...insertedProperties]))
    );
  };

  const handleShowAddStylesInput = () => {
    setIsAdding(true);
    // User can click twice on the add button, so we need to focus the input on the second click after autoFocus isn't working.
    addPropertyInputRef.current?.focus();
  };

  const handleAbortSearch = () => {
    setMinHeight(0);
    setSearchProperties(undefined);
  };

  const handleSearch = (event: ChangeEvent<HTMLInputElement>) => {
    const search = event.target.value.trim();
    if (search === "") {
      return handleAbortSearch();
    }
    memorizeMinHeight();
    const matched = matchSorter(advancedProperties, search);
    setSearchProperties(matched);
  };

  const handleAbortAddStyles = () => {
    setIsAdding(false);
    requestAnimationFrame(() => {
      // We are either focusing the last value input from the recent list if available or the search input.
      const element = recentValueInputRef.current ?? searchInputRef.current;
      element?.focus();
    });
  };

  return (
    <AdvancedStyleSection
      label="Advanced"
      properties={advancedProperties}
      onAdd={handleShowAddStylesInput}
    >
      <Box css={{ paddingInline: theme.panel.paddingInline }}>
        <SearchField
          inputRef={searchInputRef}
          onChange={handleSearch}
          onAbort={handleAbortSearch}
        />
      </Box>
      <CopyPasteMenu
        onPaste={handleInsertStyles}
        properties={currentProperties}
      >
        <Flex gap="2" direction="column">
          <Box css={{ paddingInline: theme.panel.paddingInline }}>
            {showRecentProperties &&
              recentProperties.map((property, index, properties) => {
                const isLast = index === properties.length - 1;
                return (
                  <AdvancedProperty
                    valueInputRef={isLast ? recentValueInputRef : undefined}
                    key={property}
                    property={property}
                    autoFocus={isLast}
                    onChangeComplete={(event) => {
                      if (event.type === "enter") {
                        handleShowAddStylesInput();
                      }
                    }}
                    onReset={() => {
                      setRecentProperties((properties) => {
                        return properties.filter(
                          (recentProperty) => recentProperty !== property
                        );
                      });
                    }}
                  />
                );
              })}
            {(showRecentProperties || isAdding) && (
              <Box
                style={
                  isAdding
                    ? { paddingTop: theme.spacing[3] }
                    : // We hide it visually so you can tab into it to get shown.
                      { overflow: "hidden", height: 0 }
                }
              >
                <AddProperty
                  onSubmit={(cssText: string) => {
                    setIsAdding(false);
                    handleInsertStyles(cssText);
                  }}
                  onClose={handleAbortAddStyles}
                  onFocus={() => {
                    if (isAdding === false) {
                      handleShowAddStylesInput();
                    }
                  }}
                  onBlur={() => {
                    setIsAdding(false);
                  }}
                  ref={addPropertyInputRef}
                />
              </Box>
            )}
          </Box>
          {showRecentProperties && <Separator />}
          <Box
            css={{ paddingInline: theme.panel.paddingInline }}
            style={{ minHeight }}
            ref={containerRef}
          >
            {currentProperties
              .filter(
                (property) => recentProperties.includes(property) === false
              )
              .map((property) => (
                <AdvancedProperty key={property} property={property} />
              ))}
          </Box>
        </Flex>
      </CopyPasteMenu>
    </AdvancedStyleSection>
  );
};
