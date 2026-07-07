import { BorderRadiusIndividualIcon } from "@webstudio-is/icons";
import {
  ToggleGroup as ToggleGroupComponent,
  ToggleGroupButton,
} from "./toggle-group";
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
      <ToggleGroupButton value="one">
        <BorderRadiusIndividualIcon fill="currentColor" />
      </ToggleGroupButton>
      <ToggleGroupButton value="two" data-focused={true}>
        <BorderRadiusIndividualIcon fill="currentColor" />
      </ToggleGroupButton>
      <ToggleGroupButton value="three" data-hovered={true}>
        <BorderRadiusIndividualIcon fill="currentColor" />
      </ToggleGroupButton>
      <ToggleGroupButton value="four">
        <BorderRadiusIndividualIcon fill="currentColor" />
      </ToggleGroupButton>
      <ToggleGroupButton
        value="five"
        data-hovered={true}
        data-focused={true}
        aria-checked={true}
      >
        <BorderRadiusIndividualIcon fill="currentColor" />
      </ToggleGroupButton>
      <ToggleGroupButton value="six">
        <BorderRadiusIndividualIcon fill="currentColor" />
      </ToggleGroupButton>
      <ToggleGroupButton value="seven">
        <BorderRadiusIndividualIcon fill="currentColor" />
      </ToggleGroupButton>
    </>
  );
};

export const ToggleGroup = () => (
  <>
    <StorySection title="Colors">
      <StoryGrid css={{ alignItems: "flex-start" }}>
        {toggleGroupColors.map((color) => (
          <ToggleGroupComponent
            key={color}
            color={color}
            type="single"
            defaultValue="one"
          >
            <ToggleGroupButtons />
          </ToggleGroupComponent>
        ))}
      </StoryGrid>
    </StorySection>

    <StorySection title="Variants disabled">
      <StoryGrid css={{ alignItems: "flex-start" }}>
        {toggleGroupColors.map((color) => (
          <ToggleGroupComponent
            key={color}
            color={color}
            type="single"
            defaultValue="one"
            disabled={true}
          >
            <ToggleGroupButtons />
          </ToggleGroupComponent>
        ))}
      </StoryGrid>
    </StorySection>

    <StorySection title="With text">
      <StoryGrid css={{ alignItems: "flex-start", flexGrow: 1 }}>
        <EnhancedTooltipProvider>
          <ToggleGroupComponent
            color="default"
            type="single"
            defaultValue="one"
          >
            <EnhancedTooltip content="One">
              <ToggleGroupButton value="one">One</ToggleGroupButton>
            </EnhancedTooltip>
            <EnhancedTooltip content="Two">
              <ToggleGroupButton value="two">Two</ToggleGroupButton>
            </EnhancedTooltip>
            <EnhancedTooltip content="Three">
              <ToggleGroupButton value="three">Three</ToggleGroupButton>
            </EnhancedTooltip>
          </ToggleGroupComponent>
        </EnhancedTooltipProvider>
      </StoryGrid>
    </StorySection>

    <StorySection title="With tooltips">
      <StoryGrid css={{ alignItems: "flex-start" }}>
        <EnhancedTooltipProvider>
          <ToggleGroupComponent
            color="default"
            type="single"
            defaultValue="one"
          >
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
          </ToggleGroupComponent>
        </EnhancedTooltipProvider>
      </StoryGrid>
    </StorySection>

    <StorySection title="Multiple selection">
      <StoryGrid css={{ alignItems: "flex-start" }}>
        <ToggleGroupComponent type="multiple" defaultValue={["one", "three"]}>
          <ToggleGroupButton value="one">
            <BorderRadiusIndividualIcon fill="currentColor" />
          </ToggleGroupButton>
          <ToggleGroupButton value="two">
            <BorderRadiusIndividualIcon fill="currentColor" />
          </ToggleGroupButton>
          <ToggleGroupButton value="three">
            <BorderRadiusIndividualIcon fill="currentColor" />
          </ToggleGroupButton>
        </ToggleGroupComponent>
      </StoryGrid>
    </StorySection>
  </>
);

export default {
  title: "Toggle Group",
  parameters: {
    // to make the variant=contrast visible
    backgrounds: { default: "Panel" },
  },
};
