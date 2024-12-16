import type { ComponentProps } from "react";
import { BorderRadiusIndividualIcon } from "@webstudio-is/icons";
import { ToggleGroup, ToggleGroupButton } from "./toggle-group";
import { StorySection, StoryGrid } from "./storybook";
import { EnhancedTooltip, EnhancedTooltipProvider } from "./enhanced-tooltip";

const toggleGroupColors = [
  "default",
  "preset",
  "local",
  "overwritten",
  "remote",
] as const;

const ToggleGroupButtons = () => {
  return (
    <>
      <ToggleGroupButton
        value="one"
        icon={<BorderRadiusIndividualIcon fill="currentColor" />}
      />
      <ToggleGroupButton
        value="two"
        data-focused={true}
        icon={<BorderRadiusIndividualIcon fill="currentColor" />}
      />
      <ToggleGroupButton
        value="three"
        data-hovered={true}
        icon={<BorderRadiusIndividualIcon fill="currentColor" />}
      />
      <ToggleGroupButton
        value="four"
        icon={<BorderRadiusIndividualIcon fill="currentColor" />}
      />
      <ToggleGroupButton
        value="five"
        data-hovered={true}
        data-focused={true}
        aria-checked={true}
        icon={<BorderRadiusIndividualIcon fill="currentColor" />}
      />
      <ToggleGroupButton
        value="six"
        icon={<BorderRadiusIndividualIcon fill="currentColor" />}
      />
      <ToggleGroupButton
        value="seven"
        icon={<BorderRadiusIndividualIcon fill="currentColor" />}
      />
    </>
  );
};

export const Demo = ({
  type = "single",
  color = "default",
  disabled = false,
}: ComponentProps<typeof ToggleGroup>) => (
  <>
    <StorySection title="Configurable">
      <StoryGrid css={{ alignItems: "flex-start" }}>
        <ToggleGroup key={color} type={type} color={color} disabled={disabled}>
          <ToggleGroupButtons />
        </ToggleGroup>
      </StoryGrid>
    </StorySection>

    <StorySection title="Colors">
      <StoryGrid css={{ alignItems: "flex-start" }}>
        {toggleGroupColors.map((color) => (
          <ToggleGroup
            key={color}
            color={color}
            type="single"
            defaultValue="one"
          >
            <ToggleGroupButtons />
          </ToggleGroup>
        ))}
      </StoryGrid>
    </StorySection>

    <StorySection title="Variants disabled">
      <StoryGrid css={{ alignItems: "flex-start" }}>
        {toggleGroupColors.map((color) => (
          <ToggleGroup
            key={color}
            color={color}
            type="single"
            defaultValue="one"
            disabled={true}
          >
            <ToggleGroupButtons />
          </ToggleGroup>
        ))}
      </StoryGrid>
    </StorySection>

    <StorySection title="With text">
      <StoryGrid css={{ alignItems: "flex-start", flexGrow: 1 }}>
        <EnhancedTooltipProvider>
          <ToggleGroup color={color} type="single" defaultValue="one">
            <EnhancedTooltip content="One">
              <ToggleGroupButton value="one">One</ToggleGroupButton>
            </EnhancedTooltip>
            <EnhancedTooltip content="Two">
              <ToggleGroupButton value="two">Two</ToggleGroupButton>
            </EnhancedTooltip>
            <EnhancedTooltip content="Three">
              <ToggleGroupButton value="three">Three</ToggleGroupButton>
            </EnhancedTooltip>
          </ToggleGroup>
        </EnhancedTooltipProvider>
      </StoryGrid>
    </StorySection>

    <StorySection title="With tooltips">
      <StoryGrid css={{ alignItems: "flex-start" }}>
        <EnhancedTooltipProvider>
          <ToggleGroup color={color} type="single" defaultValue="one">
            <EnhancedTooltip content="One">
              <ToggleGroupButton value="one">
                <BorderRadiusIndividualIcon fill="currentColor" />
              </ToggleGroupButton>
            </EnhancedTooltip>
            <EnhancedTooltip content="Two">
              <ToggleGroupButton value="two">
                <BorderRadiusIndividualIcon fill="currentColor" />
              </ToggleGroupButton>
            </EnhancedTooltip>
            <EnhancedTooltip content="Three">
              <ToggleGroupButton value="three">
                <BorderRadiusIndividualIcon fill="currentColor" />
              </ToggleGroupButton>
            </EnhancedTooltip>
          </ToggleGroup>
        </EnhancedTooltipProvider>
      </StoryGrid>
    </StorySection>
  </>
);

Demo.argTypes = {
  type: { control: "inline-radio", options: ["single", "multiple"] },
  color: { control: "inline-radio", options: toggleGroupColors },
  disabled: { control: "boolean" },
};

Demo.storyName = "Toggle Group";

export default {
  title: "Library/Toggle Group",
  parameters: {
    // to make the variant=contrast visible
    backgrounds: { default: "Panel" },
  },
};
