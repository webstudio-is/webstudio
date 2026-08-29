import { useState } from "react";
import { ChevronDownIcon, PlayIcon } from "@webstudio-is/icons";
import { StorySection } from "./storybook";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { SplitButton, SplitButtonMenuButton } from "./split-button";
import { IconToggleButton } from "./toggle-button";
import { Tooltip, TooltipProvider } from "./tooltip";

export const States = () => {
  const [pressed, setPressed] = useState(false);

  return (
    <StorySection title="Split button">
      <TooltipProvider>
        <SplitButton>
          <Tooltip content="Toggle preview">
            <IconToggleButton
              aria-label="Toggle preview"
              pressed={pressed}
              onPressedChange={setPressed}
            >
              <PlayIcon />
            </IconToggleButton>
          </Tooltip>
          <DropdownMenu>
            <Tooltip content="Choose mode">
              <DropdownMenuTrigger asChild>
                <SplitButtonMenuButton type="button" aria-label="Choose mode">
                  <ChevronDownIcon />
                </SplitButtonMenuButton>
              </DropdownMenuTrigger>
            </Tooltip>
            <DropdownMenuContent>
              <DropdownMenuItem>Design</DropdownMenuItem>
              <DropdownMenuItem>Content</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SplitButton>
      </TooltipProvider>
    </StorySection>
  );
};

export default {
  title: "Split Button",
};
