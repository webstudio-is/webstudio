import { BoxIcon } from "@webstudio-is/icons";
import { StoryGrid, StorySection } from "./storybook";
import { ComponentCard } from "./component-card";
import { TooltipProvider } from "./tooltip";

export default {
  title: "Library/Component Card",
};

export const Demo = () => {
  return (
    <TooltipProvider>
      <StorySection title="States">
        <StoryGrid horizontal>
          <ComponentCard icon={<BoxIcon />} label="Box" tabIndex={1} />
          <ComponentCard
            icon={<BoxIcon />}
            label="Box"
            state="hover"
            tabIndex={1}
          />
          <ComponentCard
            icon={<BoxIcon />}
            label="Box"
            state="focus"
            tabIndex={1}
          />
          <ComponentCard
            icon={<BoxIcon />}
            label="Box"
            state="disabled"
            tabIndex={1}
          />
        </StoryGrid>
      </StorySection>
      <StorySection title="Labels">
        <StoryGrid horizontal>
          <ComponentCard icon={<BoxIcon />} label="Single" tabIndex={1} />
          <ComponentCard
            icon={<BoxIcon />}
            label="Too many words too many"
            tabIndex={1}
          />
          <ComponentCard
            icon={<BoxIcon />}
            label="Manylongwordstotruncate Manylongwordstotruncate"
            tabIndex={1}
          />
          <ComponentCard
            icon={<BoxIcon />}
            label="Truncatedlongword"
            tabIndex={1}
          />
        </StoryGrid>
      </StorySection>
    </TooltipProvider>
  );
};
Demo.storyName = "Component Card";
