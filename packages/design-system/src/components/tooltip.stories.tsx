import {
  InputErrorsTooltip,
  TooltipProvider,
  Tooltip as TooltipDesign,
} from "./tooltip";
import { Button } from "./button";
import { Box } from "./box";
import { InputField } from "./input-field";
import { useState } from "react";

export default {
  title: "Library/Tooltip",
};

export const TooltipDelay = () => {
  const [error, setError] = useState<string[]>([]);
  return (
    <TooltipProvider>
      <TooltipDesign content="HELLO" delayDuration={1000}>
        <Button>Hover me</Button>
      </TooltipDesign>

      <InputErrorsTooltip errors={error} side={"right"}>
        <InputField
          id="input"
          placeholder="Input"
          css={{
            width: 200,
          }}
          onChange={(event) => {
            setError(event.target.value !== "" ? ["Error"] : []);
          }}
        />
      </InputErrorsTooltip>

      <TooltipDesign content={undefined} delayDuration={1000}>
        <Button>Hover me</Button>
      </TooltipDesign>
    </TooltipProvider>
  );
};

export const Tooltip = () => {
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
