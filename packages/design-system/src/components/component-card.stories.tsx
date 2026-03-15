import { BoxIcon } from "@webstudio-is/icons";
import { StorySection } from "./storybook";
import { ComponentCard as ComponentCardComponent } from "./component-card";
import { TooltipProvider } from "./tooltip";
import { Grid } from "./grid";
import { Text } from "./text";

export default {
  title: "Component Card",
};

export const ComponentCard = () => (
  <TooltipProvider>
    <StorySection title="States">
      <Grid css={{ gridTemplateColumns: "repeat(4, 70px)" }} gap="2">
        <Text variant="labels">default</Text>
        <Text variant="labels">hover</Text>
        <Text variant="labels">selected</Text>
        <Text variant="labels">disabled</Text>
        <ComponentCardComponent icon={<BoxIcon />} label="Box" tabIndex={0} />
        <ComponentCardComponent
          icon={<BoxIcon />}
          label="Box"
          state="hover"
          tabIndex={0}
        />
        <ComponentCardComponent
          icon={<BoxIcon />}
          label="Box"
          state="selected"
          tabIndex={0}
        />
        <ComponentCardComponent
          icon={<BoxIcon />}
          label="Box"
          state="disabled"
          tabIndex={0}
        />
      </Grid>
    </StorySection>
    <StorySection title="Labels">
      <Grid gap="2" css={{ gridTemplateColumns: "repeat(4, 70px)" }}>
        <ComponentCardComponent
          icon={<BoxIcon />}
          label="Single"
          tabIndex={0}
        />
        <ComponentCardComponent
          icon={<BoxIcon />}
          label="Too many words too many"
          tabIndex={0}
        />
        <ComponentCardComponent
          icon={<BoxIcon />}
          label="Manylongwordstotruncate Manylongwordstotruncate"
          tabIndex={0}
        />
        <ComponentCardComponent
          icon={<BoxIcon />}
          label="Truncatedlongword"
          tabIndex={0}
        />
      </Grid>
    </StorySection>
    <StorySection title="With description tooltip">
      <Grid gap="2" css={{ gridTemplateColumns: "repeat(2, 70px)" }}>
        <ComponentCardComponent
          icon={<BoxIcon />}
          label="Box"
          description="A generic container element"
          tabIndex={0}
        />
        <ComponentCardComponent
          icon={<BoxIcon />}
          label="Box"
          description="Tooltip disabled"
          disableTooltip
          tabIndex={0}
        />
      </Grid>
    </StorySection>
  </TooltipProvider>
);
