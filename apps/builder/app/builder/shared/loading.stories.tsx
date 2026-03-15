import { Flex, StorySection, Text, theme } from "@webstudio-is/design-system";
import { Loading as LoadingComponent, LoadingBackground } from "./loading";

export default {
  title: "Builder/Shared/Loading",
  component: LoadingComponent,
};

export const Loading = () => (
  <StorySection title="Loading">
    <Flex direction="column" gap="5">
      <Text variant="labels">Loading at 30%</Text>
      <Flex
        css={{
          position: "relative",
          height: 200,
          background: theme.colors.backgroundTopbar,
        }}
      >
        <LoadingComponent
          state={{
            state: "loading",
            progress: 30,
            readyStates: new Map([
              ["dataLoadingState", false],
              ["selectedInstanceRenderState", false],
              ["canvasIframeState", false],
            ]),
          }}
        />
      </Flex>

      <Text variant="labels">Loading at 80%</Text>
      <Flex
        css={{
          position: "relative",
          height: 200,
          background: theme.colors.backgroundTopbar,
        }}
      >
        <LoadingComponent
          state={{
            state: "loading",
            progress: 80,
            readyStates: new Map([
              ["dataLoadingState", true],
              ["selectedInstanceRenderState", true],
              ["canvasIframeState", false],
            ]),
          }}
        />
      </Flex>

      <Text variant="labels">Background overlay (visible)</Text>
      <Flex css={{ position: "relative", height: 100 }}>
        <LoadingBackground show />
      </Flex>
    </Flex>
  </StorySection>
);
