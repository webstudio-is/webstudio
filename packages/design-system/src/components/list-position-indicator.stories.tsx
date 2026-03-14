import {
  ListPositionIndicator,
  TreePositionIndicator,
} from "./list-position-indicator";
import { StorySection, StoryGrid } from "./storybook";
import { theme } from "../stitches.config";

export default {
  title: "List Position Indicator",
};

// Maintenance Medium background to make white outline visible
export const Demo = () => (
  <div
    style={{
      backgroundColor: theme.colors.maintenanceMedium.value,
      padding: 8,
    }}
  >
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
          <TreePositionIndicator x={0} y={0} length={200} />
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
          <TreePositionIndicator x={0} y={0} length={200} />
        </div>
      </StoryGrid>
    </StorySection>
  </div>
);

Demo.storyName = "List Position Indicator";
