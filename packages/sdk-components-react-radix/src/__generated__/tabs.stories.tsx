import { useState } from "react";
import { Box as Box } from "@webstudio-is/sdk-components-react";
import {
  Tabs as Tabs,
  TabsList as TabsList,
  TabsTrigger as TabsTrigger,
  TabsContent as TabsContent,
} from "../components";

type Params = Record<string, string | undefined>;
type Resources = Record<string, unknown>;
const Page = (_props: { params: Params; resources: Resources }) => {
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
        <TabsList
          data-ws-id="5"
          data-ws-component="TabsList"
          className="c1mnuzt9 c1b8xvex c4v7k5r cvzkkb6 cym38jd cqimob0 c2tr68t cjdtj3f cqcyl9r ckc6u2x cue5i4p c1wiz3di c1364qo7 caa8yt3"
        >
          <TabsTrigger
            data-ws-id="7"
            data-ws-component="TabsTrigger"
            data-ws-index="0"
            className="c1mnuzt9 c4v7k5r cvzkkb6 cwmcr0n cym38jd cqimob0 c2tr68t cjdtj3f c1kc4g4w c1hi2fgx cs5tzic cl10cx8 c1mfk609 c121vm9z cwry1sa cu8n5i6 cqhjzs2 cxcp0y5 c1t6bql4 czph7hf cncn1ro cb270vo c1rgsd1l c1srwcmr c1grhw0w cz3we07 c18pp6i cww7dfg"
          >
            {"Account"}
          </TabsTrigger>
          <TabsTrigger
            data-ws-id="9"
            data-ws-component="TabsTrigger"
            data-ws-index="1"
            className="c1mnuzt9 c4v7k5r cvzkkb6 cwmcr0n cym38jd cqimob0 c2tr68t cjdtj3f c1kc4g4w c1hi2fgx cs5tzic cl10cx8 c1mfk609 c121vm9z cwry1sa cu8n5i6 cqhjzs2 cxcp0y5 c1t6bql4 czph7hf cncn1ro cb270vo c1rgsd1l c1srwcmr c1grhw0w cz3we07 c18pp6i cww7dfg"
          >
            {"Password"}
          </TabsTrigger>
        </TabsList>
        <TabsContent
          data-ws-id="11"
          data-ws-component="TabsContent"
          data-ws-index="0"
          className="c1culj6 c1t6bql4 czph7hf cncn1ro cb270vo c1rgsd1l"
        >
          {"Make changes to your account here."}
        </TabsContent>
        <TabsContent
          data-ws-id="13"
          data-ws-component="TabsContent"
          data-ws-index="1"
          className="c1culj6 c1t6bql4 czph7hf cncn1ro cb270vo c1rgsd1l"
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
  .c1mnuzt9 {
    display: inline-flex
  }
  .c1b8xvex {
    height: 2.5rem
  }
  .c4v7k5r {
    align-items: center
  }
  .cvzkkb6 {
    justify-content: center
  }
  .cym38jd {
    border-top-left-radius: 0.375rem
  }
  .cqimob0 {
    border-top-right-radius: 0.375rem
  }
  .c2tr68t {
    border-bottom-right-radius: 0.375rem
  }
  .cjdtj3f {
    border-bottom-left-radius: 0.375rem
  }
  .cqcyl9r {
    background-color: rgba(241, 245, 249, 1)
  }
  .ckc6u2x {
    padding-left: 0.25rem
  }
  .cue5i4p {
    padding-right: 0.25rem
  }
  .c1wiz3di {
    padding-top: 0.25rem
  }
  .c1364qo7 {
    padding-bottom: 0.25rem
  }
  .caa8yt3 {
    color: rgba(100, 116, 139, 1)
  }
  .c4v7k5r {
    align-items: center
  }
  .cvzkkb6 {
    justify-content: center
  }
  .cwmcr0n {
    white-space: nowrap
  }
  .cym38jd {
    border-top-left-radius: 0.375rem
  }
  .cqimob0 {
    border-top-right-radius: 0.375rem
  }
  .c2tr68t {
    border-bottom-right-radius: 0.375rem
  }
  .cjdtj3f {
    border-bottom-left-radius: 0.375rem
  }
  .c1kc4g4w {
    padding-left: 0.75rem
  }
  .c1hi2fgx {
    padding-right: 0.75rem
  }
  .cs5tzic {
    padding-top: 0.375rem
  }
  .cl10cx8 {
    padding-bottom: 0.375rem
  }
  .c1mfk609 {
    font-size: 0.875rem
  }
  .c121vm9z {
    line-height: 1.25rem
  }
  .cwry1sa {
    font-weight: 500
  }
  .cu8n5i6 {
    transition-property: all
  }
  .cqhjzs2 {
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1)
  }
  .cxcp0y5 {
    transition-duration: 150ms
  }
  .c1t6bql4:focus-visible {
    outline-width: 2px
  }
  .czph7hf:focus-visible {
    outline-style: solid
  }
  .cncn1ro:focus-visible {
    outline-color: transparent
  }
  .cb270vo:focus-visible {
    outline-offset: 2px
  }
  .c1rgsd1l:focus-visible {
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.8), 0 0 0 4px rgba(148, 163, 184, 1)
  }
  .c1srwcmr:disabled {
    pointer-events: none
  }
  .c1grhw0w:disabled {
    opacity: 0.5
  }
  .cz3we07[data-state=active] {
    background-color: rgba(255, 255, 255, 0.8)
  }
  .c18pp6i[data-state=active] {
    color: rgba(2, 8, 23, 1)
  }
  .cww7dfg[data-state=active] {
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05)
  }
  .c4v7k5r {
    align-items: center
  }
  .cvzkkb6 {
    justify-content: center
  }
  .cwmcr0n {
    white-space: nowrap
  }
  .cym38jd {
    border-top-left-radius: 0.375rem
  }
  .cqimob0 {
    border-top-right-radius: 0.375rem
  }
  .c2tr68t {
    border-bottom-right-radius: 0.375rem
  }
  .cjdtj3f {
    border-bottom-left-radius: 0.375rem
  }
  .c1kc4g4w {
    padding-left: 0.75rem
  }
  .c1hi2fgx {
    padding-right: 0.75rem
  }
  .cs5tzic {
    padding-top: 0.375rem
  }
  .cl10cx8 {
    padding-bottom: 0.375rem
  }
  .c1mfk609 {
    font-size: 0.875rem
  }
  .c121vm9z {
    line-height: 1.25rem
  }
  .cwry1sa {
    font-weight: 500
  }
  .cu8n5i6 {
    transition-property: all
  }
  .cqhjzs2 {
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1)
  }
  .cxcp0y5 {
    transition-duration: 150ms
  }
  .c1t6bql4:focus-visible {
    outline-width: 2px
  }
  .czph7hf:focus-visible {
    outline-style: solid
  }
  .cncn1ro:focus-visible {
    outline-color: transparent
  }
  .cb270vo:focus-visible {
    outline-offset: 2px
  }
  .c1rgsd1l:focus-visible {
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.8), 0 0 0 4px rgba(148, 163, 184, 1)
  }
  .c1srwcmr:disabled {
    pointer-events: none
  }
  .c1grhw0w:disabled {
    opacity: 0.5
  }
  .cz3we07[data-state=active] {
    background-color: rgba(255, 255, 255, 0.8)
  }
  .c18pp6i[data-state=active] {
    color: rgba(2, 8, 23, 1)
  }
  .cww7dfg[data-state=active] {
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05)
  }
  .c1culj6 {
    margin-top: 0.5rem
  }
  .c1t6bql4:focus-visible {
    outline-width: 2px
  }
  .czph7hf:focus-visible {
    outline-style: solid
  }
  .cncn1ro:focus-visible {
    outline-color: transparent
  }
  .cb270vo:focus-visible {
    outline-offset: 2px
  }
  .c1rgsd1l:focus-visible {
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.8), 0 0 0 4px rgba(148, 163, 184, 1)
  }
  .c1culj6 {
    margin-top: 0.5rem
  }
  .c1t6bql4:focus-visible {
    outline-width: 2px
  }
  .czph7hf:focus-visible {
    outline-style: solid
  }
  .cncn1ro:focus-visible {
    outline-color: transparent
  }
  .cb270vo:focus-visible {
    outline-offset: 2px
  }
  .c1rgsd1l:focus-visible {
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.8), 0 0 0 4px rgba(148, 163, 184, 1)
  }
}
      `}
        </style>
        <Page params={{}} resources={{}} />
      </>
    );
  },
};

export { Story as Tabs };
