import { lexer } from "css-tree";
import { colord } from "colord";
import {
  forwardRef,
  memo,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { useStore } from "@nanostores/react";
import { computed } from "nanostores";
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
  SectionTitle,
  SectionTitleButton,
  SectionTitleLabel,
  Separator,
  Text,
  theme,
  Tooltip,
  truncate,
  useCombobox,
} from "@webstudio-is/design-system";
import {
  parseCss,
  properties as propertiesData,
  propertyDescriptions,
} from "@webstudio-is/css-data";
import {
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
  $matchingBreakpoints,
  getDefinedStyles,
  useComputedStyleDecl,
  useComputedStyles,
} from "../../shared/model";
import { getDots } from "../../shared/style-section";
import { PropertyInfo } from "../../property-label";
import { sections } from "../sections";
import { ColorPopover } from "../../shared/color-picker";
import {
  $registeredComponentMetas,
  $styles,
  $styleSourceSelections,
} from "~/shared/nano-states";
import { useClientSupports } from "~/shared/client-supports";
import { $selectedInstancePath } from "~/shared/awareness";
import { $settings } from "~/builder/shared/client-settings";
import { composeEventHandlers } from "~/shared/event-utils";

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

type SearchItem = { value: string; label: string };

const matchOrSuggestToCreate = (
  search: string,
  items: Array<SearchItem>,
  itemToString: (item: SearchItem) => string
) => {
  const matched = matchSorter(items, search, {
    keys: [itemToString],
  });
  const propertyName = search.trim();
  if (
    propertyName.startsWith("--") &&
    lexer.match("<custom-ident>", propertyName).matched
  ) {
    matched.unshift({
      value: propertyName,
      label: `Create "${propertyName}"`,
    });
  }
  // When there is no match we suggest to create a custom property.
  if (matched.length === 0) {
    matched.unshift({
      value: `--${propertyName}`,
      label: `--${propertyName}`,
    });
  }
  return matched;
};

const getNewPropertyDescription = (item: null | SearchItem) => {
  let description: string | undefined = `Create CSS variable.`;
  if (item && item.value in propertyDescriptions) {
    description = propertyDescriptions[item.value];
  }
  return <Box css={{ width: theme.spacing[28] }}>{description}</Box>;
};

const insertStyles = (text: string) => {
  const parsedStyles = parseCss(`selector{${text}}`);
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

const sortedProperties = Object.keys(propertiesData)
  .sort(Intl.Collator().compare)
  .map((property) => ({
    value: property,
    label: hyphenateProperty(property),
  }));

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
    onSelect: (value: StyleProperty) => void;
    onClose: () => void;
    onSubmit: (value: string) => void;
    onFocus: () => void;
  }
>(({ onSelect, onClose, onSubmit, onFocus }, forwardedRef) => {
  const [item, setItem] = useState<SearchItem>({
    value: "",
    label: "",
  });

  const combobox = useCombobox<SearchItem>({
    getItems: () => sortedProperties,
    itemToString: (item) => item?.label ?? "",
    value: item,
    defaultHighlightedIndex: 0,
    getItemProps: () => ({ text: "sentence" }),
    match: matchOrSuggestToCreate,
    onChange: (value) => setItem({ value: value ?? "", label: value ?? "" }),
    onItemSelect: (item) => {
      clear();
      onSelect(item.value as StyleProperty);
    },
  });

  const descriptionItem = combobox.items[combobox.highlightedIndex];
  const description = getNewPropertyDescription(descriptionItem);
  const descriptions = combobox.items.map(getNewPropertyDescription);
  const inputProps = combobox.getInputProps();

  const clear = () => {
    setItem({ value: "", label: "" });
  };

  const handleKeys = (event: KeyboardEvent) => {
    // Dropdown might handle enter or escape.
    if (event.defaultPrevented) {
      return;
    }
    if (event.key === "Enter") {
      clear();
      onSubmit(item.value);
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
        <input type="submit" hidden />
        <ComboboxAnchor>
          <InputField
            {...inputProps}
            onFocus={onFocus}
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
}: {
  autoFocus?: boolean;
  property: StyleProperty;
  onChangeComplete: ComponentProps<
    typeof CssValueInputContainer
  >["onChangeComplete"];
}) => {
  const styleDecl = useComputedStyleDecl(property);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);
  const isColor = colord(toValue(styleDecl.usedValue)).isValid();
  return (
    <CssValueInputContainer
      inputRef={inputRef}
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

const initialProperties = new Set<StyleProperty>([
  "cursor",
  "mixBlendMode",
  "opacity",
  "pointerEvents",
  "userSelect",
]);

const $advancedProperties = computed(
  [
    // prevent showing properties inherited from root
    // to not bloat advanced panel
    $selectedInstancePath,
    $registeredComponentMetas,
    $styleSourceSelections,
    $matchingBreakpoints,
    $styles,
    $settings,
  ],
  (
    instancePath,
    metas,
    styleSourceSelections,
    matchingBreakpoints,
    styles,
    settings
  ) => {
    if (instancePath === undefined) {
      return [];
    }
    const definedStyles = getDefinedStyles({
      instancePath,
      metas,
      matchingBreakpoints,
      styleSourceSelections,
      styles,
    });
    // All properties used by the panels except the advanced panel
    const baseProperties = new Set<StyleProperty>([]);
    for (const { properties } of sections.values()) {
      for (const property of properties) {
        baseProperties.add(property);
      }
    }
    const advancedProperties = new Set<StyleProperty>();
    for (const { property, listed } of definedStyles) {
      if (baseProperties.has(property) === false) {
        // When property is listed, it was added from advanced panel.
        // If we are in advanced mode, we show them all.
        if (listed || settings.stylePanelMode === "advanced") {
          advancedProperties.add(property);
        }
      }
    }
    // In advanced mode we assume user knows the properties they need, so we don't need to show these.
    // @todo we need to find a better place for them in any case
    if (settings.stylePanelMode !== "advanced") {
      for (const property of initialProperties) {
        advancedProperties.add(property);
      }
    }
    return Array.from(advancedProperties);
  }
);

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
  }: {
    property: StyleProperty;
    autoFocus?: boolean;
    onReset?: () => void;
    onChangeComplete?: ComponentProps<
      typeof CssValueInputContainer
    >["onChangeComplete"];
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
        }}
        key={property}
        wrap="wrap"
        align="center"
        justify="start"
      >
        {isVisible && (
          <>
            <AdvancedPropertyLabel property={property} onReset={onReset} />
            <Text>:</Text>
            <AdvancedPropertyValue
              autoFocus={autoFocus}
              property={property}
              onChangeComplete={onChangeComplete}
            />
          </>
        )}
      </Flex>
    );
  }
);

export const Section = () => {
  const [isAdding, setIsAdding] = useState(false);
  const advancedProperties = useStore($advancedProperties);
  const [recentProperties, setRecentProperties] = useState<StyleProperty[]>([]);
  const addPropertyInputRef = useRef<HTMLInputElement>(null);

  const addRecentProperties = (properties: StyleProperty[]) => {
    setRecentProperties(
      Array.from(new Set([...recentProperties, ...properties]))
    );
  };

  const showAddProperty = () => {
    setIsAdding(true);
    // User can click twice on the add button, so we need to focus the input on the second click after autoFocus isn't working.
    addPropertyInputRef.current?.focus();
  };

  return (
    <AdvancedStyleSection
      label="Advanced"
      properties={advancedProperties}
      onAdd={showAddProperty}
    >
      <Box css={{ paddingInline: theme.panel.paddingInline }}>
        {recentProperties.map((property, index, properties) => (
          <AdvancedProperty
            key={property}
            property={property}
            autoFocus={index === properties.length - 1}
            onChangeComplete={(event) => {
              if (event.type === "enter") {
                showAddProperty();
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
        ))}
        <Box
          css={
            isAdding
              ? { paddingTop: theme.spacing[3] }
              : // We hide it visually so you can tab into it to get shown.
                { overflow: "hidden", height: 0 }
          }
        >
          <AddProperty
            onSelect={(property) => {
              setIsAdding(false);
              const isNew = advancedProperties.includes(property) === false;
              if (isNew) {
                setProperty(property)(
                  { type: "guaranteedInvalid" },
                  { listed: true }
                );
              }
              addRecentProperties([property]);
            }}
            onSubmit={(value) => {
              setIsAdding(false);
              const styles = insertStyles(value);
              const insertedProperties = styles.map(({ property }) => property);
              addRecentProperties(insertedProperties);
            }}
            onClose={() => {
              setIsAdding(false);
            }}
            onFocus={() => {
              if (isAdding === false) {
                showAddProperty();
              }
            }}
            ref={addPropertyInputRef}
          />
        </Box>
      </Box>
      {recentProperties.length > 0 && <Separator />}
      <Box css={{ paddingInline: theme.panel.paddingInline }}>
        {advancedProperties
          .filter((property) => recentProperties.includes(property) === false)
          .map((property) => (
            <AdvancedProperty key={property} property={property} />
          ))}
      </Box>
    </AdvancedStyleSection>
  );
};
