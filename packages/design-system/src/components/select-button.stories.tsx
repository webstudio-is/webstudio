import { NestedIconLabel } from "./nested-icon-label";
import { SelectButton } from "./select-button";
import { GapVerticalIcon } from "@webstudio-is/icons";
import { StorySection, StoryGrid } from "./storybook";

export default {
  title: "Library/Select Button",
};

const iconLabel = (
  <NestedIconLabel color="local">
    <GapVerticalIcon />
  </NestedIconLabel>
);

export const Demo = () => {
  return (
    <>
      <StorySection title="Closed">
        <StoryGrid horizontal>
          <SelectButton data-placeholder>No value</SelectButton>
          <SelectButton prefix={iconLabel} data-placeholder>
            No value
          </SelectButton>
          <SelectButton>With value</SelectButton>
          <SelectButton prefix={iconLabel}>With value</SelectButton>
        </StoryGrid>
      </StorySection>
      <StorySection title="Open">
        <StoryGrid horizontal>
          <SelectButton data-placeholder data-state="open">
            No value
          </SelectButton>
          <SelectButton prefix={iconLabel} data-placeholder data-state="open">
            No value
          </SelectButton>
          <SelectButton data-state="open">With value</SelectButton>
          <SelectButton prefix={iconLabel} data-state="open">
            With value
          </SelectButton>
        </StoryGrid>
      </StorySection>
      <StorySection title="Disabled">
        <StoryGrid horizontal>
          <SelectButton disabled data-placeholder>
            No value
          </SelectButton>
          <SelectButton
            disabled
            prefix={
              <NestedIconLabel color="local" disabled>
                <GapVerticalIcon />
              </NestedIconLabel>
            }
            data-placeholder
          >
            No value
          </SelectButton>
          <SelectButton disabled>With value</SelectButton>
          <SelectButton
            disabled
            prefix={
              <NestedIconLabel color="local" disabled>
                <GapVerticalIcon />
              </NestedIconLabel>
            }
          >
            With value
          </SelectButton>
        </StoryGrid>
      </StorySection>
      <StorySection title="Full width">
        <StoryGrid css={{ width: 120 }}>
          <SelectButton fullWidth>Some very long text</SelectButton>
          <SelectButton fullWidth prefix={iconLabel}>
            Some very long text
          </SelectButton>
          <SelectButton fullWidth>Short</SelectButton>
          <SelectButton fullWidth prefix={iconLabel}>
            Short
          </SelectButton>
        </StoryGrid>
      </StorySection>
      <StorySection title="Focused (initialy)">
        <StoryGrid horizontal>
          <SelectButton prefix={iconLabel} autoFocus>
            With value
          </SelectButton>
        </StoryGrid>
      </StorySection>
    </>
  );
};
Demo.storyName = "Select Button";
