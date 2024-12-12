import { Box, Flex, Grid } from "@webstudio-is/design-system";
import { Outline } from "./outline";

export default { component: Outline };

export const Basic = () => (
  <Grid gap={3} columns={2} css={{ margin: 16 }}>
    <Grid
      align="center"
      justify="center"
      css={{ position: "relative", height: 150, width: 150 }}
    >
      <Box css={{ width: "min-content", textAlign: "center" }}>
        Selected outline
      </Box>
      <Outline
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
      <Outline
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
      <Outline
        rect={new DOMRect(0, 0, 150, 150)}
        clampingRect={new DOMRect(0, 0, 150, 150)}
      />
      <Outline
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
      <Outline
        rect={new DOMRect(0, 0, 150, 150)}
        clampingRect={new DOMRect(0, 0, 150, 150)}
        variant="collaboration"
      />
      <Outline
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
      <Outline
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
      <Outline
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
      <Outline
        rect={new DOMRect(-10, 0, 170, 150)}
        clampingRect={new DOMRect(0, 0, 150, 150)}
      />
    </Flex>
  </Grid>
);
