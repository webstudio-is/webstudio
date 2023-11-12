import { type ReactNode, useState } from "react";
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

const Page = (props: { scripts?: ReactNode }) => {
  let [selectValue, set$selectValue] = useState<any>("");
  let [selectOpen, set$selectOpen] = useState<any>(false);
  let onValueChange = (value: any) => {
    selectValue = value;
    set$selectValue(selectValue);
  };
  let onOpenChange = (open: any) => {
    selectOpen = open;
    set$selectOpen(selectOpen);
  };
  return (
    <Box data-ws-id="root" data-ws-component="Box">
      <Select
        data-ws-id="1"
        data-ws-component="Select"
        value={selectValue}
        onValueChange={onValueChange}
        open={selectOpen}
        onOpenChange={onOpenChange}
      >
        <SelectTrigger data-ws-id="8" data-ws-component="SelectTrigger">
          <SelectValue
            data-ws-id="10"
            data-ws-component="SelectValue"
            placeholder={"Theme"}
          />
        </SelectTrigger>
        <SelectContent data-ws-id="12" data-ws-component="SelectContent">
          <SelectViewport data-ws-id="14" data-ws-component="SelectViewport">
            <SelectItem
              data-ws-id="16"
              data-ws-component="SelectItem"
              value={"light"}
            >
              <SelectItemIndicator
                data-ws-id="19"
                data-ws-component="SelectItemIndicator"
              >
                <HtmlEmbed
                  data-ws-id="21"
                  data-ws-component="HtmlEmbed"
                  code={
                    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width="100%" height="100%" style="display: block;"><path fill-rule="evenodd" d="M11.957 5.043a1 1 0 0 1 0 1.414l-4.5 4.5a1 1 0 0 1-1.414 0l-2-2a1 1 0 0 1 1.414-1.414L6.75 8.836l3.793-3.793a1 1 0 0 1 1.414 0Z" clip-rule="evenodd"/></svg>'
                  }
                />
              </SelectItemIndicator>
              <SelectItemText
                data-ws-id="23"
                data-ws-component="SelectItemText"
              >
                {"Light"}
              </SelectItemText>
            </SelectItem>
            <SelectItem
              data-ws-id="24"
              data-ws-component="SelectItem"
              value={"dark"}
            >
              <SelectItemIndicator
                data-ws-id="27"
                data-ws-component="SelectItemIndicator"
              >
                <HtmlEmbed
                  data-ws-id="29"
                  data-ws-component="HtmlEmbed"
                  code={
                    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width="100%" height="100%" style="display: block;"><path fill-rule="evenodd" d="M11.957 5.043a1 1 0 0 1 0 1.414l-4.5 4.5a1 1 0 0 1-1.414 0l-2-2a1 1 0 0 1 1.414-1.414L6.75 8.836l3.793-3.793a1 1 0 0 1 1.414 0Z" clip-rule="evenodd"/></svg>'
                  }
                />
              </SelectItemIndicator>
              <SelectItemText
                data-ws-id="31"
                data-ws-component="SelectItemText"
              >
                {"Dark"}
              </SelectItemText>
            </SelectItem>
            <SelectItem
              data-ws-id="32"
              data-ws-component="SelectItem"
              value={"system"}
            >
              <SelectItemIndicator
                data-ws-id="35"
                data-ws-component="SelectItemIndicator"
              >
                <HtmlEmbed
                  data-ws-id="37"
                  data-ws-component="HtmlEmbed"
                  code={
                    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width="100%" height="100%" style="display: block;"><path fill-rule="evenodd" d="M11.957 5.043a1 1 0 0 1 0 1.414l-4.5 4.5a1 1 0 0 1-1.414 0l-2-2a1 1 0 0 1 1.414-1.414L6.75 8.836l3.793-3.793a1 1 0 0 1 1.414 0Z" clip-rule="evenodd"/></svg>'
                  }
                />
              </SelectItemIndicator>
              <SelectItemText
                data-ws-id="39"
                data-ws-component="SelectItemText"
              >
                {"System"}
              </SelectItemText>
            </SelectItem>
          </SelectViewport>
        </SelectContent>
      </Select>
      {props.scripts}
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
  body:where([data-ws-component="Body"]) {
    margin-top: 0;
    margin-right: 0;
    margin-bottom: 0;
    margin-left: 0;
    font-family: Arial, Roboto, sans-serif;
    font-size: 16px;
    line-height: 1.2;
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale
  }
  div:where([data-ws-component="Box"]) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  address:where([data-ws-component="Box"]) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  article:where([data-ws-component="Box"]) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  aside:where([data-ws-component="Box"]) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  figure:where([data-ws-component="Box"]) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  footer:where([data-ws-component="Box"]) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  header:where([data-ws-component="Box"]) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  main:where([data-ws-component="Box"]) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  nav:where([data-ws-component="Box"]) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  section:where([data-ws-component="Box"]) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  button:where([data-ws-component="SelectTrigger"]) {
    font-family: inherit;
    font-size: 100%;
    line-height: 1.15;
    margin-top: 0;
    margin-right: 0;
    margin-bottom: 0;
    margin-left: 0;
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    text-transform: none
  }
  span:where([data-ws-component="SelectValue"]) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  div:where([data-ws-component="SelectContent"]) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  div:where([data-ws-component="SelectViewport"]) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  div:where([data-ws-component="SelectItem"]) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  span:where([data-ws-component="SelectItemIndicator"]) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  span:where([data-ws-component="SelectItemText"]) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
}
@media all {
  [data-ws-id="8"] {
    display: flex;
    height: 2.5rem;
    width: 100%;
    align-items: center;
    justify-content: space-between;
    border-top-left-radius: 0.375rem;
    border-top-right-radius: 0.375rem;
    border-bottom-right-radius: 0.375rem;
    border-bottom-left-radius: 0.375rem;
    border-top-style: solid;
    border-right-style: solid;
    border-bottom-style: solid;
    border-left-style: solid;
    border-top-color: rgba(226, 232, 240, 1);
    border-right-color: rgba(226, 232, 240, 1);
    border-bottom-color: rgba(226, 232, 240, 1);
    border-left-color: rgba(226, 232, 240, 1);
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    background-color: rgba(255, 255, 255, 0.8);
    padding-left: 0.75rem;
    padding-right: 0.75rem;
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
    font-size: 0.875rem;
    line-height: 1.25rem
  }
  [data-ws-id="8"]::placeholder {
    color: rgba(100, 116, 139, 1)
  }
  [data-ws-id="8"]:focus {
    outline-width: 2px;
    outline-style: solid;
    outline-color: transparent;
    outline-offset: 2px;
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.8), 0 0 0 4px rgba(148, 163, 184, 1)
  }
  [data-ws-id="8"]:disabled {
    cursor: not-allowed;
    opacity: 0.5
  }
  [data-ws-id="12"] {
    position: relative;
    z-index: 50;
    min-width: 8rem;
    overflow: hidden;
    border-top-left-radius: 0.375rem;
    border-top-right-radius: 0.375rem;
    border-bottom-right-radius: 0.375rem;
    border-bottom-left-radius: 0.375rem;
    border-top-style: solid;
    border-right-style: solid;
    border-bottom-style: solid;
    border-left-style: solid;
    border-top-color: rgba(226, 232, 240, 1);
    border-right-color: rgba(226, 232, 240, 1);
    border-bottom-color: rgba(226, 232, 240, 1);
    border-left-color: rgba(226, 232, 240, 1);
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    background-color: rgba(255, 255, 255, 1);
    color: rgba(2, 8, 23, 1);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)
  }
  [data-ws-id="14"] {
    padding-left: 0.25rem;
    padding-right: 0.25rem;
    padding-top: 0.25rem;
    padding-bottom: 0.25rem;
    height: var(--radix-select-trigger-height);
    width: 100%;
    min-width: var(--radix-select-trigger-width)
  }
  [data-ws-id="16"] {
    position: relative;
    display: flex;
    width: 100%;
    cursor: default;
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
    outline-width: 2px;
    outline-style: solid;
    outline-color: transparent;
    outline-offset: 2px
  }
  [data-ws-id="16"]:focus {
    background-color: rgba(241, 245, 249, 0.9);
    color: rgba(15, 23, 42, 1)
  }
  [data-ws-id="16"][data-disabled] {
    pointer-events: none;
    opacity: 0.5
  }
  [data-ws-id="19"] {
    position: absolute;
    left: 0.5rem;
    display: flex;
    height: 0.875rem;
    width: 0.875rem;
    align-items: center;
    justify-content: center
  }
  [data-ws-id="24"] {
    position: relative;
    display: flex;
    width: 100%;
    cursor: default;
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
    outline-width: 2px;
    outline-style: solid;
    outline-color: transparent;
    outline-offset: 2px
  }
  [data-ws-id="24"]:focus {
    background-color: rgba(241, 245, 249, 0.9);
    color: rgba(15, 23, 42, 1)
  }
  [data-ws-id="24"][data-disabled] {
    pointer-events: none;
    opacity: 0.5
  }
  [data-ws-id="27"] {
    position: absolute;
    left: 0.5rem;
    display: flex;
    height: 0.875rem;
    width: 0.875rem;
    align-items: center;
    justify-content: center
  }
  [data-ws-id="32"] {
    position: relative;
    display: flex;
    width: 100%;
    cursor: default;
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
    outline-width: 2px;
    outline-style: solid;
    outline-color: transparent;
    outline-offset: 2px
  }
  [data-ws-id="32"]:focus {
    background-color: rgba(241, 245, 249, 0.9);
    color: rgba(15, 23, 42, 1)
  }
  [data-ws-id="32"][data-disabled] {
    pointer-events: none;
    opacity: 0.5
  }
  [data-ws-id="35"] {
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
        <Page />
      </>
    );
  },
};

export { Story as Select };
