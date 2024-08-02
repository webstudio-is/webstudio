import { EnhancedTooltip, EnhancedTooltipProvider } from "./enhanced-tooltip";
import { Flex } from "./flex";
import { InputField } from "./input-field";

export default {
  component: EnhancedTooltip,
};

export const Simple = () => {
  return (
    <EnhancedTooltipProvider>
      <Flex>
        <EnhancedTooltip content="Hello world">
          <InputField />
        </EnhancedTooltip>
      </Flex>
    </EnhancedTooltipProvider>
  );
};
