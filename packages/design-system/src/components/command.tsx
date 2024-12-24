import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type Dispatch,
  type SetStateAction,
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
import { SearchIcon } from "@webstudio-is/icons";
import { styled, theme } from "../stitches.config";
import { Text, textVariants } from "./text";
import { Flex } from "./flex";
import { Button } from "./button";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Kbd } from "./kbd";

const panelWidth = "400px";
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

type CommandState = {
  highlightedGroup: string;
  actions: string[];
  actionIndex: number;
};

const CommandContext = createContext<
  [CommandState, Dispatch<SetStateAction<CommandState>>]
>([
  {
    highlightedGroup: "",
    actions: [],
    actionIndex: 0,
  },
  () => {},
]);

export const useSelectedAction = () => {
  const [state] = useContext(CommandContext);
  return state.actions[state.actionIndex];
};

export const Command = (props: CommandProps) => {
  const state = useState<CommandState>({
    highlightedGroup: "",
    actions: [],
    actionIndex: 0,
  });
  return (
    <CommandContext.Provider value={state}>
      <StyledCommand loop={true} filter={lowerCasedFilter} {...props} />
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
  display: "grid",
  gridTemplateColumns: `${itemHeight} 1fr max-content`,
  height: theme.spacing[15],
  borderBottom: `var(${inputBorderBottomSize}) solid ${theme.colors.borderMain}`,
});

const CommandInputIcon = styled(SearchIcon, {
  gridColumn: "1 / 2",
  gridRow: "1 / 2",
  placeSelf: "center",
  color: theme.colors.foregroundSubtle,
});

const CommandInputField = styled(CommandPrimitive.Input, {
  all: "unset",
  gridColumn: "1 / 3",
  gridRow: "1 / 2",
  // add space for icon
  paddingLeft: itemHeight,
  paddingRight: theme.spacing[2],
  color: theme.colors.foregroundMain,
  ...textVariants.regular,
  lineHeight: 1,
  "&::placeholder": {
    color: theme.colors.foregroundSubtle,
  },
});

export const CommandInput = (
  props: ComponentPropsWithoutRef<typeof CommandPrimitive.Input>
) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const action = useSelectedAction();
  return (
    <CommandInputContainer>
      <CommandInputIcon />
      <CommandInputField
        ref={inputRef}
        autoFocus={true}
        placeholder="Type a command or search..."
        {...props}
        onValueChange={(value) => {
          // reset scroll whenever search is changed
          requestAnimationFrame(() => {
            inputRef.current
              ?.closest("[cmdk-root]")
              ?.querySelector("[data-radix-scroll-area-viewport]")
              ?.scrollTo(0, 0);
          });
          props.onValueChange?.(value);
        }}
      />
      <Text
        variant="labelsTitleCase"
        color="moreSubtle"
        css={{ alignSelf: "center", paddingInline: theme.spacing[5] }}
      >
        {action} <Kbd value={["enter"]} color="moreSubtle" />
      </Text>
    </CommandInputContainer>
  );
};

const ActionsCommand = styled(CommandPrimitive, {});

const useDebounceEffect = () => {
  const [updateCallback, setUpdateCallback] = useState(() => () => {
    /* empty */
  });
  useEffect(() => {
    // Because of how our styles works we need to update after React render to be sure that
    // all styles are applied
    updateCallback();
  }, [updateCallback]);
  return useCallback((callback: () => void) => {
    setUpdateCallback(() => callback);
  }, []);
};

export const CommandFooter = () => {
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
    const actions =
      selectedGroup?.getAttribute("data-actions")?.split(",") ?? [];
    setState((prev) => {
      // reset index only when group is changed
      if (prev.highlightedGroup === highlightedGroup) {
        return prev;
      }
      return { highlightedGroup, actions, actionIndex: 0 };
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
    <Flex
      justify="end"
      align="center"
      css={{ height: itemHeight, paddingInline: theme.spacing[3] }}
      ref={actionsRef}
    >
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
          <ActionsCommand>
            <CommandInputContainer>
              <CommandInputField placeholder="Choose action..." />
            </CommandInputContainer>
            <CommandList data-action-list>
              {state.actions.map((action, actionIndex) => (
                <CommandItem
                  key={action}
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
                  <Text variant="labelsTitleCase">{action}</Text>
                </CommandItem>
              ))}
            </CommandList>
          </ActionsCommand>
        </PopoverContent>
      </Popover>
    </Flex>
  );
};

export const CommandList = CommandPrimitive.List;

type CommandGroupProps = Omit<
  ComponentPropsWithoutRef<typeof CommandPrimitive.Group>,
  "value"
> & {
  name: string;
  actions: string[];
};

export const CommandGroup = ({
  name,
  actions,
  ...props
}: CommandGroupProps) => {
  return (
    <CommandPrimitive.Group
      {...props}
      value={name}
      data-actions={actions.join()}
    />
  );
};

export const CommandGroupHeading = styled("div", {
  ...textVariants.titles,
  color: theme.colors.foregroundMoreSubtle,
  display: "flex",
  gap: theme.spacing[5],
  alignItems: "center",
  paddingInline: theme.spacing[5],
  height: itemHeight,
});

export const CommandItem = styled(CommandPrimitive.Item, {
  display: "grid",
  gridTemplateColumns: `1fr max-content`,
  alignItems: "center",
  minHeight: itemHeight,
  paddingInline: theme.spacing[9],
  "&[aria-selected=true]": {
    backgroundColor: theme.colors.backgroundHover,
  },
});

export const CommandIcon = styled("div", {
  width: theme.spacing[9],
  height: theme.spacing[9],
  placeSelf: "center",
});
