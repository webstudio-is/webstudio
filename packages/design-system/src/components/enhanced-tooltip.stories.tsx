import { EnhancedTooltip, EnhancedTooltipProvider } from "./enhanced-tooltip";
import { Flex } from "./flex";
import { InputField } from "./input-field";

export default {
  title: "Enhanced Tooltip",
  component: EnhancedTooltip,
};

export const Simple = () => (
  <EnhancedTooltipProvider>
    <Flex css={{ padding: 40 }}>
      <EnhancedTooltip content="Hello world" defaultOpen>
        <InputField />
      </EnhancedTooltip>
    </Flex>
  </EnhancedTooltipProvider>
);
