import { useState } from "react";
import { Box as Box } from "@webstudio-is/sdk-components-react";
import {
  Tabs as Tabs,
  TabsList as TabsList,
  TabsTrigger as TabsTrigger,
  TabsContent as TabsContent,
} from "../components";

type Params = Record<string, string | undefined>;
const Page = (_props: { params: Params }) => {
  let [tabsValue, set$tabsValue] = useState<any>("0");
  let onValueChange = (value: any) => {
    tabsValue = value;
    set$tabsValue(tabsValue);
  };
  return (
    <Box data-ws-id="root" data-ws-component="Box">
      <Tabs
        data-ws-id="1"
        data-ws-component="Tabs"
        value={tabsValue}
        onValueChange={onValueChange}
      >
        <TabsList data-ws-id="5" data-ws-component="TabsList">
          <TabsTrigger
            data-ws-id="7"
            data-ws-component="TabsTrigger"
            data-ws-index="0"
          >
            {"Account"}
          </TabsTrigger>
          <TabsTrigger
            data-ws-id="9"
            data-ws-component="TabsTrigger"
            data-ws-index="1"
          >
            {"Password"}
          </TabsTrigger>
        </TabsList>
        <TabsContent
          data-ws-id="11"
          data-ws-component="TabsContent"
          data-ws-index="0"
        >
          {"Make changes to your account here."}
        </TabsContent>
        <TabsContent
          data-ws-id="13"
          data-ws-component="TabsContent"
          data-ws-index="1"
        >
          {"Change your password here."}
        </TabsContent>
      </Tabs>
    </Box>
  );
};

export default {
  title: "Components/Tabs",
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
  div:where([data-ws-component="Tabs"]) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  div:where([data-ws-component="TabsList"]) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  button:where([data-ws-component="TabsTrigger"]) {
    font-family: inherit;
    font-size: 100%;
    line-height: 1.15;
    margin-top: 0;
    margin-right: 0;
    margin-bottom: 0;
    margin-left: 0;
    box-sizing: border-box;
    border-top-width: 0px;
    border-right-width: 0px;
    border-bottom-width: 0px;
    border-left-width: 0px;
    text-transform: none;
    background-color: transparent;
    background-image: none;
    border-top-style: solid;
    border-right-style: solid;
    border-bottom-style: solid;
    border-left-style: solid;
    border-top-color: rgba(226, 232, 240, 1);
    border-right-color: rgba(226, 232, 240, 1);
    border-bottom-color: rgba(226, 232, 240, 1);
    border-left-color: rgba(226, 232, 240, 1);
    padding-left: 0px;
    padding-right: 0px;
    padding-top: 0px;
    padding-bottom: 0px
  }
  div:where([data-ws-component="TabsContent"]) {
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
    display: inline-flex;
    height: 2.5rem;
    align-items: center;
    justify-content: center;
    border-top-left-radius: 0.375rem;
    border-top-right-radius: 0.375rem;
    border-bottom-right-radius: 0.375rem;
    border-bottom-left-radius: 0.375rem;
    background-color: rgba(241, 245, 249, 1);
    padding-left: 0.25rem;
    padding-right: 0.25rem;
    padding-top: 0.25rem;
    padding-bottom: 0.25rem;
    color: rgba(100, 116, 139, 1)
  }
  [data-ws-id="7"] {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    white-space: nowrap;
    border-top-left-radius: 0.375rem;
    border-top-right-radius: 0.375rem;
    border-bottom-right-radius: 0.375rem;
    border-bottom-left-radius: 0.375rem;
    padding-left: 0.75rem;
    padding-right: 0.75rem;
    padding-top: 0.375rem;
    padding-bottom: 0.375rem;
    font-size: 0.875rem;
    line-height: 1.25rem;
    font-weight: 500;
    transition-property: all;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 150ms
  }
  [data-ws-id="7"]:focus-visible {
    outline-width: 2px;
    outline-style: solid;
    outline-color: transparent;
    outline-offset: 2px;
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.8), 0 0 0 4px rgba(148, 163, 184, 1)
  }
  [data-ws-id="7"]:disabled {
    pointer-events: none;
    opacity: 0.5
  }
  [data-ws-id="7"][data-state=active] {
    background-color: rgba(255, 255, 255, 0.8);
    color: rgba(2, 8, 23, 1);
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05)
  }
  [data-ws-id="9"] {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    white-space: nowrap;
    border-top-left-radius: 0.375rem;
    border-top-right-radius: 0.375rem;
    border-bottom-right-radius: 0.375rem;
    border-bottom-left-radius: 0.375rem;
    padding-left: 0.75rem;
    padding-right: 0.75rem;
    padding-top: 0.375rem;
    padding-bottom: 0.375rem;
    font-size: 0.875rem;
    line-height: 1.25rem;
    font-weight: 500;
    transition-property: all;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 150ms
  }
  [data-ws-id="9"]:focus-visible {
    outline-width: 2px;
    outline-style: solid;
    outline-color: transparent;
    outline-offset: 2px;
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.8), 0 0 0 4px rgba(148, 163, 184, 1)
  }
  [data-ws-id="9"]:disabled {
    pointer-events: none;
    opacity: 0.5
  }
  [data-ws-id="9"][data-state=active] {
    background-color: rgba(255, 255, 255, 0.8);
    color: rgba(2, 8, 23, 1);
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05)
  }
  [data-ws-id="11"] {
    margin-top: 0.5rem
  }
  [data-ws-id="11"]:focus-visible {
    outline-width: 2px;
    outline-style: solid;
    outline-color: transparent;
    outline-offset: 2px;
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.8), 0 0 0 4px rgba(148, 163, 184, 1)
  }
  [data-ws-id="13"] {
    margin-top: 0.5rem
  }
  [data-ws-id="13"]:focus-visible {
    outline-width: 2px;
    outline-style: solid;
    outline-color: transparent;
    outline-offset: 2px;
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.8), 0 0 0 4px rgba(148, 163, 184, 1)
  }
}
      `}
        </style>
        <Page params={{}} />
      </>
    );
  },
};

export { Story as Tabs };
