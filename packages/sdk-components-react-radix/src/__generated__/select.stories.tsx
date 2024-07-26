import { useState } from "react";
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
  let [selectValue, set$selectValue] = useState<any>("");
  return (
    <Box data-ws-id="root" data-ws-component="Box" className="w-box">
      <Select
        data-ws-id="1"
        data-ws-component="Select"
        value={selectValue}
        onValueChange={(value: any) => {
          selectValue = value;
          set$selectValue(selectValue);
        }}
      >
        <SelectTrigger
          data-ws-id="5"
          data-ws-component="SelectTrigger"
          className="w-select-trigger"
        >
          <SelectValue
            data-ws-id="7"
            data-ws-component="SelectValue"
            placeholder={"Theme"}
            className="w-select-value"
          />
        </SelectTrigger>
        <SelectContent
          data-ws-id="9"
          data-ws-component="SelectContent"
          className="w-select-content"
        >
          <SelectViewport
            data-ws-id="11"
            data-ws-component="SelectViewport"
            className="w-select-viewport"
          >
            <SelectItem
              data-ws-id="13"
              data-ws-component="SelectItem"
              value={"light"}
              className="w-select-item"
            >
              <SelectItemIndicator
                data-ws-id="16"
                data-ws-component="SelectItemIndicator"
                className="w-select-item-indicator"
              >
                <HtmlEmbed
                  data-ws-id="18"
                  data-ws-component="HtmlEmbed"
                  code={
                    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width="100%" height="100%" style="display: block;"><path fill-rule="evenodd" d="M11.957 5.043a1 1 0 0 1 0 1.414l-4.5 4.5a1 1 0 0 1-1.414 0l-2-2a1 1 0 0 1 1.414-1.414L6.75 8.836l3.793-3.793a1 1 0 0 1 1.414 0Z" clip-rule="evenodd"/></svg>'
                  }
                  className="w-html-embed"
                />
              </SelectItemIndicator>
              <SelectItemText
                data-ws-id="20"
                data-ws-component="SelectItemText"
                className="w-select-item-text"
              >
                {"Light"}
              </SelectItemText>
            </SelectItem>
            <SelectItem
              data-ws-id="21"
              data-ws-component="SelectItem"
              value={"dark"}
              className="w-select-item"
            >
              <SelectItemIndicator
                data-ws-id="24"
                data-ws-component="SelectItemIndicator"
                className="w-select-item-indicator"
              >
                <HtmlEmbed
                  data-ws-id="26"
                  data-ws-component="HtmlEmbed"
                  code={
                    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width="100%" height="100%" style="display: block;"><path fill-rule="evenodd" d="M11.957 5.043a1 1 0 0 1 0 1.414l-4.5 4.5a1 1 0 0 1-1.414 0l-2-2a1 1 0 0 1 1.414-1.414L6.75 8.836l3.793-3.793a1 1 0 0 1 1.414 0Z" clip-rule="evenodd"/></svg>'
                  }
                  className="w-html-embed"
                />
              </SelectItemIndicator>
              <SelectItemText
                data-ws-id="28"
                data-ws-component="SelectItemText"
                className="w-select-item-text"
              >
                {"Dark"}
              </SelectItemText>
            </SelectItem>
            <SelectItem
              data-ws-id="29"
              data-ws-component="SelectItem"
              value={"system"}
              className="w-select-item"
            >
              <SelectItemIndicator
                data-ws-id="32"
                data-ws-component="SelectItemIndicator"
                className="w-select-item-indicator"
              >
                <HtmlEmbed
                  data-ws-id="34"
                  data-ws-component="HtmlEmbed"
                  code={
                    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width="100%" height="100%" style="display: block;"><path fill-rule="evenodd" d="M11.957 5.043a1 1 0 0 1 0 1.414l-4.5 4.5a1 1 0 0 1-1.414 0l-2-2a1 1 0 0 1 1.414-1.414L6.75 8.836l3.793-3.793a1 1 0 0 1 1.414 0Z" clip-rule="evenodd"/></svg>'
                  }
                  className="w-html-embed"
                />
              </SelectItemIndicator>
              <SelectItemText
                data-ws-id="36"
                data-ws-component="SelectItemText"
                className="w-select-item-text"
              >
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
html {margin: 0; display: grid; min-height: 100%}
@media all {
  :where(body.w-body) {
    font-family: Arial, Roboto, sans-serif;
    font-size: 16px;
    line-height: 1.2;
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
  :where(span.w-select-value) {
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
  :where(span.w-select-item-indicator) {
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
  :where(span.w-select-item-text) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
}
@media all {
  [data-ws-id="5"] {
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
  [data-ws-id="5"]::placeholder {
    color: rgba(100, 116, 139, 1)
  }
  [data-ws-id="5"]:disabled {
    cursor: not-allowed;
    opacity: 0.5
  }
  [data-ws-id="5"]:focus {
    outline-offset: 2px;
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.8), 0 0 0 4px rgba(148, 163, 184, 1);
    outline: 2px solid transparent
  }
  [data-ws-id="9"] {
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
  [data-ws-id="11"] {
    height: var(--radix-select-trigger-height);
    width: 100%;
    min-width: var(--radix-select-trigger-width);
    padding: 0.25rem
  }
  [data-ws-id="13"] {
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
  [data-ws-id="13"]:focus {
    background-color: rgba(241, 245, 249, 0.9);
    color: rgba(15, 23, 42, 1)
  }
  [data-ws-id="13"][data-disabled] {
    pointer-events: none;
    opacity: 0.5
  }
  [data-ws-id="16"] {
    position: absolute;
    left: 0.5rem;
    display: flex;
    height: 0.875rem;
    width: 0.875rem;
    align-items: center;
    justify-content: center
  }
  [data-ws-id="21"] {
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
  [data-ws-id="21"]:focus {
    background-color: rgba(241, 245, 249, 0.9);
    color: rgba(15, 23, 42, 1)
  }
  [data-ws-id="21"][data-disabled] {
    pointer-events: none;
    opacity: 0.5
  }
  [data-ws-id="24"] {
    position: absolute;
    left: 0.5rem;
    display: flex;
    height: 0.875rem;
    width: 0.875rem;
    align-items: center;
    justify-content: center
  }
  [data-ws-id="29"] {
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
  [data-ws-id="29"]:focus {
    background-color: rgba(241, 245, 249, 0.9);
    color: rgba(15, 23, 42, 1)
  }
  [data-ws-id="29"][data-disabled] {
    pointer-events: none;
    opacity: 0.5
  }
  [data-ws-id="32"] {
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
