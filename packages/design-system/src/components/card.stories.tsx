import { Text } from "./text";
import { Card as CardComponent } from "./card";
import { StorySection, StoryGrid } from "./storybook";

export default {
  title: "Card",
  component: CardComponent,
};

export const Card = () => (
  <>
    <StorySection title="Sizes">
      <StoryGrid horizontal>
        <CardComponent>
          <Text>Default</Text>
        </CardComponent>
        <CardComponent size="1">
          <Text>Size 1</Text>
        </CardComponent>
      </StoryGrid>
    </StorySection>
    <StorySection title="Multiple">
      <StoryGrid horizontal>
        <CardComponent size="1">
          <Text>First card</Text>
        </CardComponent>
        <CardComponent size="1">
          <Text>Second card</Text>
        </CardComponent>
        <CardComponent size="1">
          <Text>Third card</Text>
        </CardComponent>
      </StoryGrid>
    </StorySection>
  </>
);
