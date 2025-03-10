import { mergeRefs } from "@react-aria/utils";
import { flushSync } from "react-dom";
import { colord } from "colord";
import {
  memo,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ChangeEvent,
  type ComponentProps,
  type RefObject,
} from "react";
import { matchSorter } from "match-sorter";
import {
  Box,
  Flex,
  Label,
  SearchField,
  Separator,
  Text,
  theme,
  Tooltip,
} from "@webstudio-is/design-system";
import {
  camelCaseProperty,
  propertiesData,
  propertyDescriptions,
} from "@webstudio-is/css-data";
import {
  toValue,
  type CssProperty,
  type CssStyleMap,
} from "@webstudio-is/css-engine";
// @todo all style panel stuff needs to be moved to shared and/or decoupled from style panel
import { CssValueInputContainer } from "../../features/style-panel/shared/css-value-input";
import { styleConfigByName } from "../../features/style-panel/shared/configs";
import {
  $availableVariables,
  useComputedStyleDecl,
} from "../../features/style-panel/shared/model";
import { PropertyInfo } from "../../features/style-panel/property-label";
import { ColorPopover } from "../../features/style-panel/shared/color-picker";
import { useClientSupports } from "~/shared/client-supports";
import { CssEditorContextMenu, copyAttribute } from "./css-editor-context-menu";
import { AddStyleInput } from "./add-style-input";
import { parseStyleInput } from "./parse-style-input";
import type {
  DeleteProperty,
  SetProperty,
} from "../../features/style-panel/shared/use-style-data";

// Used to indent the values when they are on the next line. This way its easier to see
// where the property ends and value begins, especially in case of presets.
const initialIndentation = `20px`;

const AdvancedPropertyLabel = ({
  property,
  onReset,
  onDeleteProperty,
}: {
  property: CssProperty;
  onReset?: () => void;
  onDeleteProperty: DeleteProperty;
}) => {
  const styleDecl = useComputedStyleDecl(property);
  const [isOpen, setIsOpen] = useState(false);

  const description = propertyDescriptions[camelCaseProperty(property)];

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
            onDeleteProperty(property);
            onReset?.();
            return;
          }
          setIsOpen(true);
        },
      }}
      content={
        <PropertyInfo
          title={property.startsWith("--") ? "CSS Variable" : property}
          description={description}
          styles={[styleDecl]}
          onReset={() => {
            onDeleteProperty(property);
            setIsOpen(false);
            onReset?.();
          }}
          resetType="delete"
          link={propertiesData[property]?.mdnUrl}
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
        {property}
      </Label>
    </Tooltip>
  );
};

const AdvancedPropertyValue = ({
  property,
  onDeleteProperty,
  onSetProperty,
  onChangeComplete,
  onReset,
  inputRef: inputRefProp,
}: {
  property: CssProperty;
  onDeleteProperty: DeleteProperty;
  onSetProperty: SetProperty;
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
                onSetProperty(camelCasedProperty)(styleValue, options);
              } else {
                onDeleteProperty(camelCasedProperty, options);
              }
            }}
            onChangeComplete={(styleValue) => {
              onSetProperty(camelCasedProperty)(styleValue);
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
          onSetProperty(camelCasedProperty)(
            { type: "var", value: styleValue.value.slice(2) },
            { ...options, listed: true }
          );
        } else {
          onSetProperty(camelCasedProperty)(styleValue, {
            ...options,
            listed: true,
          });
        }
      }}
      deleteProperty={onDeleteProperty}
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
    onDeleteProperty,
    onSetProperty,
    onReset,
    valueInputRef,
    indentation = initialIndentation,
  }: {
    property: CssProperty;
    indentation?: string;
    onReset?: () => void;
    onSetProperty: SetProperty;
    onDeleteProperty: DeleteProperty;
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
        <AdvancedPropertyLabel
          property={property}
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
          property={property}
          onChangeComplete={onChangeComplete}
          onReset={onReset}
          onDeleteProperty={onDeleteProperty}
          onSetProperty={onSetProperty}
          inputRef={valueInputRef}
        />
      </Flex>
    );
  }
);

export type CssEditorApi = { showAddStyleInput: () => void } | undefined;

export const CssEditor = ({
  onDeleteProperty,
  onSetProperty,
  onAddDeclarations,
  onDeleteAllDeclarations,
  styleMap,
  apiRef,
  showSearch = true,
  recentProperties = [],
  memorizeMinHeight = true,
}: {
  onDeleteProperty: DeleteProperty;
  onSetProperty: SetProperty;
  onAddDeclarations: (styleMap: CssStyleMap) => void;
  onDeleteAllDeclarations: (styleMap: CssStyleMap) => void;
  styleMap: CssStyleMap;
  apiRef?: RefObject<CssEditorApi>;
  showSearch?: boolean;
  // When used as part of some larger scroll area to avoid scroll jumps during search.
  // For example advanced section in the style panel.
  memorizeMinHeight?: boolean;
  recentProperties?: Array<CssProperty>;
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const addPropertyInputRef = useRef<HTMLInputElement>(null);
  const recentValueInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchProperties, setSearchProperties] =
    useState<Array<CssProperty>>();
  const containerRef = useRef<HTMLDivElement>(null);
  const [minHeight, setMinHeight] = useState<number>(0);
  useImperativeHandle(apiRef, () => ({
    showAddStyleInput() {
      handleShowAddStyleInput();
    },
  }));

  const advancedProperties = Array.from(styleMap.keys());

  const currentProperties =
    searchProperties ??
    advancedProperties.filter(
      (property) => recentProperties.includes(property) === false
    );

  const showRecentProperties =
    recentProperties.length > 0 && searchProperties === undefined;

  const handleInsertStyles = (cssText: string) => {
    const styleMap = parseStyleInput(cssText);
    if (styleMap.size === 0) {
      return new Map();
    }
    onAddDeclarations(styleMap);
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

    if (memorizeMinHeight) {
      setMinHeight(containerRef.current?.getBoundingClientRect().height ?? 0);
    }

    const styles = [];
    for (const [property, value] of styleMap) {
      styles.push({
        // Allows searching for property or value and using something like this:
        // "gr te co" -> "grid-template-columns"
        key: `${property.replaceAll("-", " ")} ${toValue(value)}`,
        property,
      });
    }

    const matched = matchSorter(styles, search, {
      keys: ["key"],
    }).map(({ property }) => property);

    setSearchProperties(matched);
  };

  const afterChangingStyles = () => {
    setIsAdding(false);
    requestAnimationFrame(() => {
      // We are either focusing the last value input from the recent list if available or the search input.
      const element = recentValueInputRef.current ?? searchInputRef.current;
      element?.focus();
      element?.select();
    });
  };

  const handleDeleteProperty: DeleteProperty = (property, options = {}) => {
    onDeleteProperty(property, options);
    if (options.isEphemeral === true) {
      return;
    }
    setSearchProperties(
      searchProperties?.filter((searchProperty) => searchProperty !== property)
    );
  };

  const handleDeleteAllDeclarations = (styleMap: CssStyleMap) => {
    setSearchProperties(
      searchProperties?.filter(
        (searchProperty) => styleMap.has(searchProperty) === false
      )
    );
    onDeleteAllDeclarations(styleMap);
  };

  return (
    <>
      {showSearch && (
        <Box css={{ paddingInline: theme.panel.paddingInline }}>
          <SearchField
            inputRef={searchInputRef}
            onChange={handleSearch}
            onAbort={handleAbortSearch}
          />
        </Box>
      )}
      <CssEditorContextMenu
        onPaste={handleInsertStyles}
        onDeleteProperty={handleDeleteProperty}
        onDeleteAllDeclarations={handleDeleteAllDeclarations}
        styleMap={styleMap}
        properties={
          searchProperties ?? [...recentProperties, ...currentProperties]
        }
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
                    onReset={afterChangingStyles}
                    onDeleteProperty={handleDeleteProperty}
                    onSetProperty={onSetProperty}
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
                      afterChangingStyles();
                    }
                  }}
                  onClose={afterChangingStyles}
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
            {currentProperties.map((property) => {
              return (
                <LazyRender key={property}>
                  <AdvancedDeclarationLonghand
                    property={property}
                    onDeleteProperty={handleDeleteProperty}
                    onSetProperty={onSetProperty}
                  />
                </LazyRender>
              );
            })}
          </Flex>
        </Flex>
      </CssEditorContextMenu>
    </>
  );
};
