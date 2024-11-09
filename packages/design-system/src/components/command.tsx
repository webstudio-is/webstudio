import type { ComponentPropsWithoutRef } from "react";
import { Command as CommandPrimitive, defaultFilter } from "cmdk";
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

export const Command = (props: CommandProps) => {
  return <StyledCommand loop={true} filter={lowerCasedFilter} {...props} />;
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

export const CommandList = CommandPrimitive.List;

export const CommandGroup = CommandPrimitive.Group;

export const CommandGroupHeading = styled("div", {
  ...textVariants.titles,
  color: theme.colors.foregroundMoreSubtle,
  display: "flex",
  alignItems: "center",
  paddingInline: 8,
  height: itemHeight,
});

export const CommandItem = styled(CommandPrimitive.Item, {
  display: "grid",
  gridTemplateColumns: `${itemHeight} 1fr max-content`,
  alignItems: "center",
  minHeight: itemHeight,
  paddingRight: 16,
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
