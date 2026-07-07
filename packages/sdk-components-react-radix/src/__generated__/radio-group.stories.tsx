import {
  Box as Box,
  HtmlEmbed as HtmlEmbed,
  Text as Text,
} from "@webstudio-is/sdk-components-react/components";
import {
  RadioGroup as RadioGroup,
  Label as Label,
  RadioGroupItem as RadioGroupItem,
  RadioGroupIndicator as RadioGroupIndicator,
} from "../components";

const Component = () => {
  return (
    <Box className={`w-box`}>
      <RadioGroup className={`w-radio-group w-radio-group-1`}>
        <Label className={`w-label w-label-1`}>
          <RadioGroupItem
            value={"default"}
            className={`w-radio-group-item w-radio-group-item-1`}
          >
            <RadioGroupIndicator className={`w-radio-group-indicator`}>
              <HtmlEmbed
                code={
                  '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 16 16" width="100%" height="100%" style="display: block;"><path fill="currentColor" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/></svg>'
                }
                className={`w-html-embed w-indicator-icon`}
              />
            </RadioGroupIndicator>
          </RadioGroupItem>
          <Text className={`w-text`}>{"Default"}</Text>
        </Label>
        <Label className={`w-label w-label-2`}>
          <RadioGroupItem
            value={"comfortable"}
            className={`w-radio-group-item w-radio-group-item-2`}
          >
            <RadioGroupIndicator className={`w-radio-group-indicator`}>
              <HtmlEmbed
                code={
                  '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 16 16" width="100%" height="100%" style="display: block;"><path fill="currentColor" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/></svg>'
                }
                className={`w-html-embed w-indicator-icon-1`}
              />
            </RadioGroupIndicator>
          </RadioGroupItem>
          <Text className={`w-text`}>{"Comfortable"}</Text>
        </Label>
        <Label className={`w-label w-label-3`}>
          <RadioGroupItem
            value={"compact"}
            className={`w-radio-group-item w-radio-group-item-3`}
          >
            <RadioGroupIndicator className={`w-radio-group-indicator`}>
              <HtmlEmbed
                code={
                  '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 16 16" width="100%" height="100%" style="display: block;"><path fill="currentColor" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/></svg>'
                }
                className={`w-html-embed w-indicator-icon-2`}
              />
            </RadioGroupIndicator>
          </RadioGroupItem>
          <Text className={`w-text`}>{"Compact"}</Text>
        </Label>
      </RadioGroup>
    </Box>
  );
};

export default {
  title: "Components/RadioGroup",
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
  div.w-html-embed {
    display: contents;
    white-space: normal;
    white-space-collapse: collapse
  }
  div.w-text {
    box-sizing: border-box;
    min-height: 1em
  }
  label.w-label {
    box-sizing: border-box
  }
  div.w-radio-group {
    box-sizing: border-box
  }
  span.w-radio-group-indicator {
    box-sizing: border-box
  }
  button.w-radio-group-item {
    font-family: inherit;
    font-size: 100%;
    line-height: 1.15;
    box-sizing: border-box;
    text-transform: none;
    background-color: transparent;
    background-image: none;
    border: 0px solid rgb(226 232 240 / 1);
    margin: 0;
    padding: 0px
  }
}
@media all {
  .w-radio-group-1 {
    display: flex;
    flex-direction: column;
    row-gap: 0.5rem;
    column-gap: 0.5rem
  }
  .w-label-1 {
    display: flex;
    align-items: center;
    row-gap: 0.5rem;
    column-gap: 0.5rem
  }
  .w-radio-group-item-1 {
    aspect-ratio: 1/1;
    height: 1rem;
    width: 1rem;
    border-top-left-radius: 9999px;
    border-top-right-radius: 9999px;
    border-bottom-right-radius: 9999px;
    border-bottom-left-radius: 9999px;
    color: rgb(15 23 42 / 1);
    border: 1px solid rgb(15 23 42 / 1)
  }
  .w-radio-group-item-1:disabled {
    cursor: not-allowed;
    opacity: 0.5
  }
  .w-radio-group-item-1:focus-visible {
    box-shadow: 0 0 0 2px rgb(255 255 255 / 1), 0 0 0 calc(2px + 2px) rgb(148,163,184);
    outline: medium none currentcolor
  }
  .w-indicator-icon {
    display: block;
    width: 100%;
    height: 100%;
    line-height: 0
  }
  .w-label-2 {
    display: flex;
    align-items: center;
    row-gap: 0.5rem;
    column-gap: 0.5rem
  }
  .w-radio-group-item-2 {
    aspect-ratio: 1/1;
    height: 1rem;
    width: 1rem;
    border-top-left-radius: 9999px;
    border-top-right-radius: 9999px;
    border-bottom-right-radius: 9999px;
    border-bottom-left-radius: 9999px;
    color: rgb(15 23 42 / 1);
    border: 1px solid rgb(15 23 42 / 1)
  }
  .w-radio-group-item-2:disabled {
    cursor: not-allowed;
    opacity: 0.5
  }
  .w-radio-group-item-2:focus-visible {
    box-shadow: 0 0 0 2px rgb(255 255 255 / 1), 0 0 0 calc(2px + 2px) rgb(148,163,184);
    outline: medium none currentcolor
  }
  .w-indicator-icon-1 {
    display: block;
    width: 100%;
    height: 100%;
    line-height: 0
  }
  .w-label-3 {
    display: flex;
    align-items: center;
    row-gap: 0.5rem;
    column-gap: 0.5rem
  }
  .w-radio-group-item-3 {
    aspect-ratio: 1/1;
    height: 1rem;
    width: 1rem;
    border-top-left-radius: 9999px;
    border-top-right-radius: 9999px;
    border-bottom-right-radius: 9999px;
    border-bottom-left-radius: 9999px;
    color: rgb(15 23 42 / 1);
    border: 1px solid rgb(15 23 42 / 1)
  }
  .w-radio-group-item-3:disabled {
    cursor: not-allowed;
    opacity: 0.5
  }
  .w-radio-group-item-3:focus-visible {
    box-shadow: 0 0 0 2px rgb(255 255 255 / 1), 0 0 0 calc(2px + 2px) rgb(148,163,184);
    outline: medium none currentcolor
  }
  .w-indicator-icon-2 {
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

export { Story as RadioGroup };
