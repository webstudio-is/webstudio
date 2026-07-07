import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ComponentPropsWithoutRef,
  type Dispatch,
  type SetStateAction,
  type ComponentProps,
  type ReactNode,
} from "react";
import {
  Command as CommandPrimitive,
  defaultFilter,
  useCommandState,
} from "cmdk";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import {
  DialogTitle,
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogContent,
} from "@radix-ui/react-dialog";
import { SearchIcon, ChevronLeftIcon } from "@webstudio-is/icons";
import { styled, theme } from "../stitches.config";
import { Text, textVariants } from "./text";
import { Button } from "./button";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Kbd } from "./kbd";
import { useDebounceEffect } from "../utilities";
import { Flex } from "./flex";
import { InputField } from "./input-field";
import { SmallIconButton } from "./small-icon-button";

const panelWidth = "500px";
const itemHeight = "32px";
const inputBorderBottomSize = "--command-input-border-bottom-width";

const StyledCommand = styled(CommandPrimitive, {
  boxSizing: "border-box",
  width: panelWidth,
  boxShadow: theme.shadows.menuDropShadow,
  backgroundColor: theme.colors.backgroundControls,
  border: `1px solid ${theme.colors.borderMain}`,
  borderRadius: theme.borderRadius[7],
  // clip selected item background
  overflow: "clip",
  // remove input border bottom when no command matches
  [inputBorderBottomSize]: "0px",
  "&:has([cmdk-group]:not([hidden]))": {
    [inputBorderBottomSize]: "1px",
  },
});

type CommandProps = ComponentPropsWithoutRef<typeof CommandPrimitive>;

// this will match "Box" when entered "box"
const lowerCasedFilter: CommandProps["filter"] = (
  string,
  abbreviation,
  aliases
) =>
  defaultFilter!(
    string.toLocaleLowerCase(),
    abbreviation.toLocaleLowerCase(),
    aliases
  );

export type CommandAction = {
  name: string;
  label: string;
};

type CommandState = {
  highlightedGroup: string;
  actions: CommandAction[];
  actionIndex: number;
  footerContent: ReactNode;
};

const CommandContext = createContext<
  [CommandState, Dispatch<SetStateAction<CommandState>>]
>([
  {
    highlightedGroup: "",
    actions: [],
    actionIndex: 0,
    footerContent: undefined,
  },
  () => {},
]);

export const useSelectedAction = () => {
  const [state] = useContext(CommandContext);
  return state.actions[state.actionIndex];
};

export const useResetActionIndex = () => {
  const [, setState] = useContext(CommandContext);
  return () => {
    setState((prev) => ({ ...prev, actionIndex: 0 }));
  };
};

const useSetFooterContent = () => {
  const [, setState] = useContext(CommandContext);
  return useCallback(
    (content: ReactNode) => {
      setState((prev) => ({ ...prev, footerContent: content }));
    },
    [setState]
  );
};

export const Command = (props: CommandProps) => {
  const state = useState<CommandState>({
    highlightedGroup: "",
    actions: [],
    actionIndex: 0,
    footerContent: undefined,
  });
  return (
    <CommandContext.Provider value={state}>
      <StyledCommand
        disablePointerSelection
        loop={true}
        filter={lowerCasedFilter}
        {...props}
      />
    </CommandContext.Provider>
  );
};

const CommandDialogContent = styled(DialogContent, {
  position: "absolute",
  top: "20%",
  left: `calc(50% - ${panelWidth} / 2)`,
  width: panelWidth,
});

export const CommandDialog = ({
  children,
  ...props
}: ComponentPropsWithoutRef<typeof Dialog>) => {
  return (
    <Dialog {...props}>
      <DialogPortal>
        <DialogOverlay />
        <CommandDialogContent aria-describedby={undefined}>
          {/* title is required by radix dialog */}
          <VisuallyHidden asChild>
            <DialogTitle>Command Panel</DialogTitle>
          </VisuallyHidden>
          {children}
        </CommandDialogContent>
      </DialogPortal>
    </Dialog>
  );
};

const CommandInputContainer = styled("div", {
  borderBottom: `var(${inputBorderBottomSize}) solid ${theme.colors.borderMain}`,
});

export const CommandSearchIcon = styled(SearchIcon, {
  display: "flex",
  width: theme.spacing[11],
  color: theme.colors.foregroundSubtle,
});

export const CommandBackIcon = styled(ChevronLeftIcon, {
  display: "flex",
  width: theme.spacing[11],
  color: theme.colors.foregroundSubtle,
});

const CommandInputField = styled(InputField, {
  "--sizes-controlHeight": theme.spacing[15],
  border: "none",
  paddingInline: theme.spacing[4],
});

export const CommandInput = (
  props: ComponentProps<typeof InputField> & {
    action?: CommandAction;
    onBack?: () => void;
    onValueChange?: (value: string) => void;
  }
) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const contextAction = useSelectedAction();
  const {
    action = contextAction,
    placeholder = "Type a command or search...",
    prefix,
    onBack,
    value,
    onValueChange,
    ref,
    ...inputProps
  } = props;
  return (
    <CommandInputContainer>
      <CommandInputField
        prefix={prefix ?? <CommandSearchIcon />}
        suffix={
          action && (
            <Text
              color="moreSubtle"
              css={{ alignSelf: "center", paddingInline: theme.spacing[5] }}
            >
              {action.label} <Kbd value={["enter"]} color="moreSubtle" />
            </Text>
          )
        }
        inputRef={inputRef}
        autoFocus={true}
        placeholder={placeholder}
        value={value}
        {...inputProps}
        onKeyDown={(event) => {
          if (onBack && event.key === "Backspace" && value === "") {
            event.preventDefault();
            onBack();
          }
          inputProps.onKeyDown?.(event);
        }}
        onChange={(event) => {
          // reset scroll whenever search is changed
          requestAnimationFrame(() => {
            inputRef.current
              ?.closest("[cmdk-root]")
              ?.querySelector("[data-radix-scroll-area-viewport]")
              ?.scrollTo(0, 0);
          });
          onValueChange?.(event.target.value);
        }}
      />
    </CommandInputContainer>
  );
};

const ActionsCommand = styled(CommandPrimitive, {});

export const CommandFooter = ({ children }: { children?: ReactNode }) => {
  const [isActionOpen, setIsActionOpen] = useState(false);
  const scheduleEffect = useDebounceEffect();

  const actionsRef = useRef<HTMLDivElement>(null);

  // store group actions whenever highlighted item is changed
  const [state, setState] = useContext(CommandContext);
  const highlightedValue = useCommandState((state) => state.value);
  useEffect(() => {
    const actionsElement = actionsRef.current?.closest("[cmdk-root]");
    const selectedGroup = actionsElement?.querySelector(
      "[cmdk-group]:has([aria-selected=true])"
    );
    const highlightedGroup = selectedGroup?.getAttribute("data-value") ?? "";
    const actionsJson = selectedGroup?.getAttribute("data-actions") ?? "[]";
    let actions: CommandAction[] = [];
    try {
      actions = JSON.parse(actionsJson);
    } catch {
      // fallback to empty array if parsing fails
    }
    setState((prev) => {
      // reset index only when group is changed
      if (prev.highlightedGroup === highlightedGroup) {
        return prev;
      }
      return { ...prev, highlightedGroup, actions, actionIndex: 0 };
    });
  }, [highlightedValue, setState]);

  // open action popover with Tab
  useEffect(() => {
    const controller = new AbortController();
    const actionsElement = actionsRef.current?.closest("[cmdk-root]");
    if (actionsElement instanceof HTMLElement) {
      actionsElement.addEventListener(
        "keydown",
        (event) => {
          if (event.key === "Tab") {
            event.preventDefault();
            setIsActionOpen(true);
          }
        },
        { signal: controller.signal }
      );
    }
    return () => controller.abort();
  }, [setState]);

  return (
    <CommandGroupFooter ref={actionsRef}>
      {children || state.footerContent}
      <Popover open={isActionOpen} onOpenChange={setIsActionOpen}>
        <PopoverTrigger asChild>
          <Button tabIndex={-1} color="ghost" data-action-trigger>
            Actions <Kbd value={["tab"]} />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          side="top"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            // restore focus to the input instead of button
            const root = actionsRef.current?.closest("[cmdk-root]");
            const input = root?.querySelector("[cmdk-input]");
            if (input instanceof HTMLElement) {
              input.focus();
            }
          }}
        >
          <ActionsCommand disablePointerSelection loop>
            <CommandInputContainer>
              <CommandInputField placeholder="Choose action..." />
            </CommandInputContainer>
            <CommandList data-action-list>
              {state.actions.map((action, actionIndex) => (
                <CommandItem
                  key={action.name}
                  allowSingleClick
                  onSelect={() => {
                    setState((prev) => ({ ...prev, actionIndex }));
                    setIsActionOpen(false);
                    const root = actionsRef.current?.closest("[cmdk-root]");
                    const item = root?.querySelector(
                      "[cmdk-group] [aria-selected=true]"
                    );
                    // execute after action state is applied
                    scheduleEffect(() => {
                      if (item instanceof HTMLElement) {
                        item.click();
                      }
                    });
                  }}
                >
                  <Text>{action.label}</Text>
                </CommandItem>
              ))}
            </CommandList>
          </ActionsCommand>
        </PopoverContent>
      </Popover>
    </CommandGroupFooter>
  );
};

export const CommandList = styled(CommandPrimitive.List, {
  "& [cmdk-group-heading]": {
    position: "sticky",
    top: 0,
  },
});

type CommandGroupProps = Omit<
  ComponentPropsWithoutRef<typeof CommandPrimitive.Group>,
  "value"
> & {
  name: string;
  actions: CommandAction[];
  hideAfterItemsAmount?: number;
};

export const CommandGroup = ({
  name,
  actions,
  children,
  hideAfterItemsAmount = 50,
  ...props
}: CommandGroupProps) => {
  const [visibleCount, setVisibleCount] = useState(hideAfterItemsAmount);
  const groupRef = useRef<HTMLDivElement>(null);
  const itemCount = Array.isArray(children) ? children.length : 0;
  const hasMoreItems = itemCount > visibleCount;

  const handleShowMore = () => {
    setVisibleCount((prev) => prev + 100);
  };

  return (
    <div ref={groupRef}>
      <CommandPrimitive.Group
        {...props}
        value={name}
        data-actions={JSON.stringify(actions)}
      >
        {
          // Show items up to visibleCount
          Array.isArray(children) && hasMoreItems
            ? children.slice(0, visibleCount)
            : children
        }
      </CommandPrimitive.Group>
      {hasMoreItems && (
        <Flex justify="center" css={{ padding: theme.spacing[2] }}>
          <Button color="ghost" onClick={handleShowMore} type="button">
            Show more ({itemCount - visibleCount} hidden)
          </Button>
        </Flex>
      )}
    </div>
  );
};

export const CommandItem = ({
  onSelect,
  allowSingleClick,
  ...props
}: ComponentPropsWithoutRef<typeof CommandItemStyled> & {
  onSelect?: () => void;
  allowSingleClick?: boolean;
}) => {
  const doubleClickedRef = useRef(false);
  const selectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const pointerDownRef = useRef(false);

  const handleSelect = () => {
    // Actions menu mode - execute immediately
    if (allowSingleClick) {
      onSelect?.();
      return;
    }

    // Default mode
    if (selectTimeoutRef.current) {
      clearTimeout(selectTimeoutRef.current);
    }

    // If double-click already happened, skip (it already executed)
    if (doubleClickedRef.current) {
      doubleClickedRef.current = false;
      return;
    }

    // If triggered by Enter key (no pointer down), execute immediately
    if (!pointerDownRef.current) {
      onSelect?.();
      return;
    }

    // For mouse clicks, delay to detect double-click
    selectTimeoutRef.current = setTimeout(() => {
      // Reset pointer flag after delay
      pointerDownRef.current = false;
    }, 300);
  };

  return (
    <CommandItemStyled
      {...props}
      onPointerDown={
        allowSingleClick
          ? undefined
          : () => {
              pointerDownRef.current = true;
            }
      }
      onDoubleClick={
        allowSingleClick
          ? undefined
          : () => {
              // Mark that double-click happened and execute immediately
              doubleClickedRef.current = true;
              if (selectTimeoutRef.current) {
                clearTimeout(selectTimeoutRef.current);
              }
              onSelect?.();
            }
      }
      onSelect={handleSelect}
    />
  );
};

export const CommandGroupHeading = styled("div", {
  ...textVariants.labels,
  color: theme.colors.foregroundMoreSubtle,
  display: "flex",
  backgroundColor: theme.colors.backgroundControls,
  gap: theme.spacing[5],
  alignItems: "center",
  paddingInline: theme.spacing[5],
  height: itemHeight,
});

export const CommandGroupFooter = styled("div", {
  ...textVariants.labels,
  color: theme.colors.foregroundMoreSubtle,
  display: "flex",
  gap: theme.spacing[5],
  alignItems: "center",
  paddingInline: theme.spacing[5],
  height: itemHeight,
  justifyContent: "end",
  borderTop: `1px solid ${theme.colors.borderMain}`,
});

export const CommandBackButton = ({ onClick }: { onClick?: () => void }) => {
  return (
    <SmallIconButton
      icon={<CommandBackIcon />}
      tabIndex={-1}
      onClick={onClick}
      aria-label="Go back"
      css={{ display: "flex" }}
    />
  );
};

const CommandItemStyled = styled(CommandPrimitive.Item, {
  display: "grid",
  gridTemplateColumns: `1fr max-content`,
  alignItems: "center",
  minHeight: itemHeight,
  paddingInline: theme.spacing[9],
  "&:hover": {
    backgroundColor: theme.colors.backgroundItemMenuItemHover,
  },
  "&[aria-selected=true]": {
    backgroundColor: theme.colors.backgroundItemCurrent,
  },
});

export const CommandIcon = styled("div", {
  width: theme.spacing[9],
  height: theme.spacing[9],
  placeSelf: "center",
});

export { useCommandState, useSetFooterContent };
