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
  keywordValues,
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
import { $availableVariables } from "../../features/style-panel/shared/model";
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
import type { ComputedStyleDecl } from "~/shared/style-object-model";

// Used to indent the values when they are on the next line. This way its easier to see
// where the property ends and value begins, especially in case of presets.
const initialIndentation = `20px`;

const AdvancedPropertyLabel = ({
  styleDecl,
  onReset,
  onDeleteProperty,
}: {
  styleDecl: ComputedStyleDecl;
  onReset?: () => void;
  onDeleteProperty: DeleteProperty;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const description =
    propertyDescriptions[camelCaseProperty(styleDecl.property)];

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
              ? "CSS Variable"
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
      <Label
        color={styleDecl.source.name}
        text="mono"
        css={{
          backgroundColor: "transparent",
          marginLeft: `-${initialIndentation}`,
        }}
      >
        {styleDecl.property}
      </Label>
    </Tooltip>
  );
};

const AdvancedPropertyValue = ({
  styleDecl,
  onDeleteProperty,
  onSetProperty,
  onChangeComplete,
  onReset,
  inputRef: inputRefProp,
}: {
  styleDecl: ComputedStyleDecl;
  onDeleteProperty: DeleteProperty;
  onSetProperty: SetProperty;
  onChangeComplete: ComponentProps<
    typeof CssValueInputContainer
  >["onChangeComplete"];
  onReset: ComponentProps<typeof CssValueInputContainer>["onReset"];
  inputRef?: RefObject<HTMLInputElement>;
}) => {
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
                onSetProperty(styleDecl.property)(styleValue, options);
              } else {
                onDeleteProperty(styleDecl.property, options);
              }
            }}
            onChangeComplete={(styleValue) => {
              onSetProperty(styleDecl.property)(styleValue);
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
      setValue={(styleValue, options) => {
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
    styleDecl,
    onChangeComplete,
    onDeleteProperty,
    onSetProperty,
    onReset,
    valueInputRef,
    indentation = initialIndentation,
  }: {
    styleDecl: ComputedStyleDecl;
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
        {...{ [copyAttribute]: styleDecl.property }}
      >
        <AdvancedPropertyLabel
          styleDecl={styleDecl}
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
  declarations,
  apiRef,
  showSearch = true,
  virtualize = true,
  propertiesPosition = "bottom",
  recentProperties = [],
  memorizeMinHeight = true,
}: {
  declarations: Array<ComputedStyleDecl>;
  onDeleteProperty: DeleteProperty;
  onSetProperty: SetProperty;
  onAddDeclarations: (styleMap: CssStyleMap) => void;
  onDeleteAllDeclarations: (styleMap: CssStyleMap) => void;
  apiRef?: RefObject<CssEditorApi>;
  showSearch?: boolean;
  // When used as part of some larger scroll area to avoid scroll jumps during search.
  // For example advanced section in the style panel.
  memorizeMinHeight?: boolean;
  propertiesPosition?: "top" | "bottom";
  virtualize?: boolean;
  recentProperties?: Array<CssProperty>;
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const addPropertyInputRef = useRef<HTMLInputElement>(null);
  const lastRecentValueInputRef = useRef<HTMLInputElement>(null);
  const lastRegularValueInputRef = useRef<HTMLInputElement>(null);
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

  const declarationsMap = new Map(
    declarations.map((decl) => [decl.property, decl])
  );

  const advancedProperties = declarations.map(({ property }) => property);

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
    const search = event.target.value.trim().replaceAll("-", " ");
    if (search === "") {
      return handleAbortSearch();
    }

    if (memorizeMinHeight) {
      setMinHeight(containerRef.current?.getBoundingClientRect().height ?? 0);
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

  const afterChangingStyles = () => {
    setIsAdding(false);
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
            <AdvancedDeclarationLonghand
              styleDecl={styleDecl}
              key={property}
              valueInputRef={lastRecentValueInputRef}
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
    </Flex>
  );

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
        declarations={declarations}
        foundProperties={
          searchProperties ?? [...recentProperties, ...currentProperties]
        }
      >
        <Flex gap="2" direction="column">
          {propertiesPosition === "bottom" && (
            <>
              {recentPropertiesAndAddStyleInput}
              {showRecentProperties && <Separator />}
            </>
          )}
          <Flex
            direction="column"
            css={{ paddingInline: theme.panel.paddingInline, gap: 2 }}
            style={{ minHeight }}
            ref={containerRef}
          >
            {currentProperties.map((property) => {
              const styleDecl = declarationsMap.get(property);
              if (styleDecl === undefined) {
                return;
              }

              const declarationElement = (
                <AdvancedDeclarationLonghand
                  styleDecl={styleDecl}
                  onDeleteProperty={handleDeleteProperty}
                  onSetProperty={onSetProperty}
                  valueInputRef={lastRegularValueInputRef}
                  key={property}
                />
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
    </>
  );
};
