import { CommandButton } from "./command-button";
import { StorySection, StoryGrid } from "../storybook";
import {
  AiIcon,
  StopIcon,
  MicIcon,
  LargeXIcon,
  ChevronUpIcon,
} from "@webstudio-is/icons";

export default {
  title: "Library/AI Command Button",
};

export const Demo = () => {
  return (
    <>
      <StorySection title="AI Menu Buttons">
        <StoryGrid horizontal css={{ backgroundColor: "#1D1D1D", padding: 8 }}>
          <CommandButton color="dark-ghost">
            <ChevronUpIcon />
          </CommandButton>
        </StoryGrid>
      </StorySection>
      <StorySection title="AI Buttons">
        <StoryGrid horizontal css={{ backgroundColor: "#1D1D1D", padding: 8 }}>
          <CommandButton color="gradient">
            <AiIcon />
          </CommandButton>
          <CommandButton color="gradient" disabled>
            <AiIcon />
          </CommandButton>
          <CommandButton color="neutral-destructive" disabled>
            <LargeXIcon />
          </CommandButton>
        </StoryGrid>
      </StorySection>
      <StorySection title="Sound Buttons">
        <StoryGrid
          horizontal
          css={{ backgroundColor: "#1D1D1D", padding: 8, color: "#FFF" }}
        >
          <CommandButton color="dark-ghost">
            <MicIcon />
          </CommandButton>
          <CommandButton color="destructive">
            <StopIcon />
          </CommandButton>
        </StoryGrid>
      </StorySection>
    </>
  );
};
Demo.storyName = "AI Command Button";
