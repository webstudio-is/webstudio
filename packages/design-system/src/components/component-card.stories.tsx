import { BoxIcon } from "@webstudio-is/icons";
import { StorySection } from "./storybook";
import { ComponentCard } from "./component-card";
import { TooltipProvider } from "./tooltip";
import { Grid } from "./grid";

export default {
  title: "Library/Component Card",
};

export const Demo = () => {
  return (
    <TooltipProvider>
      <StorySection title="States">
        <Grid css={{ gridTemplateColumns: "repeat(3, 70px)" }} gap="2">
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
            state="selected"
            tabIndex={1}
          />
          <ComponentCard
            icon={<BoxIcon />}
            label="Box"
            state="disabled"
            tabIndex={1}
          />
        </Grid>
      </StorySection>
      <StorySection title="Labels">
        <Grid gap="2" css={{ gridTemplateColumns: "repeat(3, 70px)" }}>
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
        </Grid>
      </StorySection>
    </TooltipProvider>
  );
};
Demo.storyName = "Component Card";
