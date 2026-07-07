import {
  Box as Box,
  HtmlEmbed as HtmlEmbed,
} from "@webstudio-is/sdk-components-react/components";
import {
  Select as Select,
  SelectTrigger as SelectTrigger,
  SelectValue as SelectValue,
  SelectContent as SelectContent,
  SelectViewport as SelectViewport,
  SelectItem as SelectItem,
  SelectItemIndicator as SelectItemIndicator,
  SelectItemText as SelectItemText,
} from "../components";

const Component = () => {
  return (
    <Box className={`w-box`}>
      <Select>
        <SelectTrigger className={`w-select-trigger w-select-trigger-1`}>
          <SelectValue placeholder={"Theme"} className={`w-value`} />
        </SelectTrigger>
        <SelectContent className={`w-select-content w-select-content-1`}>
          <SelectViewport className={`w-select-viewport w-select-viewport-1`}>
            <SelectItem
              value={"light"}
              className={`w-select-item w-select-item-1`}
            >
              <SelectItemIndicator className={`w-indicator w-indicator-1`}>
                <HtmlEmbed
                  code={
                    '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 16 16" width="100%" height="100%" style="display: block;"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.091" d="m13.636 3.667-8 8L2 8.03"/></svg>'
                  }
                  className={`w-html-embed w-indicator-icon`}
                />
              </SelectItemIndicator>
              <SelectItemText className={`w-item-text`}>
                {"Light"}
              </SelectItemText>
            </SelectItem>
            <SelectItem
              value={"dark"}
              className={`w-select-item w-select-item-2`}
            >
              <SelectItemIndicator className={`w-indicator w-indicator-2`}>
                <HtmlEmbed
                  code={
                    '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 16 16" width="100%" height="100%" style="display: block;"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.091" d="m13.636 3.667-8 8L2 8.03"/></svg>'
                  }
                  className={`w-html-embed w-indicator-icon-1`}
                />
              </SelectItemIndicator>
              <SelectItemText className={`w-item-text`}>
                {"Dark"}
              </SelectItemText>
            </SelectItem>
            <SelectItem
              value={"system"}
              className={`w-select-item w-select-item-3`}
            >
              <SelectItemIndicator className={`w-indicator w-indicator-3`}>
                <HtmlEmbed
                  code={
                    '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 16 16" width="100%" height="100%" style="display: block;"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.091" d="m13.636 3.667-8 8L2 8.03"/></svg>'
                  }
                  className={`w-html-embed w-indicator-icon-2`}
                />
              </SelectItemIndicator>
              <SelectItemText className={`w-item-text`}>
                {"System"}
              </SelectItemText>
            </SelectItem>
          </SelectViewport>
        </SelectContent>
      </Select>
    </Box>
  );
};

export default {
  title: "Components/Select",
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
  div.w-select-content {
    box-sizing: border-box
  }
  div.w-select-item {
    box-sizing: border-box
  }
  span.w-indicator {
    box-sizing: border-box
  }
  span.w-item-text {
    box-sizing: border-box
  }
  button.w-select-trigger {
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
  span.w-value {
    box-sizing: border-box
  }
  div.w-select-viewport {
    box-sizing: border-box
  }
}
@media all {
  .w-select-trigger-1 {
    display: flex;
    height: 2.5rem;
    width: 100%;
    align-items: center;
    justify-content: space-between;
    border-top-left-radius: 0.375rem;
    border-top-right-radius: 0.375rem;
    border-bottom-right-radius: 0.375rem;
    border-bottom-left-radius: 0.375rem;
    background-color: rgb(255 255 255 / 1);
    padding-top: 0.5rem;
    padding-right: 0.75rem;
    padding-bottom: 0.5rem;
    padding-left: 0.75rem;
    font-size: 0.875rem;
    line-height: 1.25rem;
    border: 1px solid rgb(226 232 240 / 1)
  }
  .w-select-trigger-1::placeholder {
    color: rgb(100 116 139 / 1)
  }
  .w-select-trigger-1:disabled {
    cursor: not-allowed;
    opacity: 0.5
  }
  .w-select-trigger-1:focus-visible {
    box-shadow: 0 0 0 2px rgb(255 255 255 / 1), 0 0 0 calc(2px + 2px) rgb(148,163,184);
    outline: medium none currentcolor
  }
  .w-select-content-1 {
    position: relative;
    z-index: 50;
    min-width: 8rem;
    overflow-x: hidden;
    overflow-y: hidden;
    border-top-left-radius: 0.375rem;
    border-top-right-radius: 0.375rem;
    border-bottom-right-radius: 0.375rem;
    border-bottom-left-radius: 0.375rem;
    background-color: rgb(255 255 255 / 1);
    color: rgb(2 8 23 / 1);
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
    border: 1px solid rgb(226 232 240 / 1)
  }
  .w-select-viewport-1 {
    height: var(--radix-select-trigger-height);
    width: 100%;
    min-width: var(--radix-select-trigger-width);
    padding: 0.25rem
  }
  .w-select-item-1 {
    position: relative;
    display: flex;
    width: 100%;
    cursor: default;
    -webkit-user-select: none;
    user-select: none;
    align-items: center;
    border-top-left-radius: 0.375rem;
    border-top-right-radius: 0.375rem;
    border-bottom-right-radius: 0.375rem;
    border-bottom-left-radius: 0.375rem;
    padding-top: 0.375rem;
    padding-right: 0.5rem;
    padding-bottom: 0.375rem;
    padding-left: 2rem;
    font-size: 0.875rem;
    line-height: 1.25rem;
    outline: medium none currentcolor
  }
  .w-select-item-1:focus {
    background-color: rgb(241 245 249 / 1);
    color: rgb(15 23 42 / 1)
  }
  .w-select-item-1[data-disabled] {
    pointer-events: none;
    opacity: 0.5
  }
  .w-indicator-1 {
    position: absolute;
    left: 0.5rem;
    display: flex;
    height: 0.875rem;
    width: 0.875rem;
    align-items: center;
    justify-content: center
  }
  .w-indicator-icon {
    display: block;
    width: 100%;
    height: 100%;
    line-height: 0
  }
  .w-select-item-2 {
    position: relative;
    display: flex;
    width: 100%;
    cursor: default;
    -webkit-user-select: none;
    user-select: none;
    align-items: center;
    border-top-left-radius: 0.375rem;
    border-top-right-radius: 0.375rem;
    border-bottom-right-radius: 0.375rem;
    border-bottom-left-radius: 0.375rem;
    padding-top: 0.375rem;
    padding-right: 0.5rem;
    padding-bottom: 0.375rem;
    padding-left: 2rem;
    font-size: 0.875rem;
    line-height: 1.25rem;
    outline: medium none currentcolor
  }
  .w-select-item-2:focus {
    background-color: rgb(241 245 249 / 1);
    color: rgb(15 23 42 / 1)
  }
  .w-select-item-2[data-disabled] {
    pointer-events: none;
    opacity: 0.5
  }
  .w-indicator-2 {
    position: absolute;
    left: 0.5rem;
    display: flex;
    height: 0.875rem;
    width: 0.875rem;
    align-items: center;
    justify-content: center
  }
  .w-indicator-icon-1 {
    display: block;
    width: 100%;
    height: 100%;
    line-height: 0
  }
  .w-select-item-3 {
    position: relative;
    display: flex;
    width: 100%;
    cursor: default;
    -webkit-user-select: none;
    user-select: none;
    align-items: center;
    border-top-left-radius: 0.375rem;
    border-top-right-radius: 0.375rem;
    border-bottom-right-radius: 0.375rem;
    border-bottom-left-radius: 0.375rem;
    padding-top: 0.375rem;
    padding-right: 0.5rem;
    padding-bottom: 0.375rem;
    padding-left: 2rem;
    font-size: 0.875rem;
    line-height: 1.25rem;
    outline: medium none currentcolor
  }
  .w-select-item-3:focus {
    background-color: rgb(241 245 249 / 1);
    color: rgb(15 23 42 / 1)
  }
  .w-select-item-3[data-disabled] {
    pointer-events: none;
    opacity: 0.5
  }
  .w-indicator-3 {
    position: absolute;
    left: 0.5rem;
    display: flex;
    height: 0.875rem;
    width: 0.875rem;
    align-items: center;
    justify-content: center
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

export { Story as Select };
