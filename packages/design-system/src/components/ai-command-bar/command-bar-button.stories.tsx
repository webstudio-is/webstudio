import { CommandBarButton } from "./command-bar-button";
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
          <CommandBarButton color="dark-ghost">
            <ChevronUpIcon />
          </CommandBarButton>
        </StoryGrid>
      </StorySection>
      <StorySection title="AI Buttons">
        <StoryGrid horizontal css={{ backgroundColor: "#1D1D1D", padding: 8 }}>
          <CommandBarButton color="gradient">
            <AiIcon />
          </CommandBarButton>
          <CommandBarButton color="gradient" disabled>
            <AiIcon />
          </CommandBarButton>
          <CommandBarButton color="neutral-destructive" disabled>
            <LargeXIcon />
          </CommandBarButton>
        </StoryGrid>
      </StorySection>
      <StorySection title="Sound Buttons">
        <StoryGrid
          horizontal
          css={{ backgroundColor: "#1D1D1D", padding: 8, color: "#FFF" }}
        >
          <CommandBarButton color="dark-ghost">
            <MicIcon />
          </CommandBarButton>
          <CommandBarButton color="destructive">
            <StopIcon />
          </CommandBarButton>
        </StoryGrid>
      </StorySection>
    </>
  );
};
Demo.storyName = "AI Command Button";
