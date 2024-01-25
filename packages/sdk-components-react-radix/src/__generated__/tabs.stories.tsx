import { useState } from "react";
import { Box as Box } from "@webstudio-is/sdk-components-react";
import {
  Tabs as Tabs,
  TabsList as TabsList,
  TabsTrigger as TabsTrigger,
  TabsContent as TabsContent,
} from "../components";

const Component = () => {
  let [tabsValue, set$tabsValue] = useState<any>("0");
  return (
    <Box data-ws-id="root" data-ws-component="Box">
      <Tabs
        data-ws-id="1"
        data-ws-component="Tabs"
        value={tabsValue}
        onValueChange={(value: any) => {
          tabsValue = value;
          set$tabsValue(tabsValue);
        }}
      >
        <TabsList
          data-ws-id="5"
          data-ws-component="TabsList"
          className="c1oai8p0 c18kkil clo3r8o cw9oyzl cuqxbts cg19ih8 c1479lj6 comq4ym c1xf120q c1tn9z53 c164ur30 c1ukzx8x c1wau4tj c1pcz91e"
        >
          <TabsTrigger
            data-ws-id="7"
            data-ws-component="TabsTrigger"
            data-ws-index="0"
            className="c1oai8p0 clo3r8o cw9oyzl c1kiukeb cuqxbts cg19ih8 c1479lj6 comq4ym c16g5416 c111au61 ck4c8na c1mbhour c1qx3pju cut8gip c1qjvju3 cpr3ke2 c1wmnqxw c1b503n2 co0lfwl c1kn3u98 c2odgnt chlvjga c1jx7vpr c1jirpm3 ce92j53 cvo3yl7 cec8597 c5vtmxr"
          >
            {"Account"}
          </TabsTrigger>
          <TabsTrigger
            data-ws-id="9"
            data-ws-component="TabsTrigger"
            data-ws-index="1"
            className="c1oai8p0 clo3r8o cw9oyzl c1kiukeb cuqxbts cg19ih8 c1479lj6 comq4ym c16g5416 c111au61 ck4c8na c1mbhour c1qx3pju cut8gip c1qjvju3 cpr3ke2 c1wmnqxw c1b503n2 co0lfwl c1kn3u98 c2odgnt chlvjga c1jx7vpr c1jirpm3 ce92j53 cvo3yl7 cec8597 c5vtmxr"
          >
            {"Password"}
          </TabsTrigger>
        </TabsList>
        <TabsContent
          data-ws-id="11"
          data-ws-component="TabsContent"
          data-ws-index="0"
          className="c1uybxzr co0lfwl c1kn3u98 c2odgnt chlvjga c1jx7vpr"
        >
          {"Make changes to your account here."}
        </TabsContent>
        <TabsContent
          data-ws-id="13"
          data-ws-component="TabsContent"
          data-ws-index="1"
          className="c1uybxzr co0lfwl c1kn3u98 c2odgnt chlvjga c1jx7vpr"
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
}@media all {
  .c1oai8p0 {
    display: inline-flex
  }
  .c18kkil {
    height: 2.5rem
  }
  .clo3r8o {
    align-items: center
  }
  .cw9oyzl {
    justify-content: center
  }
  .cuqxbts {
    border-top-left-radius: 0.375rem
  }
  .cg19ih8 {
    border-top-right-radius: 0.375rem
  }
  .c1479lj6 {
    border-bottom-right-radius: 0.375rem
  }
  .comq4ym {
    border-bottom-left-radius: 0.375rem
  }
  .c1xf120q {
    background-color: rgba(241, 245, 249, 1)
  }
  .c1tn9z53 {
    padding-left: 0.25rem
  }
  .c164ur30 {
    padding-right: 0.25rem
  }
  .c1ukzx8x {
    padding-top: 0.25rem
  }
  .c1wau4tj {
    padding-bottom: 0.25rem
  }
  .c1pcz91e {
    color: rgba(100, 116, 139, 1)
  }
  .c1kiukeb {
    white-space: nowrap
  }
  .c16g5416 {
    padding-left: 0.75rem
  }
  .c111au61 {
    padding-right: 0.75rem
  }
  .ck4c8na {
    padding-top: 0.375rem
  }
  .c1mbhour {
    padding-bottom: 0.375rem
  }
  .c1qx3pju {
    font-size: 0.875rem
  }
  .cut8gip {
    line-height: 1.25rem
  }
  .c1qjvju3 {
    font-weight: 500
  }
  .cpr3ke2 {
    transition-property: all
  }
  .c1wmnqxw {
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1)
  }
  .c1b503n2 {
    transition-duration: 150ms
  }
  .co0lfwl:focus-visible {
    outline-width: 2px
  }
  .c1kn3u98:focus-visible {
    outline-style: solid
  }
  .c2odgnt:focus-visible {
    outline-color: transparent
  }
  .chlvjga:focus-visible {
    outline-offset: 2px
  }
  .c1jx7vpr:focus-visible {
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.8), 0 0 0 4px rgba(148, 163, 184, 1)
  }
  .c1jirpm3:disabled {
    pointer-events: none
  }
  .ce92j53:disabled {
    opacity: 0.5
  }
  .cvo3yl7[data-state=active] {
    background-color: rgba(255, 255, 255, 0.8)
  }
  .cec8597[data-state=active] {
    color: rgba(2, 8, 23, 1)
  }
  .c5vtmxr[data-state=active] {
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05)
  }
  .c1uybxzr {
    margin-top: 0.5rem
  }
}
      `}
        </style>
        <Component />
      </>
    );
  },
};

export { Story as Tabs };
