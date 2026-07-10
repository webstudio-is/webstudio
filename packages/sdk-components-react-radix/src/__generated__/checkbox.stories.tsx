import {
  Box as Box,
  HtmlEmbed as HtmlEmbed,
  Text as Text,
} from "@webstudio-is/sdk-components-react/components";
import {
  Label as Label,
  Checkbox as Checkbox,
  CheckboxIndicator as CheckboxIndicator,
} from "../components";

const Component = () => {
  return (
    <Box className={`w-box`}>
      <Label className={`w-label w-checkbox-field`}>
        <Checkbox className={`w-checkbox w-checkbox-1`}>
          <CheckboxIndicator
            className={`w-checkbox-indicator w-checkbox-indicator-1`}
          >
            <HtmlEmbed
              code={
                '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 16 16" width="100%" height="100%" style="display: block;"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.091" d="m13.636 3.667-8 8L2 8.03"/></svg>'
              }
              className={`w-html-embed w-indicator-icon`}
            />
          </CheckboxIndicator>
        </Checkbox>
        <Text data-ws-tag="span" className={`w-text`}>
          {"Checkbox"}
        </Text>
      </Label>
    </Box>
  );
};

export default {
  title: "Components/Checkbox",
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
  button.w-checkbox {
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
  span.w-checkbox-indicator {
    box-sizing: border-box
  }
  label.w-label {
    box-sizing: border-box
  }
}
@media all {
  .w-checkbox-field {
    display: flex;
    row-gap: 0.5rem;
    column-gap: 0.5rem;
    align-items: center
  }
  .w-checkbox-1 {
    height: 1rem;
    width: 1rem;
    flex-shrink: 0;
    border-top-left-radius: 0.125rem;
    border-top-right-radius: 0.125rem;
    border-bottom-right-radius: 0.125rem;
    border-bottom-left-radius: 0.125rem;
    border: 1px solid rgb(15 23 42 / 1)
  }
  .w-checkbox-1:disabled {
    cursor: not-allowed;
    opacity: 0.5
  }
  .w-checkbox-1:focus-visible {
    box-shadow: 0 0 0 2px rgb(255 255 255 / 1), 0 0 0 calc(2px + 2px) rgb(148,163,184);
    outline: medium none currentcolor
  }
  .w-checkbox-1[data-state="checked"] {
    background-color: rgb(15 23 42 / 1);
    color: hsl(210 40% 98% / 1)
  }
  .w-checkbox-indicator-1 {
    display: flex;
    align-items: center;
    justify-content: center;
    color: currentcolor
  }
  .w-indicator-icon {
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

export { Story as Checkbox };
