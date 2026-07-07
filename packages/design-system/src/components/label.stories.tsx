import { StorySection, StoryGrid } from "./storybook";
import { Label } from "./label";
import { Flex } from "./flex";

export default {
  title: "Label",
};

const colors = ["default", "preset", "local", "overwritten", "remote"] as const;

const LabelStory = () => (
  <>
    <StorySection title="Colors">
      <StoryGrid horizontal>
        {colors.map((color) => (
          <Label key={color} color={color}>
            {color}
          </Label>
        ))}
      </StoryGrid>
    </StorySection>

    <StorySection title="Section title">
      <StoryGrid horizontal>
        {colors.map((color) => (
          <Label key={color} color={color} text="title">
            {color}
          </Label>
        ))}
      </StoryGrid>
    </StorySection>

    <StorySection title="Focused (initially)">
      <StoryGrid horizontal>
        <Label color="local" ref={(element) => element?.focus()}>
          Local
        </Label>
      </StoryGrid>
    </StorySection>

    <StorySection title="With checkbox">
      <input id="checkbox1" type="checkbox"></input>
      <Label htmlFor="checkbox1">Label text</Label>
    </StorySection>

    <StorySection title="Disabled">
      <StoryGrid horizontal>
        <Label disabled={true}>Label text</Label>
        <div>
          <input id="checkbox2" type="checkbox" disabled={true}></input>
          <Label htmlFor="checkbox2" disabled={true}>
            Label text
          </Label>
        </div>
      </StoryGrid>
    </StorySection>

    <StorySection title="Truncated">
      <Flex direction="column" gap="2" css={{ width: 150 }}>
        <Label truncate>
          This is a very long label text that should be truncated at the edge
        </Label>
        <Label color="local" truncate>
          This is a very long local label text that should be truncated
        </Label>
      </Flex>
    </StorySection>

    <StorySection title="Mono text variant">
      <StoryGrid horizontal>
        <Label text="mono">Mono text</Label>
        <Label text="sentence">Sentence text</Label>
        <Label text="title">Title text</Label>
      </StoryGrid>
    </StorySection>

    <StorySection title="Inactive color">
      <Label color="inactive">Inactive label</Label>
    </StorySection>

    <StorySection title="Tag variants">
      <StoryGrid horizontal>
        <Label tag="button">Explicit button tag</Label>
        <Label tag="label" color="local">
          Explicit label tag (with color)
        </Label>
      </StoryGrid>
    </StorySection>
  </>
);

export { LabelStory as Label };
