import { NestedIconLabel } from "./nested-icon-label";
import { SelectButton as SelectButtonComponent } from "./select-button";
import { GapVerticalIcon } from "@webstudio-is/icons";
import { StorySection, StoryGrid } from "./storybook";

export default {
  title: "Select Button",
};

const iconLabel = (
  <NestedIconLabel color="local">
    <GapVerticalIcon />
  </NestedIconLabel>
);

export const SelectButton = () => {
  return (
    <>
      <StorySection title="Closed">
        <StoryGrid horizontal>
          <SelectButtonComponent data-placeholder>
            No value
          </SelectButtonComponent>
          <SelectButtonComponent prefix={iconLabel} data-placeholder>
            No value
          </SelectButtonComponent>
          <SelectButtonComponent>With value</SelectButtonComponent>
          <SelectButtonComponent prefix={iconLabel}>
            With value
          </SelectButtonComponent>
        </StoryGrid>
      </StorySection>
      <StorySection title="Open">
        <StoryGrid horizontal>
          <SelectButtonComponent data-placeholder data-state="open">
            No value
          </SelectButtonComponent>
          <SelectButtonComponent
            prefix={iconLabel}
            data-placeholder
            data-state="open"
          >
            No value
          </SelectButtonComponent>
          <SelectButtonComponent data-state="open">
            With value
          </SelectButtonComponent>
          <SelectButtonComponent prefix={iconLabel} data-state="open">
            With value
          </SelectButtonComponent>
        </StoryGrid>
      </StorySection>
      <StorySection title="Disabled">
        <StoryGrid horizontal>
          <SelectButtonComponent disabled data-placeholder>
            No value
          </SelectButtonComponent>
          <SelectButtonComponent
            disabled
            prefix={
              <NestedIconLabel color="local" disabled>
                <GapVerticalIcon />
              </NestedIconLabel>
            }
            data-placeholder
          >
            No value
          </SelectButtonComponent>
          <SelectButtonComponent disabled>With value</SelectButtonComponent>
          <SelectButtonComponent
            disabled
            prefix={
              <NestedIconLabel color="local" disabled>
                <GapVerticalIcon />
              </NestedIconLabel>
            }
          >
            With value
          </SelectButtonComponent>
        </StoryGrid>
      </StorySection>
      <StorySection title="Full width">
        <StoryGrid css={{ width: 120 }}>
          <SelectButtonComponent fullWidth>
            Some very long text
          </SelectButtonComponent>
          <SelectButtonComponent fullWidth prefix={iconLabel}>
            Some very long text
          </SelectButtonComponent>
          <SelectButtonComponent fullWidth>Short</SelectButtonComponent>
          <SelectButtonComponent fullWidth prefix={iconLabel}>
            Short
          </SelectButtonComponent>
        </StoryGrid>
      </StorySection>
      <StorySection title="Focused (initialy)">
        <StoryGrid horizontal>
          <SelectButtonComponent prefix={iconLabel} autoFocus>
            With value
          </SelectButtonComponent>
        </StoryGrid>
      </StorySection>
    </>
  );
};
SelectButton.storyName = "Select Button";
