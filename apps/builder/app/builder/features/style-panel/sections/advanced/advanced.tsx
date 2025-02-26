import { mergeRefs } from "@react-aria/utils";
import { flushSync } from "react-dom";
import { colord } from "colord";
import {
  memo,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ComponentProps,
  type ReactNode,
  type RefObject,
} from "react";
import { useStore } from "@nanostores/react";
import { matchSorter } from "match-sorter";
import { PlusIcon } from "@webstudio-is/icons";
import {
  Box,
  Flex,
  Label,
  SearchField,
  SectionTitle,
  SectionTitleButton,
  SectionTitleLabel,
  Separator,
  Text,
  theme,
  Tooltip,
} from "@webstudio-is/design-system";
import {
  camelCaseProperty,
  propertyDescriptions,
} from "@webstudio-is/css-data";
import {
  hyphenateProperty,
  toValue,
  type CssProperty,
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
import { CopyPasteMenu, copyAttribute } from "./copy-paste-menu";
import { $advancedStylesLonghands } from "./stores";
import { $settings } from "~/builder/shared/client-settings";
import { AddStyleInput } from "./add-style-input";
import { parseStyleInput } from "./parse-style-input";
import { $selectedInstanceKey } from "~/shared/awareness";

// Only here to keep the same section module interface
export const properties = [];

const AdvancedStyleSection = (props: {
  label: string;
  properties: Array<CssProperty>;
  onAdd: () => void;
  children: ReactNode;
}) => {
  const { label, children, properties, onAdd } = props;
  const [isOpen, setIsOpen] = useOpenState(label);
  const styles = useComputedStyles(properties.map(camelCaseProperty));
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

const insertStyles = (css: string) => {
  const styleMap = parseStyleInput(css);
  if (styleMap.size === 0) {
    return new Map();
  }
  const batch = createBatchUpdate();
  for (const [property, value] of styleMap) {
    batch.setProperty(camelCaseProperty(property as CssProperty))(value);
  }
  batch.publish({ listed: true });
  return styleMap;
};

// Used to indent the values when they are on the next line. This way its easier to see
// where the property ends and value begins, especially in case of presets.
const initialIndentation = `20px`;

const AdvancedPropertyLabel = ({
  property,
  onReset,
}: {
  property: CssProperty;
  onReset?: () => void;
}) => {
  const camelCasedProperty = camelCaseProperty(property);
  const styleDecl = useComputedStyleDecl(camelCasedProperty);
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
            deleteProperty(camelCasedProperty);
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
            deleteProperty(camelCasedProperty);
            setIsOpen(false);
            onReset?.();
          }}
          resetType="delete"
        />
      }
    >
      <Label
        color={styleDecl.source.name}
        text="mono"
        css={{
          backgroundColor: "transparent",
          marginLeft: `-${initialIndentation}`,
        }}
      >
        {label}
      </Label>
    </Tooltip>
  );
};

const AdvancedPropertyValue = ({
  property,
  onChangeComplete,
  onReset,
  inputRef: inputRefProp,
}: {
  property: CssProperty;
  onChangeComplete: ComponentProps<
    typeof CssValueInputContainer
  >["onChangeComplete"];
  onReset: ComponentProps<typeof CssValueInputContainer>["onReset"];
  inputRef?: RefObject<HTMLInputElement>;
}) => {
  // @todo conversion should be removed once data is in dash case
  const camelCasedProperty = camelCaseProperty(property);
  const styleDecl = useComputedStyleDecl(camelCasedProperty);
  const inputRef = useRef<HTMLInputElement>(null);
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
                setProperty(camelCasedProperty)(styleValue, options);
              } else {
                deleteProperty(camelCasedProperty, options);
              }
            }}
            onChangeComplete={(styleValue) => {
              setProperty(camelCasedProperty)(styleValue);
            }}
          />
        )
      }
      property={camelCasedProperty}
      styleSource={styleDecl.source.name}
      getOptions={() => [
        ...styleConfigByName(camelCasedProperty).items.map((item) => ({
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
          setProperty(camelCasedProperty)(
            { type: "var", value: styleValue.value.slice(2) },
            { ...options, listed: true }
          );
        } else {
          setProperty(camelCasedProperty)(styleValue, {
            ...options,
            listed: true,
          });
        }
      }}
      deleteProperty={deleteProperty}
      onChangeComplete={onChangeComplete}
      onReset={onReset}
    />
  );
};

/**
 * The Advanced section in the Style Panel on </> Global Root has performance issues.
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
    property,
    onChangeComplete,
    onReset,
    valueInputRef,
    indentation = initialIndentation,
  }: {
    property: CssProperty;
    indentation?: string;
    onReset?: () => void;
    onChangeComplete?: ComponentProps<
      typeof CssValueInputContainer
    >["onChangeComplete"];
    valueInputRef?: RefObject<HTMLInputElement>;
  }) => {
    return (
      <Flex
        css={{ paddingLeft: indentation }}
        wrap="wrap"
        align="center"
        justify="start"
        {...{ [copyAttribute]: property }}
      >
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
        <AdvancedPropertyValue
          property={property}
          onChangeComplete={onChangeComplete}
          onReset={onReset}
          inputRef={valueInputRef}
        />
      </Flex>
    );
  }
);

export const Section = () => {
  const [isAdding, setIsAdding] = useState(false);
  const advancedStyles = useStore($advancedStylesLonghands);
  const selectedInstanceKey = useStore($selectedInstanceKey);
  // Memorizing recent properties by instance id, so that when user switches between instances and comes back
  // they are still in-place
  const [recentPropertiesMap, setRecentPropertiesMap] = useState<
    Map<string, Array<CssProperty>>
  >(new Map());
  const addPropertyInputRef = useRef<HTMLInputElement>(null);
  const recentValueInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchProperties, setSearchProperties] =
    useState<Array<CssProperty>>();
  const containerRef = useRef<HTMLDivElement>(null);
  const [minHeight, setMinHeight] = useState<number>(0);

  const advancedProperties = Array.from(
    advancedStyles.keys()
  ) as Array<CssProperty>;

  const currentProperties = searchProperties ?? advancedProperties;

  const recentProperties = selectedInstanceKey
    ? (recentPropertiesMap.get(selectedInstanceKey) ?? [])
    : [];

  const showRecentProperties =
    recentProperties.length > 0 && searchProperties === undefined;

  const memorizeMinHeight = () => {
    setMinHeight(containerRef.current?.getBoundingClientRect().height ?? 0);
  };

  const updateRecentProperties = (properties: Array<CssProperty>) => {
    if (selectedInstanceKey === undefined) {
      return;
    }
    const newRecentPropertiesMap = new Map(recentPropertiesMap);
    newRecentPropertiesMap.set(
      selectedInstanceKey,
      Array.from(new Set(properties))
    );
    setRecentPropertiesMap(newRecentPropertiesMap);
  };

  const handleInsertStyles = (cssText: string) => {
    const styleMap = insertStyles(cssText);
    const insertedProperties = Array.from(
      styleMap.keys()
    ) as Array<CssProperty>;
    updateRecentProperties([...recentProperties, ...insertedProperties]);
    return styleMap;
  };

  const handleShowAddStyleInput = () => {
    flushSync(() => {
      setIsAdding(true);
    });
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
    // This is not needed in advanced mode because the input won't jump there as it is on top
    if ($settings.get().stylePanelMode !== "advanced") {
      memorizeMinHeight();
    }

    const styles = [];
    for (const [property, value] of advancedStyles) {
      styles.push({ property, value: toValue(value) });
    }

    const matched = matchSorter(styles, search, {
      keys: ["property", "value"],
    }).map(({ property }) => property);

    setSearchProperties(matched as CssProperty[]);
  };

  const afterAddingStyles = () => {
    setIsAdding(false);
    requestAnimationFrame(() => {
      // We are either focusing the last value input from the recent list if available or the search input.
      const element = recentValueInputRef.current ?? searchInputRef.current;
      element?.focus();
      element?.select();
    });
  };

  return (
    <AdvancedStyleSection
      label="Advanced"
      properties={advancedProperties}
      onAdd={handleShowAddStyleInput}
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
          <Flex
            direction="column"
            css={{ paddingInline: theme.panel.paddingInline, gap: 2 }}
          >
            {showRecentProperties &&
              recentProperties.map((property, index, properties) => {
                const isLast = index === properties.length - 1;
                return (
                  <AdvancedDeclarationLonghand
                    key={property}
                    valueInputRef={isLast ? recentValueInputRef : undefined}
                    property={property}
                    onChangeComplete={(event) => {
                      if (event.type === "enter") {
                        handleShowAddStyleInput();
                      }
                    }}
                    onReset={() => {
                      updateRecentProperties(
                        recentProperties.filter(
                          (recentProperty) => recentProperty !== property
                        )
                      );
                    }}
                  />
                );
              })}
            {(showRecentProperties || isAdding) && (
              <Box
                css={
                  isAdding
                    ? { paddingTop: theme.spacing[3] }
                    : // We hide it visually so you can tab into it to get shown.
                      { overflow: "hidden", height: 0 }
                }
              >
                <AddStyleInput
                  onSubmit={(cssText: string) => {
                    const styles = handleInsertStyles(cssText);
                    if (styles.size > 0) {
                      afterAddingStyles();
                    }
                  }}
                  onClose={afterAddingStyles}
                  onFocus={() => {
                    if (isAdding === false) {
                      handleShowAddStyleInput();
                    }
                  }}
                  onBlur={() => {
                    setIsAdding(false);
                  }}
                  ref={addPropertyInputRef}
                />
              </Box>
            )}
          </Flex>
          {showRecentProperties && <Separator />}
          <Flex
            direction="column"
            css={{ paddingInline: theme.panel.paddingInline, gap: 2 }}
            style={{ minHeight }}
            ref={containerRef}
          >
            {currentProperties
              .filter(
                (property) => recentProperties.includes(property) === false
              )
              .map((property) => {
                return (
                  <LazyRender key={property}>
                    <AdvancedDeclarationLonghand property={property} />
                  </LazyRender>
                );
              })}
          </Flex>
        </Flex>
      </CopyPasteMenu>
    </AdvancedStyleSection>
  );
};
