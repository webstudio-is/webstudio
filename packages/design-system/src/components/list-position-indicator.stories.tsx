import { ListPositionIndicator } from "./list-position-indicator";
import { StorySection, StoryGrid } from "./storybook";

export default {
  title: "Library/List Position Indicator",
  parameters: {
    // to make white outline visible
    backgrounds: { default: "Maintenance Medium" },
  },
};

export const Demo = () => (
  <>
    <StorySection title="Coordinates check">
      <StoryGrid>
        <div
          style={{
            background: "black",
            position: "relative",
            width: 250,
            height: 30,
          }}
        >
          <ListPositionIndicator x={0} y={0} length={200} />
        </div>
        <div
          style={{
            background: "black",
            position: "relative",
            width: 250,
            height: 30,
          }}
        >
          <ListPositionIndicator x={0} y={0} length={200} withNub />
        </div>
      </StoryGrid>
    </StorySection>

    <StorySection title="Length check">
      <StoryGrid>
        <div
          style={{
            background: "black",
            position: "relative",
            width: 200,
            height: 30,
          }}
        >
          <ListPositionIndicator x={0} y={0} length={200} />
        </div>
        <div
          style={{
            background: "black",
            position: "relative",
            width: 200,
            height: 30,
          }}
        >
          <ListPositionIndicator x={0} y={0} length={200} withNub />
        </div>
      </StoryGrid>
    </StorySection>
  </>
);

Demo.storyName = "List Position Indicator";
