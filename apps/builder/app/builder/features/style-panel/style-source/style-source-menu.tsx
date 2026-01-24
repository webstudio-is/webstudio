import { Fragment, useState } from "react";
import {
  Box,
  Combobox,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Flex,
  InputErrorsTooltip,
  rawTheme,
  styled,
  Text,
  theme,
} from "@webstudio-is/design-system";
import { CheckMarkIcon, ChevronDownIcon, DotIcon } from "@webstudio-is/icons";
import {
  pseudoClassDescriptions,
  pseudoElementDescriptions,
  validateSelector,
} from "@webstudio-is/css-data";
import {
  menuCssVars,
  type ItemSource,
  type ItemSelector,
} from "./style-source-control";

export type SelectorConfig = {
  type: "state" | "pseudoElement";
  selector: string;
  label: string;
  description?: string;
  source?: "native" | "component" | "custom";
};

type IntermediateItem = {
  id: string;
  label: string;
  disabled: boolean;
  source: ItemSource;
  isAdded?: boolean;
  states: string[];
};

const menuTriggerVisibilityVar = "--ws-style-source-menu-trigger-visibility";
const menuTriggerVisibilityOverrideVar =
  "--ws-style-source-menu-trigger-visibility-override";
const visibility = `var(${menuTriggerVisibilityOverrideVar}, var(${menuTriggerVisibilityVar}))`;
const menuTriggerGradientVar = "--ws-style-source-menu-trigger-gradient";

const MenuTrigger = styled("button", {
  display: "inline-flex",
  border: "none",
  boxSizing: "border-box",
  minWidth: 0,
  alignItems: "center",
  position: "absolute",
  right: 0,
  top: 0,
  height: "100%",
  padding: 0,
  borderTopRightRadius: theme.borderRadius[4],
  borderBottomRightRadius: theme.borderRadius[4],
  color: theme.colors.foregroundContrastMain,
  visibility,
  "&:hover, &[data-state=open]": {
    ...menuCssVars({ show: true }),
    "&::after": {
      content: '""',
      display: "block",
      position: "absolute",
      top: 0,
      right: 0,
      width: "100%",
      height: "100%",
      visibility,
      backgroundColor: theme.colors.backgroundButtonHover,
      borderTopRightRadius: theme.borderRadius[4],
      borderBottomRightRadius: theme.borderRadius[4],
      pointerEvents: "none",
    },
  },
});

const MenuTriggerGradient = styled(Box, {
  position: "absolute",
  top: 0,
  right: 0,
  width: theme.sizes.controlHeight,
  height: "100%",
  visibility,
  background: `var(${menuTriggerGradientVar})`,
  borderTopRightRadius: theme.borderRadius[4],
  borderBottomRightRadius: theme.borderRadius[4],
  pointerEvents: "none",
});

const selectorLabels = [
  "state",
  "pseudoElement",
] satisfies SelectorConfig["type"][];

const categoryLabels: Record<SelectorConfig["type"], string> = {
  state: "States",
  pseudoElement: "Pseudo elements",
};

const menuActionDescriptions = {
  rename: "Change the name of this token to better describe its purpose.",
  duplicate: "Create a copy of this token with all its styles.",
  convertToToken:
    "Turn local styles into a reusable token you can apply to other elements.",
  clearStyles: "Remove all styles from this local style source.",
  detach: "Remove this token from the element without deleting it.",
  delete: "Permanently delete this token and all its styles from the project.",
} as const;

type MenuAction = keyof typeof menuActionDescriptions;

// All available CSS selectors for autocomplete
const allSelectors = [
  ...Object.keys(pseudoClassDescriptions),
  ...Object.keys(pseudoElementDescriptions),
];

const getDescription = (selector: string, type: "state" | "pseudoElement") => {
  // Normalize the selector to match the description keys
  const normalized = selector.startsWith(":") ? selector : `:${selector}`;
  const doubleColon = selector.startsWith("::")
    ? selector
    : `::${selector.replace(/^:/, "")}`;

  if (type === "pseudoElement") {
    return (
      pseudoElementDescriptions[doubleColon] ??
      pseudoElementDescriptions[selector]
    );
  }
  return (
    pseudoClassDescriptions[normalized] ?? pseudoClassDescriptions[selector]
  );
};

const getSelectorDescription = (selector: string | null | undefined) => {
  if (selector === undefined || selector === null) {
    return;
  }
  // Determine type based on which description object contains the selector
  const type =
    selector in pseudoElementDescriptions ? "pseudoElement" : "state";
  const description = getDescription(selector, type);
  if (description === undefined) {
    return;
  }
  return <Box css={{ maxWidth: theme.spacing[26] }}>{description}</Box>;
};

const SelectorCombobox = ({
  existingSelectors,
  onSelect,
}: {
  existingSelectors: string[];
  onSelect: (selector: string) => void;
}) => {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string>();

  const handleSubmit = (selector: string) => {
    const validation = validateSelector(selector);
    if (validation.success === false) {
      setError(validation.error);
      return;
    }
    setError(undefined);
    onSelect(selector);
    setValue("");
  };

  const availableItems = allSelectors.filter((selector) =>
    existingSelectors.every((s) => s !== selector)
  );

  return (
    <form
      onKeyDown={(event) => event.stopPropagation()}
      onSubmit={(event) => {
        event.preventDefault();
        if (value.trim()) {
          handleSubmit(value.trim());
        }
      }}
    >
      <InputErrorsTooltip
        variant="wrapped"
        errors={error ? [error] : undefined}
      >
        <Combobox<string>
          autoFocus={false}
          placeholder="::before"
          suffix={<span />}
          color={error ? "error" : undefined}
          getItems={() => availableItems}
          value={value}
          itemToString={(item) => item ?? ""}
          getDescription={getSelectorDescription}
          onItemSelect={(item) => {
            if (item) {
              handleSubmit(item);
            }
          }}
          onChange={(newValue) => {
            setValue(newValue ?? "");
            if (error) {
              setError(undefined);
            }
          }}
        />
      </InputErrorsTooltip>
    </form>
  );
};

type StyleSourceMenuProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedItemSelector: undefined | ItemSelector;
  item: IntermediateItem;
  hasStyles: boolean;
  states: SelectorConfig[];
  onAddSelector?: (itemId: IntermediateItem["id"], selector: string) => void;
  onSelect?: (itemSelector: ItemSelector) => void;
  onEdit?: (itemId: IntermediateItem["id"]) => void;
  onDuplicate?: (itemId: IntermediateItem["id"]) => void;
  onConvertToToken?: (itemId: IntermediateItem["id"]) => void;
  onDisable?: (itemId: IntermediateItem["id"]) => void;
  onEnable?: (itemId: IntermediateItem["id"]) => void;
  onDetach?: (itemId: IntermediateItem["id"]) => void;
  onDelete?: (itemId: IntermediateItem["id"]) => void;
  onClearStyles?: (itemId: IntermediateItem["id"]) => void;
};

export const StyleSourceMenu = (props: StyleSourceMenuProps) => {
  const [highlightedSelector, setHighlightedSelector] = useState<{
    selector: string;
    type: "state" | "pseudoElement";
    description?: string;
  }>();
  const [highlightedAction, setHighlightedAction] = useState<MenuAction>();

  // Get description for highlighted or selected item
  const selectedState = props.selectedItemSelector?.state;
  const selectedConfig = selectedState
    ? props.states.find((s) => s.selector === selectedState)
    : undefined;
  const descriptionSelector =
    highlightedSelector ??
    (selectedConfig
      ? {
          selector: selectedConfig.selector,
          type: selectedConfig.type,
          description: selectedConfig.description,
        }
      : undefined);

  // Priority: action description > selector description > source description
  const actionDescription = highlightedAction
    ? menuActionDescriptions[highlightedAction]
    : undefined;

  const selectorDescription = descriptionSelector
    ? (descriptionSelector.description ??
      getDescription(descriptionSelector.selector, descriptionSelector.type))
    : undefined;

  // Get source description based on item source
  const sourceDescription =
    props.item.source === "local"
      ? "Style instances without creating a token or override a token locally."
      : props.item.source === "token"
        ? "Reuse styles across multiple instances by creating a token."
        : undefined;

  const description =
    actionDescription ?? selectorDescription ?? sourceDescription;

  return (
    <DropdownMenu modal open={props.open} onOpenChange={props.onOpenChange}>
      <DropdownMenuTrigger asChild>
        <MenuTrigger aria-label="Menu Button">
          <MenuTriggerGradient />
          <ChevronDownIcon style={{ position: "relative" }} />
        </MenuTrigger>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        onCloseAutoFocus={(event) => event.preventDefault()}
        autoFocus
        css={{ maxWidth: theme.spacing[26] }}
      >
        <DropdownMenuLabel>
          <Flex gap="1" justify="between" align="center">
            <Text css={{ fontWeight: "bold" }} truncate>
              {props.item.label}
            </Text>
            {props.hasStyles && (
              <DotIcon size="12" color={rawTheme.colors.foregroundPrimary} />
            )}
          </Flex>
        </DropdownMenuLabel>
        {props.item.source !== "local" && (
          <DropdownMenuItem
            onFocus={() => {
              setHighlightedSelector(undefined);
              setHighlightedAction("rename");
            }}
            onSelect={() => props.onEdit?.(props.item.id)}
          >
            Rename
          </DropdownMenuItem>
        )}
        {props.item.source !== "local" && (
          <DropdownMenuItem
            onFocus={() => {
              setHighlightedSelector(undefined);
              setHighlightedAction("duplicate");
            }}
            onSelect={() => props.onDuplicate?.(props.item.id)}
          >
            Duplicate
          </DropdownMenuItem>
        )}
        {props.item.source === "local" && (
          <DropdownMenuItem
            onFocus={() => {
              setHighlightedSelector(undefined);
              setHighlightedAction("convertToToken");
            }}
            onSelect={() => props.onConvertToToken?.(props.item.id)}
          >
            Convert to token
          </DropdownMenuItem>
        )}
        {props.item.source === "local" && (
          <DropdownMenuItem
            destructive={true}
            onFocus={() => {
              setHighlightedSelector(undefined);
              setHighlightedAction("clearStyles");
            }}
            onSelect={() => props.onClearStyles?.(props.item.id)}
          >
            Clear styles
          </DropdownMenuItem>
        )}
        {props.item.source !== "local" && (
          <DropdownMenuItem
            onFocus={() => {
              setHighlightedSelector(undefined);
              setHighlightedAction("detach");
            }}
            onSelect={() => props.onDetach?.(props.item.id)}
          >
            Detach
          </DropdownMenuItem>
        )}
        {props.item.source !== "local" && (
          <DropdownMenuItem
            destructive={true}
            onFocus={() => {
              setHighlightedSelector(undefined);
              setHighlightedAction("delete");
            }}
            onSelect={() => props.onDelete?.(props.item.id)}
          >
            Delete
          </DropdownMenuItem>
        )}
        {selectorLabels.map((currentCategory) => {
          const categoryStates = props.states.filter(
            ({ type }) => type === currentCategory
          );
          if (categoryStates.length === 0) {
            return;
          }
          return (
            <Fragment key={currentCategory}>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>
                {categoryLabels[currentCategory]}
              </DropdownMenuLabel>
              {categoryStates.map(
                ({ label, selector, source, type, description }, index) => {
                  const previousItem = categoryStates[index - 1];
                  const showSeparator =
                    index > 0 &&
                    ((source === "component" &&
                      previousItem?.source !== "component") ||
                      (source === "custom" &&
                        previousItem?.source !== "custom"));

                  return (
                    <Fragment key={selector}>
                      {showSeparator && <DropdownMenuSeparator />}
                      <DropdownMenuItem
                        withIndicator={true}
                        onFocus={() => {
                          setHighlightedAction(undefined);
                          setHighlightedSelector({
                            selector,
                            type,
                            description,
                          });
                        }}
                        icon={
                          props.item.id ===
                            props.selectedItemSelector?.styleSourceId &&
                          selector === props.selectedItemSelector.state && (
                            <CheckMarkIcon
                              color={
                                props.item.states.includes(selector)
                                  ? rawTheme.colors.foregroundPrimary
                                  : rawTheme.colors.foregroundIconMain
                              }
                              size={12}
                            />
                          )
                        }
                        onSelect={() =>
                          props.onSelect?.({
                            styleSourceId: props.item.id,
                            state:
                              props.selectedItemSelector?.state === selector
                                ? undefined
                                : selector,
                          })
                        }
                      >
                        <Flex justify="between" align="center" grow>
                          <Text variant="labels" truncate>
                            {label}
                          </Text>
                          {props.item.states.includes(selector) && (
                            <DotIcon
                              size="12"
                              color={rawTheme.colors.foregroundPrimary}
                            />
                          )}
                        </Flex>
                      </DropdownMenuItem>
                    </Fragment>
                  );
                }
              )}
            </Fragment>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Add more</DropdownMenuLabel>
        <Box css={{ padding: theme.spacing[4] }}>
          <SelectorCombobox
            existingSelectors={props.states.map((state) => state.selector)}
            onSelect={(selector) =>
              props.onAddSelector?.(props.item.id, selector)
            }
          />
        </Box>
        <DropdownMenuSeparator />
        <DropdownMenuItem hint>{description}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
