import { BoxIcon } from "@webstudio-is/icons";
import { StorySection } from "./storybook";
import { ComponentCard as ComponentCardComponent } from "./component-card";
import { TooltipProvider } from "./tooltip";
import { Grid } from "./grid";

export default {
  title: "Component Card",
};

export const ComponentCard = () => {
  return (
    <TooltipProvider>
      <StorySection title="States">
        <Grid css={{ gridTemplateColumns: "repeat(3, 70px)" }} gap="2">
          <ComponentCardComponent icon={<BoxIcon />} label="Box" tabIndex={1} />
          <ComponentCardComponent
            icon={<BoxIcon />}
            label="Box"
            state="hover"
            tabIndex={1}
          />
          <ComponentCardComponent
            icon={<BoxIcon />}
            label="Box"
            state="selected"
            tabIndex={1}
          />
          <ComponentCardComponent
            icon={<BoxIcon />}
            label="Box"
            state="disabled"
            tabIndex={1}
          />
        </Grid>
      </StorySection>
      <StorySection title="Labels">
        <Grid gap="2" css={{ gridTemplateColumns: "repeat(3, 70px)" }}>
          <ComponentCardComponent
            icon={<BoxIcon />}
            label="Single"
            tabIndex={1}
          />
          <ComponentCardComponent
            icon={<BoxIcon />}
            label="Too many words too many"
            tabIndex={1}
          />
          <ComponentCardComponent
            icon={<BoxIcon />}
            label="Manylongwordstotruncate Manylongwordstotruncate"
            tabIndex={1}
          />
          <ComponentCardComponent
            icon={<BoxIcon />}
            label="Truncatedlongword"
            tabIndex={1}
          />
        </Grid>
      </StorySection>
    </TooltipProvider>
  );
};
ComponentCard.storyName = "Component Card";
