import {
  InputErrorsTooltip,
  TooltipProvider,
  Tooltip as TooltipDesign,
} from "./tooltip";
import { Button } from "./button";
import { Box } from "./box";
import { Flex } from "./flex";
import { InputField } from "./input-field";
import { Text } from "./text";
import { StorySection } from "./storybook";

export default {
  title: "Tooltip",
};

export const Tooltip = () => (
  <TooltipProvider>
    <StorySection title="Tooltip">
      <Flex direction="column" gap="6" css={{ padding: 40 }}>
        <Flex direction="column" gap="2">
          <Text variant="labels">Tooltip</Text>
          <Flex gap="3" align="center">
            <TooltipDesign content="HELLO" open>
              <Button>With tooltip</Button>
            </TooltipDesign>
            <TooltipDesign content={undefined}>
              <Button>No tooltip content</Button>
            </TooltipDesign>
          </Flex>
        </Flex>

        <Flex direction="column" gap="2">
          <Text variant="labels">Input errors tooltip</Text>
          <InputErrorsTooltip errors={["Error"]} side="right" open>
            <InputField
              id="input"
              placeholder="Input with error"
              css={{ width: 200 }}
            />
          </InputErrorsTooltip>
        </Flex>

        <Flex direction="column" gap="2">
          <Text variant="labels">Scrollable container with tooltips</Text>
          <Box css={{ height: 100, width: 200, overflowY: "scroll" }}>
            <Box css={{ height: 2000 }}>
              <InputErrorsTooltip
                errors={["Tooltip content"]}
                side="right"
                open={true}
              >
                <Button css={{ width: "100%", my: 10 }}>Tooltip 1</Button>
              </InputErrorsTooltip>
              <br />
              <InputErrorsTooltip
                errors={["Tooltip content"]}
                side="right"
                open={true}
              >
                <Button css={{ width: "100%", my: 10 }}>Tooltip 2</Button>
              </InputErrorsTooltip>
            </Box>
          </Box>
        </Flex>
      </Flex>
    </StorySection>

    <StorySection title="Side placements">
      <Flex gap="6" wrap="wrap" css={{ padding: 60 }}>
        <TooltipDesign content="Top tooltip" side="top" open>
          <Button>Top</Button>
        </TooltipDesign>
        <TooltipDesign content="Right tooltip" side="right" open>
          <Button>Right</Button>
        </TooltipDesign>
        <TooltipDesign content="Bottom tooltip" side="bottom" open>
          <Button>Bottom</Button>
        </TooltipDesign>
        <TooltipDesign content="Left tooltip" side="left" open>
          <Button>Left</Button>
        </TooltipDesign>
      </Flex>
    </StorySection>

    <StorySection title="Content variants">
      <Flex direction="column" gap="6" css={{ padding: 40 }}>
        <Flex direction="column" gap="2">
          <Text variant="labels">Wrapped variant</Text>
          <TooltipDesign
            content="This is a tooltip with the wrapped variant that constrains the max width to a smaller size for compact content display"
            variant="wrapped"
            open
          >
            <Button>Wrapped</Button>
          </TooltipDesign>
        </Flex>
        <Flex direction="column" gap="2">
          <Text variant="labels">Large variant</Text>
          <TooltipDesign
            content="This is a tooltip with the large variant that allows wider content before wrapping to the next line"
            variant="large"
            open
          >
            <Button>Large</Button>
          </TooltipDesign>
        </Flex>
      </Flex>
    </StorySection>
  </TooltipProvider>
);
