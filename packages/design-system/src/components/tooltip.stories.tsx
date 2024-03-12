import { Tooltip, TooltipProvider } from "./tooltip";
import { Button } from "./button";
import { Box } from "./box";

export default {
  title: "Library/Tooltip",
};

const TooltipStory = () => {
  return (
    <TooltipProvider>
      <Box>Some content</Box>
      <Tooltip content="Tooltip content">
        <Button>Hover me</Button>
      </Tooltip>
      <Box>Some content</Box>
      <Box css={{ height: 100, width: 200, overflowY: "scroll" }}>
        <Box css={{ height: 2000 }}>
          <Tooltip content="Tooltip content" side={"right"} open={true}>
            <Button css={{ width: "100%", my: 10 }}>Hover me</Button>
          </Tooltip>
        </Box>
      </Box>
    </TooltipProvider>
  );
};

export { TooltipStory as Tooltip };
