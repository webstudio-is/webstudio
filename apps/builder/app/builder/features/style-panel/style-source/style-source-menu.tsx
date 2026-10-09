import { useState } from "react";
import {
  Box,
  cssVar,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Flex,
  styled,
  Text,
  theme,
} from "@webstudio-is/design-system";
import { ChevronDownIcon, DotIcon } from "@webstudio-is/icons";
import {
  menuTriggerGradientVar,
  menuTriggerVisibilityOverrideVar,
  menuTriggerVisibilityVar,
  menuCssVars,
  type ItemSource,
} from "./style-source-control";

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

const menuActionDescriptions = {
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

type StyleSourceMenuProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: IntermediateItem;
  hasStyles: boolean;
  onEdit?: (itemId: IntermediateItem["id"]) => void;
  onDuplicate?: (itemId: IntermediateItem["id"]) => void;
  onToggleLock?: (itemId: IntermediateItem["id"], locked: boolean) => void;
  onConvertToToken?: (itemId: IntermediateItem["id"]) => void;
  onDisable?: (itemId: IntermediateItem["id"]) => void;
  onEnable?: (itemId: IntermediateItem["id"]) => void;
  onDetach?: (itemId: IntermediateItem["id"]) => void;
  onDelete?: (itemId: IntermediateItem["id"]) => void;
  onClearStyles?: (itemId: IntermediateItem["id"]) => void;
};

export const StyleSourceMenu = (props: StyleSourceMenuProps) => {
  const [highlightedAction, setHighlightedAction] = useState<MenuAction>();

  // Priority: action description > source description
  const actionDescription = highlightedAction
    ? menuActionDescriptions[highlightedAction]
    : undefined;

  // Get source description based on item source
  const sourceDescription =
    props.item.source === "local"
      ? "Style instances without creating a token or override a token locally."
      : props.item.source === "token"
        ? "Reuse styles across multiple instances by creating a token."
        : undefined;

  const description = actionDescription ?? sourceDescription;

  return (
    <DropdownMenu modal open={props.open} onOpenChange={props.onOpenChange}>
      <DropdownMenuTrigger asChild>
        <MenuTrigger aria-label={`Style source menu ${props.item.label}`}>
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
              <DotIcon size="12" color={cssVar("--foreground-accent")} />
            )}
          </Flex>
        </DropdownMenuLabel>
        {props.item.source !== "local" && (
          <DropdownMenuItem
            onFocus={() => {
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
              setHighlightedAction("duplicate");
            }}
            onSelect={() => props.onDuplicate?.(props.item.id)}
          >
            Duplicate
          </DropdownMenuItem>
        )}
        {props.item.source === "token" && (
          <DropdownMenuItem
            onFocus={() => {
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
              setHighlightedAction("delete");
            }}
            onSelect={() => props.onDelete?.(props.item.id)}
          >
            Delete
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem hint>{description}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
