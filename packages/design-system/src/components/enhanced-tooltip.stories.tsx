// import React, { useCallback } from "react";
import { TextField } from "./text-field";
import { EnhancedTooltip, EnhancedTooltipProvider } from "./enhanced-tooltip";
import { Flex } from "./flex";

export default {
  component: EnhancedTooltip,
};

export const Simple = () => {
  return (
    <EnhancedTooltipProvider>
      <Flex>
        <EnhancedTooltip content="Hello world">
          <TextField />
        </EnhancedTooltip>
      </Flex>
    </EnhancedTooltipProvider>
  );
};
