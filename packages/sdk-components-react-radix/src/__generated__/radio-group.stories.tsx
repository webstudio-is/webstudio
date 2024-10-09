import { useVariableState } from "@webstudio-is/react-sdk/runtime";
import {
  Box as Box,
  HtmlEmbed as HtmlEmbed,
  Text as Text,
} from "@webstudio-is/sdk-components-react";
import {
  RadioGroup as RadioGroup,
  Label as Label,
  RadioGroupItem as RadioGroupItem,
  RadioGroupIndicator as RadioGroupIndicator,
} from "../components";

const Component = () => {
  let [radioGroupValue, set$radioGroupValue] = useVariableState<any>("");
  return (
    <Box className={"w-box"}>
      <RadioGroup
        value={radioGroupValue}
        onValueChange={(value: any) => {
          radioGroupValue = value;
          set$radioGroupValue(radioGroupValue);
        }}
        className={"w-radio-group w-radio-group-1"}
      >
        <Label className={"w-label w-label-1"}>
          <RadioGroupItem
            value={"default"}
            className={"w-radio-group-item w-radio-group-item-1"}
          >
            <RadioGroupIndicator className={"w-radio-group-indicator"}>
              <HtmlEmbed
                code={
                  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width="100%" height="100%" style="display: block;"><path d="M8 5.35a2.65 2.65 0 1 0 0 5.3 2.65 2.65 0 0 0 0-5.3Z"/></svg>'
                }
                className={"w-html-embed"}
              />
            </RadioGroupIndicator>
          </RadioGroupItem>
          <Text className={"w-text"}>{"Default"}</Text>
        </Label>
        <Label className={"w-label w-label-2"}>
          <RadioGroupItem
            value={"comfortable"}
            className={"w-radio-group-item w-radio-group-item-2"}
          >
            <RadioGroupIndicator className={"w-radio-group-indicator"}>
              <HtmlEmbed
                code={
                  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width="100%" height="100%" style="display: block;"><path d="M8 5.35a2.65 2.65 0 1 0 0 5.3 2.65 2.65 0 0 0 0-5.3Z"/></svg>'
                }
                className={"w-html-embed"}
              />
            </RadioGroupIndicator>
          </RadioGroupItem>
          <Text className={"w-text"}>{"Comfortable"}</Text>
        </Label>
        <Label className={"w-label w-label-3"}>
          <RadioGroupItem
            value={"compact"}
            className={"w-radio-group-item w-radio-group-item-3"}
          >
            <RadioGroupIndicator className={"w-radio-group-indicator"}>
              <HtmlEmbed
                code={
                  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width="100%" height="100%" style="display: block;"><path d="M8 5.35a2.65 2.65 0 1 0 0 5.3 2.65 2.65 0 0 0 0-5.3Z"/></svg>'
                }
                className={"w-html-embed"}
              />
            </RadioGroupIndicator>
          </RadioGroupItem>
          <Text className={"w-text"}>{"Compact"}</Text>
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
@media all {
  :where(body.w-body) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    margin: 0
  }
  :where(div.w-box) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  :where(address.w-box) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  :where(article.w-box) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  :where(aside.w-box) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  :where(figure.w-box) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  :where(footer.w-box) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  :where(header.w-box) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  :where(main.w-box) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  :where(nav.w-box) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  :where(section.w-box) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  :where(div.w-radio-group) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  :where(label.w-label) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  :where(button.w-radio-group-item) {
    font-family: inherit;
    font-size: 100%;
    line-height: 1.15;
    box-sizing: border-box;
    text-transform: none;
    background-color: transparent;
    background-image: none;
    border: 0px solid rgba(226, 232, 240, 1);
    margin: 0;
    padding: 0px
  }
  :where(span.w-radio-group-indicator) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  :where(div.w-html-embed) {
    display: contents
  }
  :where(div.w-text) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px;
    min-height: 1em
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
    aspect-ratio: 1 / 1;
    height: 1rem;
    width: 1rem;
    border-top-left-radius: 9999px;
    border-top-right-radius: 9999px;
    border-bottom-right-radius: 9999px;
    border-bottom-left-radius: 9999px;
    color: rgba(15, 23, 42, 1);
    border: 1px solid rgba(15, 23, 42, 1)
  }
  .w-radio-group-item-1:disabled {
    cursor: not-allowed;
    opacity: 0.5
  }
  .w-radio-group-item-1:focus-visible {
    outline-offset: 2px;
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.8), 0 0 0 4px rgba(148, 163, 184, 1);
    outline: 2px solid transparent
  }
  .w-label-2 {
    display: flex;
    align-items: center;
    row-gap: 0.5rem;
    column-gap: 0.5rem
  }
  .w-radio-group-item-2 {
    aspect-ratio: 1 / 1;
    height: 1rem;
    width: 1rem;
    border-top-left-radius: 9999px;
    border-top-right-radius: 9999px;
    border-bottom-right-radius: 9999px;
    border-bottom-left-radius: 9999px;
    color: rgba(15, 23, 42, 1);
    border: 1px solid rgba(15, 23, 42, 1)
  }
  .w-radio-group-item-2:disabled {
    cursor: not-allowed;
    opacity: 0.5
  }
  .w-radio-group-item-2:focus-visible {
    outline-offset: 2px;
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.8), 0 0 0 4px rgba(148, 163, 184, 1);
    outline: 2px solid transparent
  }
  .w-label-3 {
    display: flex;
    align-items: center;
    row-gap: 0.5rem;
    column-gap: 0.5rem
  }
  .w-radio-group-item-3 {
    aspect-ratio: 1 / 1;
    height: 1rem;
    width: 1rem;
    border-top-left-radius: 9999px;
    border-top-right-radius: 9999px;
    border-bottom-right-radius: 9999px;
    border-bottom-left-radius: 9999px;
    color: rgba(15, 23, 42, 1);
    border: 1px solid rgba(15, 23, 42, 1)
  }
  .w-radio-group-item-3:disabled {
    cursor: not-allowed;
    opacity: 0.5
  }
  .w-radio-group-item-3:focus-visible {
    outline-offset: 2px;
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.8), 0 0 0 4px rgba(148, 163, 184, 1);
    outline: 2px solid transparent
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
