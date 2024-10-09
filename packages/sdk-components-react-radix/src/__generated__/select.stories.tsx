import { useVariableState } from "@webstudio-is/react-sdk/runtime";
import {
  Box as Box,
  HtmlEmbed as HtmlEmbed,
} from "@webstudio-is/sdk-components-react";
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
  let [selectValue, set$selectValue] = useVariableState<any>("");
  return (
    <Box className={"w-box"}>
      <Select
        value={selectValue}
        onValueChange={(value: any) => {
          selectValue = value;
          set$selectValue(selectValue);
        }}
      >
        <SelectTrigger className={"w-select-trigger w-select-trigger-1"}>
          <SelectValue placeholder={"Theme"} className={"w-value"} />
        </SelectTrigger>
        <SelectContent className={"w-select-content w-select-content-1"}>
          <SelectViewport className={"w-select-viewport w-select-viewport-1"}>
            <SelectItem
              value={"light"}
              className={"w-select-item w-select-item-1"}
            >
              <SelectItemIndicator className={"w-indicator w-indicator-1"}>
                <HtmlEmbed
                  code={
                    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width="100%" height="100%" style="display: block;"><path fill-rule="evenodd" d="M11.957 5.043a1 1 0 0 1 0 1.414l-4.5 4.5a1 1 0 0 1-1.414 0l-2-2a1 1 0 0 1 1.414-1.414L6.75 8.836l3.793-3.793a1 1 0 0 1 1.414 0Z" clip-rule="evenodd"/></svg>'
                  }
                  className={"w-html-embed"}
                />
              </SelectItemIndicator>
              <SelectItemText className={"w-item-text"}>
                {"Light"}
              </SelectItemText>
            </SelectItem>
            <SelectItem
              value={"dark"}
              className={"w-select-item w-select-item-2"}
            >
              <SelectItemIndicator className={"w-indicator w-indicator-2"}>
                <HtmlEmbed
                  code={
                    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width="100%" height="100%" style="display: block;"><path fill-rule="evenodd" d="M11.957 5.043a1 1 0 0 1 0 1.414l-4.5 4.5a1 1 0 0 1-1.414 0l-2-2a1 1 0 0 1 1.414-1.414L6.75 8.836l3.793-3.793a1 1 0 0 1 1.414 0Z" clip-rule="evenodd"/></svg>'
                  }
                  className={"w-html-embed"}
                />
              </SelectItemIndicator>
              <SelectItemText className={"w-item-text"}>
                {"Dark"}
              </SelectItemText>
            </SelectItem>
            <SelectItem
              value={"system"}
              className={"w-select-item w-select-item-3"}
            >
              <SelectItemIndicator className={"w-indicator w-indicator-3"}>
                <HtmlEmbed
                  code={
                    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width="100%" height="100%" style="display: block;"><path fill-rule="evenodd" d="M11.957 5.043a1 1 0 0 1 0 1.414l-4.5 4.5a1 1 0 0 1-1.414 0l-2-2a1 1 0 0 1 1.414-1.414L6.75 8.836l3.793-3.793a1 1 0 0 1 1.414 0Z" clip-rule="evenodd"/></svg>'
                  }
                  className={"w-html-embed"}
                />
              </SelectItemIndicator>
              <SelectItemText className={"w-item-text"}>
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
  :where(button.w-select-trigger) {
    font-family: inherit;
    font-size: 100%;
    line-height: 1.15;
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    border-top-style: solid;
    border-right-style: solid;
    border-bottom-style: solid;
    border-left-style: solid;
    text-transform: none;
    margin: 0
  }
  :where(span.w-value) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  :where(div.w-select-content) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  :where(div.w-select-viewport) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  :where(div.w-select-item) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  :where(span.w-indicator) {
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
  :where(span.w-item-text) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
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
    background-color: rgba(255, 255, 255, 0.8);
    padding-left: 0.75rem;
    padding-right: 0.75rem;
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
    font-size: 0.875rem;
    line-height: 1.25rem;
    border: 1px solid rgba(226, 232, 240, 1)
  }
  .w-select-trigger-1::placeholder {
    color: rgba(100, 116, 139, 1)
  }
  .w-select-trigger-1:disabled {
    cursor: not-allowed;
    opacity: 0.5
  }
  .w-select-trigger-1:focus {
    outline-offset: 2px;
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.8), 0 0 0 4px rgba(148, 163, 184, 1);
    outline: 2px solid transparent
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
    background-color: rgba(255, 255, 255, 1);
    color: rgba(2, 8, 23, 1);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
    border: 1px solid rgba(226, 232, 240, 1)
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
    padding-bottom: 0.375rem;
    padding-left: 2rem;
    padding-right: 0.5rem;
    font-size: 0.875rem;
    line-height: 1.25rem;
    outline-offset: 2px;
    outline: 2px solid transparent
  }
  .w-select-item-1:focus {
    background-color: rgba(241, 245, 249, 0.9);
    color: rgba(15, 23, 42, 1)
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
    padding-bottom: 0.375rem;
    padding-left: 2rem;
    padding-right: 0.5rem;
    font-size: 0.875rem;
    line-height: 1.25rem;
    outline-offset: 2px;
    outline: 2px solid transparent
  }
  .w-select-item-2:focus {
    background-color: rgba(241, 245, 249, 0.9);
    color: rgba(15, 23, 42, 1)
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
    padding-bottom: 0.375rem;
    padding-left: 2rem;
    padding-right: 0.5rem;
    font-size: 0.875rem;
    line-height: 1.25rem;
    outline-offset: 2px;
    outline: 2px solid transparent
  }
  .w-select-item-3:focus {
    background-color: rgba(241, 245, 249, 0.9);
    color: rgba(15, 23, 42, 1)
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
}
      `}
        </style>
        <Component />
      </>
    );
  },
};

export { Story as Select };
