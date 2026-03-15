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

export default {
  title: "Tooltip",
};

export const Tooltip = () => (
  <TooltipProvider>
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
  </TooltipProvider>
);
