import {
  createContext,
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
import { MagnifyingGlassIcon } from "@webstudio-is/icons";
import { styled, theme } from "../stitches.config";
import { textVariants } from "./text";
import { Flex } from "./flex";
import { Button } from "./button";

const panelWidth = "400px";
const itemHeight = "32px";
const inputBorderBottomSize = "--command-input-border-bottom-width";

const StyledCommand = styled(CommandPrimitive, {
  boxSizing: "border-box",
  width: panelWidth,
  borderRadius: theme.borderRadius[4],
  boxShadow: theme.shadows.menuDropShadow,
  backgroundColor: theme.colors.backgroundControls,
  border: `1px solid ${theme.colors.borderMain}`,
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

const getLoopedIndex = (state: CommandState) => {
  let loopedIndex = state.actionIndex % state.actions.length;
  if (loopedIndex < 0) {
    loopedIndex += state.actions.length;
  }
  return loopedIndex;
};

export const useSelectedAction = () => {
  const [state] = useContext(CommandContext);
  const loopedIndex = getLoopedIndex(state);
  return state.actions[loopedIndex];
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
  top: 140,
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
  gridTemplateColumns: `${itemHeight} 1fr`,
  height: itemHeight,
  borderBottom: `var(${inputBorderBottomSize}) solid ${theme.colors.borderMain}`,
});

const CommandInputIcon = styled(MagnifyingGlassIcon, {
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
  "&::placeholder": {
    color: theme.colors.foregroundSubtle,
  },
});

export const CommandInput = (
  props: ComponentPropsWithoutRef<typeof CommandPrimitive.Input>
) => {
  return (
    <CommandInputContainer>
      <CommandInputIcon />
      <CommandInputField
        autoFocus={true}
        placeholder="Type a command or search..."
        {...props}
      />
    </CommandInputContainer>
  );
};

export const CommandActions = () => {
  const [state, setState] = useContext(CommandContext);
  const highlightedValue = useCommandState((state) => state.value);
  useEffect(() => {
    const root = actionsRef.current?.closest("[cmdk-root]");
    const selectedGroup = root?.querySelector(
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
  }, [highlightedValue]);

  const actionsRef = useRef<HTMLDivElement>(null);
  const loopedSelectedIndex = getLoopedIndex(state);
  useEffect(() => {
    const controller = new AbortController();
    const root = actionsRef.current?.closest("[cmdk-root]");
    if (root instanceof HTMLElement) {
      root.addEventListener(
        "keydown",
        (event) => {
          if (event.key === "Tab") {
            event.preventDefault();
            const direction = event.shiftKey ? -1 : 1;
            setState((prev) => ({
              ...prev,
              actionIndex: prev.actionIndex + direction,
            }));
          }
        },
        { signal: controller.signal }
      );
    }
    return () => controller.abort();
  }, []);

  return (
    <Flex gap={1} css={{ padding: 8 }} ref={actionsRef}>
      {state.actions.map((action, actionIndex) => (
        <Button
          key={action}
          tabIndex={-1}
          color="ghost"
          state={loopedSelectedIndex === actionIndex ? "focus" : undefined}
          data-action={action}
          onClick={() => {
            setState((prev) => ({ ...prev, actionIndex }));
            const root = actionsRef.current?.closest("[cmdk-root]");
            const input = root?.querySelector("[cmdk-input]");
            if (input instanceof HTMLElement) {
              input.focus();
            }
          }}
        >
          {action}
        </Button>
      ))}
    </Flex>
  );
};

export const CommandList = CommandPrimitive.List;

type CommandGroupProps = ComponentPropsWithoutRef<
  typeof CommandPrimitive.Group
> & {
  actions: string[];
};

export const CommandGroup = ({ actions, ...props }: CommandGroupProps) => {
  return <CommandPrimitive.Group {...props} data-actions={actions.join()} />;
};

export const CommandGroupHeading = styled("div", {
  ...textVariants.titles,
  color: theme.colors.foregroundMoreSubtle,
  display: "flex",
  gap: 8,
  alignItems: "center",
  paddingInline: 8,
  height: itemHeight,
});

export const CommandItem = styled(CommandPrimitive.Item, {
  display: "grid",
  gridTemplateColumns: `1fr max-content`,
  alignItems: "center",
  minHeight: itemHeight,
  paddingInline: 16,
  "&[aria-selected=true]": {
    backgroundColor: theme.colors.backgroundHover,
  },
});

export const CommandIcon = styled("div", {
  width: 16,
  height: 16,
  placeSelf: "center",
  color: theme.colors.foregroundSubtle,
});
