import {
  Box as Box,
  Button as Button,
  Text as Text,
  HtmlEmbed as HtmlEmbed,
} from "@webstudio-is/sdk-components-react/components";
import {
  Popover as Popover,
  PopoverTrigger as PopoverTrigger,
  PopoverContent as PopoverContent,
  PopoverClose as PopoverClose,
} from "../components";

const Component = () => {
  return (
    <Box className={`w-box`}>
      <Popover>
        <PopoverTrigger>
          <Button className={`w-button w-button-1`}>{"Button"}</Button>
        </PopoverTrigger>
        <PopoverContent className={`w-popover-content w-popover-content-1`}>
          <Text className={`w-text`}>{"The text you can edit"}</Text>
          <PopoverClose className={`w-close-button w-close-button-1`}>
            <HtmlEmbed
              code={
                '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 16 16" width="100%" height="100%" style="display: block;"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="M12.5 3 3 12.5M3 3l9.5 9.5"/></svg>'
              }
              className={`w-html-embed w-close-icon`}
            />
          </PopoverClose>
        </PopoverContent>
      </Popover>
    </Box>
  );
};

export default {
  title: "Components/Popover",
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
  div.w-html-embed {
    display: contents;
    white-space: normal;
    white-space-collapse: collapse
  }
  div.w-text {
    box-sizing: border-box;
    min-height: 1em
  }
  button.w-close-button {
    background-color: transparent;
    background-image: none;
    font-family: inherit;
    font-size: 100%;
    line-height: 1.15;
    box-sizing: border-box;
    text-transform: none;
    border: 0px solid rgb(226 232 240 / 1);
    margin: 0;
    padding: 0px
  }
  div.w-popover-content {
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
  .w-popover-content-1 {
    z-index: 50;
    width: 18rem;
    border-top-left-radius: 0.375rem;
    border-top-right-radius: 0.375rem;
    border-bottom-right-radius: 0.375rem;
    border-bottom-left-radius: 0.375rem;
    background-color: rgb(255 255 255 / 1);
    color: rgb(2 8 23 / 1);
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
    outline: medium none currentcolor;
    border: 1px solid rgb(226 232 240 / 1);
    padding: 1rem
  }
  .w-close-button-1 {
    position: absolute;
    right: 1rem;
    top: 1rem;
    border-top-left-radius: 0.125rem;
    border-top-right-radius: 0.125rem;
    border-bottom-right-radius: 0.125rem;
    border-bottom-left-radius: 0.125rem;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 1rem;
    width: 1rem;
    background-color: transparent;
    outline: medium none currentcolor;
    border: 0 none currentcolor
  }
  .w-close-button-1:focus-visible {
    box-shadow: 0 0 0 2px rgb(255 255 255 / 1), 0 0 0 calc(2px + 2px) rgb(148,163,184)
  }
  .w-close-button-1:hover {
    opacity: 1
  }
  .w-close-icon {
    display: block;
    width: 100%;
    height: 100%;
    line-height: 0
  }
}
      `}
        </style>
        <Component />
      </>
    );
  },
};

export { Story as Popover };
