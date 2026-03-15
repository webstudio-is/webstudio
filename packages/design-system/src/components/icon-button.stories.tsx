import { XIcon } from "@webstudio-is/icons";
import { IconButton as IconButtonComponent } from "./icon-button";
import { StorySection, StoryGrid } from "./storybook";

export default {
  title: "Icon Button",
  component: IconButtonComponent,
};

export const IconButton = () => (
  <>
    <StorySection title="Variants">
      <StoryGrid horizontal>
        <IconButtonComponent>
          <XIcon fill="currentColor" />
        </IconButtonComponent>
        <IconButtonComponent variant="preset">
          <XIcon fill="currentColor" />
        </IconButtonComponent>
        <IconButtonComponent variant="local">
          <XIcon fill="currentColor" />
        </IconButtonComponent>
        <IconButtonComponent variant="overwritten">
          <XIcon fill="currentColor" />
        </IconButtonComponent>
        <IconButtonComponent variant="remote">
          <XIcon fill="currentColor" />
        </IconButtonComponent>
      </StoryGrid>
    </StorySection>
    <StorySection title="Disabled">
      <StoryGrid horizontal>
        <IconButtonComponent disabled={true}>
          <XIcon fill="currentColor" />
        </IconButtonComponent>
        <IconButtonComponent variant="preset" disabled={true}>
          <XIcon fill="currentColor" />
        </IconButtonComponent>
        <IconButtonComponent variant="local" disabled={true}>
          <XIcon fill="currentColor" />
        </IconButtonComponent>
        <IconButtonComponent variant="overwritten" disabled={true}>
          <XIcon fill="currentColor" />
        </IconButtonComponent>
        <IconButtonComponent variant="remote" disabled={true}>
          <XIcon fill="currentColor" />
        </IconButtonComponent>
      </StoryGrid>
    </StorySection>
    <StorySection title="Open state">
      <StoryGrid horizontal>
        <IconButtonComponent data-state={"open"}>
          <XIcon fill="currentColor" />
        </IconButtonComponent>
        <IconButtonComponent variant="preset" data-state={"open"}>
          <XIcon fill="currentColor" />
        </IconButtonComponent>
        <IconButtonComponent variant="local" data-state={"open"}>
          <XIcon fill="currentColor" />
        </IconButtonComponent>
        <IconButtonComponent variant="overwritten" data-state={"open"}>
          <XIcon fill="currentColor" />
        </IconButtonComponent>
        <IconButtonComponent variant="remote" data-state={"open"}>
          <XIcon fill="currentColor" />
        </IconButtonComponent>
      </StoryGrid>
    </StorySection>
    <StorySection title="Focused">
      <StoryGrid horizontal>
        <IconButtonComponent data-focused={true}>
          <XIcon fill="currentColor" />
        </IconButtonComponent>
        <IconButtonComponent variant="preset" data-focused={true}>
          <XIcon fill="currentColor" />
        </IconButtonComponent>
        <IconButtonComponent variant="local" data-focused={true}>
          <XIcon fill="currentColor" />
        </IconButtonComponent>
        <IconButtonComponent variant="overwritten" data-focused={true}>
          <XIcon fill="currentColor" />
        </IconButtonComponent>
        <IconButtonComponent variant="remote" data-focused={true}>
          <XIcon fill="currentColor" />
        </IconButtonComponent>
      </StoryGrid>
    </StorySection>
    <StorySection title="Hovered">
      <StoryGrid horizontal>
        <IconButtonComponent data-hovered={true}>
          <XIcon fill="currentColor" />
        </IconButtonComponent>
        <IconButtonComponent variant="preset" data-hovered={true}>
          <XIcon fill="currentColor" />
        </IconButtonComponent>
        <IconButtonComponent variant="local" data-hovered={true}>
          <XIcon fill="currentColor" />
        </IconButtonComponent>
        <IconButtonComponent variant="overwritten" data-hovered={true}>
          <XIcon fill="currentColor" />
        </IconButtonComponent>
        <IconButtonComponent variant="remote" data-hovered={true}>
          <XIcon fill="currentColor" />
        </IconButtonComponent>
      </StoryGrid>
    </StorySection>
  </>
);
