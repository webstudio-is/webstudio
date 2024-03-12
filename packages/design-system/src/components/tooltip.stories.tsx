import { InputErrorsTooltip, TooltipProvider } from "./tooltip";
import { Button } from "./button";
import { Box } from "./box";

export default {
  title: "Library/Tooltip",
};

const TooltipStory = () => {
  return (
    <TooltipProvider>
      <Box>Some content</Box>
      {/*
      <InputErrorsTooltip errors={["Tooltip content"]}>
        <Button>Hover me</Button>
      </InputErrorsTooltip>
  */}
      <Box>Some content</Box>
      <Box css={{ height: 100, width: 200, overflowY: "scroll" }}>
        <Box css={{ height: 2000 }}>
          <InputErrorsTooltip
            errors={["Tooltip content"]}
            side={"right"}
            open={true}
          >
            <Button css={{ width: "100%", my: 10 }}>Hover me</Button>
          </InputErrorsTooltip>
          <br />
          <br />
          <InputErrorsTooltip
            errors={["Tooltip content"]}
            side={"right"}
            open={true}
          >
            <Button css={{ width: "100%", my: 10 }}>Hover me</Button>
          </InputErrorsTooltip>
          <br />
          <br />
          <InputErrorsTooltip
            errors={["Tooltip content"]}
            side={"right"}
            open={true}
          >
            <Button css={{ width: "100%", my: 10 }}>Hover me</Button>
          </InputErrorsTooltip>
          <br />
          <br />
          <InputErrorsTooltip
            errors={["Tooltip content"]}
            side={"right"}
            open={true}
          >
            <Button css={{ width: "100%", my: 10 }}>Hover me</Button>
          </InputErrorsTooltip>
          <br />
          <br />
        </Box>
      </Box>
    </TooltipProvider>
  );
};

export { TooltipStory as Tooltip };
