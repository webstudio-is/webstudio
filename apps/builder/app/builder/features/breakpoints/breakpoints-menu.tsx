import type { Breakpoint, Breakpoints } from "@webstudio-is/sdk";
import {
  Flex,
  Text,
  ToolbarButton,
  theme,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  Button,
} from "@webstudio-is/design-system";
import { EllipsesIcon } from "@webstudio-is/icons";
import { groupBreakpoints } from "~/shared/breakpoints";
import { $selectedBreakpointId } from "~/shared/nano-states";
import { setCanvasWidth } from "../../shared/calc-canvas-width";

type BreakpointsMenuProps = {
  breakpoints: Breakpoints;
  selectedBreakpoint: Breakpoint;
  open: boolean;
  triggerOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onEditClick: () => void;
};

export const BreakpointsMenu = ({
  breakpoints,
  selectedBreakpoint,
  open,
  triggerOpen,
  onOpenChange,
  onEditClick,
}: BreakpointsMenuProps) => {
  const grouped = groupBreakpoints(Array.from(breakpoints.values()));
  const selectedCustom = grouped.custom.find(
    (bp) => bp.id === selectedBreakpoint.id
  );

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <ToolbarButton
          variant="subtle"
          aria-label="Breakpoints with custom conditions"
          data-state={triggerOpen ? "open" : selectedCustom ? "on" : "off"}
        >
          {selectedCustom ? selectedCustom.label : <EllipsesIcon />}
        </ToolbarButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent sideOffset={4} css={{ width: theme.spacing[30] }}>
        {grouped.widthBased.map((breakpoint) => {
          let description = "All Sizes";
          if (breakpoint.minWidth !== undefined) {
            description = `≥ ${breakpoint.minWidth} PX`;
          } else if (breakpoint.maxWidth !== undefined) {
            description = `≤ ${breakpoint.maxWidth} PX`;
          }
          return (
            <DropdownMenuCheckboxItem
              key={breakpoint.id}
              checked={breakpoint.id === selectedBreakpoint.id}
              onSelect={() => {
                $selectedBreakpointId.set(breakpoint.id);
                setCanvasWidth(breakpoint.id);
              }}
            >
              <Flex justify="between" grow gap="2">
                <Text truncate css={{ flexBasis: "50%" }}>
                  {breakpoint.label}
                </Text>
                <Text color="subtle" truncate>
                  {description}
                </Text>
              </Flex>
            </DropdownMenuCheckboxItem>
          );
        })}
        {grouped.widthBased.length > 0 && grouped.custom.length > 0 && (
          <DropdownMenuSeparator />
        )}
        {grouped.custom.map((breakpoint) => (
          <DropdownMenuCheckboxItem
            key={breakpoint.id}
            checked={breakpoint.id === selectedBreakpoint.id}
            onSelect={() => {
              $selectedBreakpointId.set(breakpoint.id);
              setCanvasWidth(breakpoint.id);
            }}
          >
            <Flex justify="between" grow gap="2">
              <Text truncate css={{ flexBasis: "50%" }}>
                {breakpoint.label}
              </Text>
              <Text color="subtle" truncate>
                {breakpoint.condition}
              </Text>
            </Flex>
          </DropdownMenuCheckboxItem>
        ))}
        {(grouped.widthBased.length > 0 || grouped.custom.length > 0) && (
          <DropdownMenuSeparator />
        )}

        <Flex
          align="center"
          justify="center"
          css={{ padding: theme.panel.padding }}
        >
          <Button
            color="neutral"
            onClick={() => {
              onEditClick();
            }}
            css={{ width: "100%" }}
          >
            Edit breakpoints
          </Button>
        </Flex>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
