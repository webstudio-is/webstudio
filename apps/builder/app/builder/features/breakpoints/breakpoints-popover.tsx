import { useStore } from "@nanostores/react";
import {
  theme,
  Flex,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Tooltip,
  InputField,
} from "@webstudio-is/design-system";
import { BreakpointsPopoverToolbarButton } from "./breakpoints-popover-toolbar-button";
import { WidthInput } from "./width-input";
import { $selectedBreakpoint } from "~/shared/nano-states";
import { $breakpointsMenuView, minCanvasWidth } from "~/shared/breakpoints";
import { $scale } from "~/builder/shared/nano-states";

export const BreakpointsPopover = () => {
  const view = useStore($breakpointsMenuView);
  const selectedBreakpoint = useStore($selectedBreakpoint);
  const scale = useStore($scale);

  if (selectedBreakpoint === undefined) {
    return null;
  }

  return (
    <Popover
      open={view !== undefined}
      onOpenChange={(isOpen) => {
        $breakpointsMenuView.set(isOpen ? "initial" : undefined);
      }}
    >
      <Tooltip content="Breakpoints">
        <PopoverTrigger aria-label="Breakpoints" asChild>
          <BreakpointsPopoverToolbarButton css={{ gap: theme.spacing[5] }} />
        </PopoverTrigger>
      </Tooltip>
      <PopoverContent
        sideOffset={0}
        collisionPadding={4}
        align="start"
        css={{ width: theme.spacing[30] }}
      >
        {view === "initial" && (
          <Flex css={{ padding: theme.panel.padding }} gap="3">
            <WidthInput min={minCanvasWidth} />
            <Flex align="center" gap="2">
              <Label>Scale</Label>
              <InputField
                value={`${Math.round(scale)}%`}
                tabIndex={-1}
                readOnly
              />
            </Flex>
          </Flex>
        )}
      </PopoverContent>
    </Popover>
  );
};
