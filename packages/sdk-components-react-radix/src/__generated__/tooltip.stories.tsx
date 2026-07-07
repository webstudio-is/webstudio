import {
  Box as Box,
  Button as Button,
  Text as Text,
} from "@webstudio-is/sdk-components-react/components";
import {
  Tooltip as Tooltip,
  TooltipTrigger as TooltipTrigger,
  TooltipContent as TooltipContent,
} from "../components";

const Component = () => {
  return (
    <Box className={`w-box`}>
      <Tooltip>
        <TooltipTrigger>
          <Button className={`w-button w-button-1`}>{"Button"}</Button>
        </TooltipTrigger>
        <TooltipContent className={`w-tooltip-content w-tooltip-content-1`}>
          <Text className={`w-text`}>{"The text you can edit"}</Text>
        </TooltipContent>
      </Tooltip>
    </Box>
  );
};

export default {
  title: "Components/Tooltip",
};

const Story = {
  render() {
    return (
      <>
        <style>
          {`
@layer presets {
  div.w-box {
    box-sizing: border-box
  }
  button.w-button {
    font-family: inherit;
    font-size: 100%;
    line-height: 1.15;
    box-sizing: border-box;
    border-top-style: solid;
    border-right-style: solid;
    border-bottom-style: solid;
    border-left-style: solid;
    text-transform: none;
    margin: 0
  }
  div.w-text {
    box-sizing: border-box;
    min-height: 1em
  }
  div.w-tooltip-content {
    box-sizing: border-box
  }
}
@media all {
  .w-button-1 {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background-color: rgb(255 255 255 / 1);
    border-top-left-radius: 0.375rem;
    border-top-right-radius: 0.375rem;
    border-bottom-right-radius: 0.375rem;
    border-bottom-left-radius: 0.375rem;
    font-size: 0.875rem;
    line-height: 1.25rem;
    font-weight: 500;
    height: 2.5rem;
    padding-top: 0.5rem;
    padding-right: 1rem;
    padding-bottom: 0.5rem;
    padding-left: 1rem;
    border: 1px solid rgb(226 232 240 / 1)
  }
  .w-button-1:disabled {
    pointer-events: none;
    opacity: 0.5
  }
  .w-button-1:focus-visible {
    outline-offset: 2px;
    box-shadow: 0 0 0 2px rgb(255 255 255 / 1), 0 0 0 calc(2px + 2px) rgb(148,163,184);
    outline: 2px solid transparent
  }
  .w-button-1:hover {
    background-color: rgb(241 245 249 / 1);
    color: rgb(15 23 42 / 1)
  }
  .w-tooltip-content-1 {
    z-index: 50;
    overflow-x: hidden;
    overflow-y: hidden;
    border-top-left-radius: 0.375rem;
    border-top-right-radius: 0.375rem;
    border-bottom-right-radius: 0.375rem;
    border-bottom-left-radius: 0.375rem;
    background-color: rgb(255 255 255 / 1);
    padding-top: 0.375rem;
    padding-right: 0.75rem;
    padding-bottom: 0.375rem;
    padding-left: 0.75rem;
    font-size: 0.875rem;
    line-height: 1.25rem;
    color: rgb(2 8 23 / 1);
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)
  }
}
      `}
        </style>
        <Component />
      </>
    );
  },
};

export { Story as Tooltip };
