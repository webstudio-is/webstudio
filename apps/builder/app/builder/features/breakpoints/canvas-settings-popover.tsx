import { useStore } from "@nanostores/react";
import {
  theme,
  Flex,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  InputField,
  ToolbarButton,
  Text,
} from "@webstudio-is/design-system";
import { WidthInput } from "./width-input";
import { minCanvasWidth } from "~/shared/breakpoints";
import { $canvasWidth, $scale } from "~/builder/shared/nano-states";
import { $selectedBreakpoint } from "~/shared/nano-states";
import { ChevronDownIcon } from "@webstudio-is/icons";
import { useState } from "react";

export const CanvasSettingsPopover = () => {
  const selectedBreakpoint = useStore($selectedBreakpoint);
  const scale = useStore($scale);
  const canvasWidth = useStore($canvasWidth);
  const [isOpen, setIsOpen] = useState(false);
  if (selectedBreakpoint === undefined || canvasWidth === undefined) {
    return;
  }
  const roundedScale = Math.round(scale);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger aria-label="Canvas Settings" asChild>
        <ToolbarButton>
          <Text
            css={{
              display: "flex",
              gap: "1ch",
              fontVariantNumeric: "tabular-nums",
            }}
            color={isOpen ? "contrast" : "moreSubtle"}
          >
            {Math.round(canvasWidth)}px
            {roundedScale !== 100 && <span>{`${roundedScale}%`}</span>}
            <ChevronDownIcon />
          </Text>
        </ToolbarButton>
      </PopoverTrigger>
      <PopoverContent
        sideOffset={0}
        collisionPadding={4}
        align="start"
        css={{ width: theme.spacing[30] }}
      >
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
      </PopoverContent>
    </Popover>
  );
};
