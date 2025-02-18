import { mergeRefs } from "@react-aria/utils";
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
import { propertyDescriptions } from "@webstudio-is/css-data";
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
  useComputedStyleDecl,
  useComputedStyles,
} from "../../shared/model";
import { getDots } from "../../shared/style-section";
import { PropertyInfo } from "../../property-label";
import { ColorPopover } from "../../shared/color-picker";
import { useClientSupports } from "~/shared/client-supports";
import { CopyPasteMenu, propertyContainerAttribute } from "./copy-paste-menu";
import { $advancedStyles } from "./stores";
import { $settings } from "~/builder/shared/client-settings";
import { AddStyleInput } from "./add-style-input";
import { parseStyleInput } from "./parse-style-input";

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

const insertStyles = (css: string) => {
  const parsedStyles = parseStyleInput(css);
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
          resetType="delete"
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
  onReset,
  inputRef: inputRefProp,
}: {
  autoFocus?: boolean;
  property: StyleProperty;
  onChangeComplete: ComponentProps<
    typeof CssValueInputContainer
  >["onChangeComplete"];
  onReset: ComponentProps<typeof CssValueInputContainer>["onReset"];
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
      onReset={onReset}
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
                onReset={onReset}
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
    return styles;
  };

  const handleShowAddStyleInput = () => {
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

    setSearchProperties(matched as StyleProperty[]);
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
                        handleShowAddStyleInput();
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
                    if (styles.length > 0) {
                      setIsAdding(false);
                    }
                  }}
                  onClose={handleAbortAddStyles}
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
