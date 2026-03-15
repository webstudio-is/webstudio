import { Box, Flex, Grid, StorySection } from "@webstudio-is/design-system";
import { Outline as OutlineComponent } from "./outline";

export default {
  title: "Canvas tools/Outline",
  component: OutlineComponent,
};

export const Outline = () => (
  <StorySection title="Outline">
    <Grid gap={3} columns={2} css={{ margin: 16 }}>
      <Grid
        align="center"
        justify="center"
        css={{ position: "relative", height: 150, width: 150 }}
      >
        <Box css={{ width: "min-content", textAlign: "center" }}>
          Selected outline
        </Box>
        <OutlineComponent
          rect={new DOMRect(0, 0, 150, 150)}
          clampingRect={new DOMRect(0, 0, 150, 150)}
        />
      </Grid>

      <Flex
        align="center"
        justify="center"
        css={{ position: "relative", height: 150, width: 150 }}
      >
        <Box css={{ width: "min-content", textAlign: "center" }}>
          Collaboration outline
        </Box>
        <OutlineComponent
          rect={new DOMRect(0, 0, 150, 150)}
          clampingRect={new DOMRect(0, 0, 150, 150)}
          variant="collaboration"
        />
      </Flex>

      <Flex
        align="center"
        justify="center"
        css={{ position: "relative", height: 150, width: 150 }}
      >
        <Box css={{ width: "min-content", textAlign: "center" }}>
          Collaboration outline over Selected
        </Box>
        <OutlineComponent
          rect={new DOMRect(0, 0, 150, 150)}
          clampingRect={new DOMRect(0, 0, 150, 150)}
        />
        <OutlineComponent
          rect={new DOMRect(0, 0, 150, 150)}
          clampingRect={new DOMRect(0, 0, 150, 150)}
          variant="collaboration"
        />
      </Flex>

      <Flex
        align="center"
        justify="center"
        css={{ position: "relative", height: 150, width: 150 }}
      >
        <Box css={{ width: "min-content", textAlign: "center" }}>
          Selected outline over Collaboration
        </Box>
        <OutlineComponent
          rect={new DOMRect(0, 0, 150, 150)}
          clampingRect={new DOMRect(0, 0, 150, 150)}
          variant="collaboration"
        />
        <OutlineComponent
          rect={new DOMRect(0, 0, 150, 150)}
          clampingRect={new DOMRect(0, 0, 150, 150)}
        />
      </Flex>

      <Flex
        align="center"
        justify="center"
        css={{ position: "relative", height: 150, width: 150 }}
      >
        <Box css={{ width: "min-content", textAlign: "center" }}>
          Clamped left
        </Box>
        <OutlineComponent
          rect={new DOMRect(-10, 0, 150, 150)}
          clampingRect={new DOMRect(0, 0, 150, 150)}
        />
      </Flex>

      <Flex
        align="center"
        justify="center"
        css={{ position: "relative", height: 150, width: 150 }}
      >
        <Box css={{ width: "min-content", textAlign: "center" }}>
          Clamped right
        </Box>
        <OutlineComponent
          rect={new DOMRect(0, 0, 160, 150)}
          clampingRect={new DOMRect(0, 0, 150, 150)}
        />
      </Flex>

      <Flex
        align="center"
        justify="center"
        css={{ position: "relative", height: 150, width: 150 }}
      >
        <Box css={{ width: "min-content", textAlign: "center" }}>
          Clamped left-right
        </Box>
        <OutlineComponent
          rect={new DOMRect(-10, 0, 170, 150)}
          clampingRect={new DOMRect(0, 0, 150, 150)}
        />
      </Flex>
    </Grid>
  </StorySection>
);
