import {
  Fragment,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { tags } from "@webstudio-is/sdk";
import {
  Box,
  Combobox,
  cssVar,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Flex,
  InputErrorsTooltip,
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
  menuTriggerGradientVar,
  menuTriggerVisibilityOverrideVar,
  menuTriggerVisibilityVar,
  menuCssVars,
  type ItemSource,
  type ItemSelector,
} from "./style-source-control";

export type SelectorConfig = {
  type: "state" | "pseudoElement" | "tag";
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
  locked: boolean;
  isAdded?: boolean;
  states: string[];
};

const visibility = cssVar(
  menuTriggerVisibilityOverrideVar,
  cssVar(menuTriggerVisibilityVar)
);

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
  color: "inherit",
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
      backgroundColor: cssVar("--overlay-interaction-hover"),
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
  background: cssVar(menuTriggerGradientVar),
  borderTopRightRadius: theme.borderRadius[4],
  borderBottomRightRadius: theme.borderRadius[4],
  pointerEvents: "none",
});

const selectorLabels = [
  "state",
  "pseudoElement",
  "tag",
] satisfies SelectorConfig["type"][];

const categoryLabels: Record<SelectorConfig["type"], string> = {
  state: "States",
  pseudoElement: "Pseudo elements",
  tag: "Tag",
};

const menuActionDescriptions = {
  copy: "Copy this source’s styles to paste them elsewhere.",
  rename: "Change the name of this token to better describe its purpose.",
  duplicate: "Create a copy of this token with all its styles.",
  convertToToken:
    "Turn local styles into a reusable token you can apply to other elements.",
  clearStyles: "Remove all styles from this local style source.",
  lock: "Protect this token from accidental style changes until you unlock it.",
  unlock: "Allow style changes on this token again.",
  detach: "Remove this token from the element without deleting it.",
  delete: "Permanently delete this token and all its styles from the project.",
} as const;

type MenuAction = keyof typeof menuActionDescriptions;

const canEditStyleSourceStyles = (item: IntermediateItem) =>
  item.source === "local" || item.locked === false;

const getMenuAlignOffset = (containerLeft: number, triggerLeft: number) =>
  containerLeft - triggerLeft;

// All available CSS selectors for autocomplete
const allSelectors = [
  ...Object.keys(pseudoClassDescriptions),
  ...Object.keys(pseudoElementDescriptions),
  ...tags.filter((tag) => tag !== "html"),
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
  allowDescendants,
  onSelect,
}: {
  existingSelectors: string[];
  allowDescendants: boolean;
  onSelect: (selector: string) => void;
}) => {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string>();

  const handleSubmit = (selector: string) => {
    let normalizedSelector = selector;
    let validation = validateSelector(normalizedSelector, { allowDescendants });
    if (validation.success === false && allowDescendants) {
      const tagSelector = ` ${selector}`;
      const tagValidation = validateSelector(tagSelector, { allowDescendants });
      if (tagValidation.success && tagValidation.type === "tag") {
        normalizedSelector = tagSelector;
        validation = tagValidation;
      }
    }
    if (validation.success === false) {
      setError(validation.error);
      return;
    }
    setError(undefined);
    onSelect(normalizedSelector);
    setValue("");
  };

  const availableItems = allSelectors.filter(
    (selector) =>
      (allowDescendants || tags.includes(selector) === false) &&
      existingSelectors.every((s) => s.trim() !== selector)
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
  onReturnToInput?: () => void;
  selectedItemSelector: undefined | ItemSelector;
  item: IntermediateItem;
  hasStyles: boolean;
  states: SelectorConfig[];
  onAddSelector?: (itemId: IntermediateItem["id"], selector: string) => void;
  onSelect?: (itemSelector: ItemSelector) => void;
  onEdit?: (itemId: IntermediateItem["id"]) => void;
  onDuplicate?: (itemId: IntermediateItem["id"]) => void;
  onCopy?: (itemId: IntermediateItem["id"]) => void;
  onToggleLock?: (itemId: IntermediateItem["id"], locked: boolean) => void;
  onConvertToToken?: (itemId: IntermediateItem["id"]) => void;
  onDisable?: (itemId: IntermediateItem["id"]) => void;
  onEnable?: (itemId: IntermediateItem["id"]) => void;
  onDetach?: (itemId: IntermediateItem["id"]) => void;
  onDelete?: (itemId: IntermediateItem["id"]) => void;
  onClearStyles?: (itemId: IntermediateItem["id"]) => void;
};

export const StyleSourceMenu = (props: StyleSourceMenuProps) => {
  const availableStates =
    props.item.source === "tag"
      ? props.states.filter(
          ({ selector }) =>
            validateSelector(selector, { allowDescendants: false }).success
        )
      : props.states;
  const [highlightedSelector, setHighlightedSelector] = useState<{
    selector: string;
    type: "state" | "pseudoElement" | "tag";
    description?: string;
  }>();
  const [highlightedAction, setHighlightedAction] = useState<MenuAction>();
  const [alignOffset, setAlignOffset] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const escapePressed = useRef(false);
  const updateAlignOffset = useCallback(() => {
    if (triggerRef.current?.parentElement) {
      setAlignOffset(
        getMenuAlignOffset(
          triggerRef.current.parentElement.getBoundingClientRect().left,
          triggerRef.current.getBoundingClientRect().left
        )
      );
    }
  }, []);
  useLayoutEffect(() => {
    if (props.open) {
      updateAlignOffset();
    }
  }, [props.open, updateAlignOffset]);
  const canEditStyles = canEditStyleSourceStyles(props.item);

  // Get description for highlighted or selected item
  const selectedState = props.selectedItemSelector?.state;
  const selectedConfig = selectedState
    ? availableStates.find((s) => s.selector === selectedState)
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
      (descriptionSelector.type === "tag"
        ? undefined
        : getDescription(
            descriptionSelector.selector,
            descriptionSelector.type
          )))
    : undefined;

  // Get source description based on item source
  const sourceDescription =
    props.item.source === "local"
      ? "Style instances without creating a token or override a token locally."
      : props.item.source === "token"
        ? "Reuse styles across multiple instances by creating a token."
        : props.item.source === "tag"
          ? "Apply styles to every element with this tag."
          : undefined;

  const description =
    actionDescription ?? selectorDescription ?? sourceDescription;

  const handleOpenChange = (open: boolean) => {
    if (open) {
      updateAlignOffset();
    }
    props.onOpenChange(open);
  };

  return (
    <DropdownMenu modal open={props.open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <MenuTrigger
          ref={triggerRef}
          aria-label={`Style source menu ${props.item.label}`}
        >
          <MenuTriggerGradient />
          <ChevronDownIcon style={{ position: "relative" }} />
        </MenuTrigger>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        onKeyDown={(event) => {
          event.stopPropagation();
        }}
        onEscapeKeyDown={() => {
          escapePressed.current = true;
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          if (escapePressed.current) {
            escapePressed.current = false;
            props.onReturnToInput?.();
          }
        }}
        autoFocus
        align="start"
        alignOffset={alignOffset}
        css={{ width: theme.spacing[26] }}
      >
        <DropdownMenuLabel>
          <Flex gap="1" justify="between" align="center">
            <Text css={{ fontWeight: "bold" }} truncate>
              {props.item.label}
            </Text>
            {props.hasStyles && (
              <DotIcon size="12" color={cssVar("--foreground-accent")} />
            )}
          </Flex>
        </DropdownMenuLabel>
        {props.item.source === "token" && (
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
        {props.item.source === "token" && (
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
        {(props.item.source === "token" ||
          props.item.source === "tag" ||
          props.item.source === "local") && (
          <DropdownMenuItem
            onFocus={() => {
              setHighlightedSelector(undefined);
              setHighlightedAction("copy");
            }}
            disabled={!props.hasStyles}
            onSelect={() => props.onCopy?.(props.item.id)}
          >
            Copy
          </DropdownMenuItem>
        )}
        {props.item.source === "token" && (
          <DropdownMenuItem
            onFocus={() => {
              setHighlightedSelector(undefined);
              setHighlightedAction(props.item.locked ? "unlock" : "lock");
            }}
            onSelect={() =>
              props.onToggleLock?.(props.item.id, props.item.locked === false)
            }
          >
            {props.item.locked ? "Unlock" : "Lock"}
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
        {props.item.source === "token" && (
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
        {props.item.source === "token" && (
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
        {canEditStyles &&
          selectorLabels.map((currentCategory) => {
            const categoryStates = availableStates.filter(
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
                                    ? cssVar("--foreground-accent")
                                    : cssVar("--foreground-primary")
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
                                color={cssVar("--foreground-accent")}
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
        {canEditStyles && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Add more</DropdownMenuLabel>
            <Box css={{ padding: theme.spacing[4] }}>
              <SelectorCombobox
                existingSelectors={availableStates.map(
                  (state) => state.selector
                )}
                allowDescendants={props.item.source !== "tag"}
                onSelect={(selector) =>
                  props.onAddSelector?.(props.item.id, selector)
                }
              />
            </Box>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem hint>{description}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export const __testing__ = { canEditStyleSourceStyles, getMenuAlignOffset };
