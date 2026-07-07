import {
  ListPositionIndicator as ListPositionIndicatorComponent,
  TreePositionIndicator,
} from "./list-position-indicator";
import { StorySection, StoryGrid } from "./storybook";

export default {
  title: "List Position Indicator",
  parameters: {
    // to make white outline visible
    backgrounds: { default: "Maintenance Medium" },
  },
};

export const ListPositionIndicator = () => (
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
          <ListPositionIndicatorComponent x={0} y={0} length={200} />
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
          <ListPositionIndicatorComponent x={0} y={0} length={200} />
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

    <StorySection title="Offset positions">
      <StoryGrid>
        <div
          style={{
            background: "black",
            position: "relative",
            width: 250,
            height: 50,
          }}
        >
          <ListPositionIndicatorComponent x={20} y={15} length={180} />
        </div>
        <div
          style={{
            background: "black",
            position: "relative",
            width: 250,
            height: 50,
          }}
        >
          <TreePositionIndicator x={20} y={25} length={180} />
        </div>
      </StoryGrid>
    </StorySection>

    <StorySection title="String position values">
      <StoryGrid>
        <div
          style={{
            background: "black",
            position: "relative",
            width: 250,
            height: 30,
          }}
        >
          <ListPositionIndicatorComponent x="10%" y="50%" length="80%" />
        </div>
        <div
          style={{
            background: "black",
            position: "relative",
            width: 250,
            height: 30,
          }}
        >
          <TreePositionIndicator x="10%" y="50%" length="80%" />
        </div>
      </StoryGrid>
    </StorySection>
  </>
);
