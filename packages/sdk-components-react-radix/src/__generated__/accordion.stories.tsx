import { useState } from "react";
import {
  Box as Box,
  Text as Text,
  HtmlEmbed as HtmlEmbed,
} from "@webstudio-is/sdk-components-react";
import {
  Accordion as Accordion,
  AccordionItem as AccordionItem,
  AccordionHeader as AccordionHeader,
  AccordionTrigger as AccordionTrigger,
  AccordionContent as AccordionContent,
} from "../components";

type Params = Record<string, string | undefined>;
type Resources = Record<string, unknown>;
const Page = (_props: { params: Params; resources: Resources }) => {
  let [accordionValue, set$accordionValue] = useState<any>("0");
  let onValueChange = (value: any) => {
    accordionValue = value;
    set$accordionValue(accordionValue);
  };
  return (
    <Box data-ws-id="root" data-ws-component="Box">
      <Accordion
        data-ws-id="1"
        data-ws-component="Accordion"
        collapsible={true}
        value={accordionValue}
        onValueChange={onValueChange}
      >
        <AccordionItem
          data-ws-id="6"
          data-ws-component="AccordionItem"
          data-ws-index="0"
        >
          <AccordionHeader data-ws-id="8" data-ws-component="AccordionHeader">
            <AccordionTrigger
              data-ws-id="10"
              data-ws-component="AccordionTrigger"
            >
              <Text data-ws-id="12" data-ws-component="Text">
                {"Is it accessible?"}
              </Text>
              <Box data-ws-id="13" data-ws-component="Box">
                <HtmlEmbed
                  data-ws-id="15"
                  data-ws-component="HtmlEmbed"
                  code={
                    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width="100%" height="100%" style="display: block;"><path d="M4.04 6.284a.65.65 0 0 1 .92.001L8 9.335l3.04-3.05a.65.65 0 1 1 .921.918l-3.5 3.512a.65.65 0 0 1-.921 0L4.039 7.203a.65.65 0 0 1 .001-.92Z"/></svg>'
                  }
                />
              </Box>
            </AccordionTrigger>
          </AccordionHeader>
          <AccordionContent
            data-ws-id="17"
            data-ws-component="AccordionContent"
          >
            {"Yes. It adheres to the WAI-ARIA design pattern."}
          </AccordionContent>
        </AccordionItem>
        <AccordionItem
          data-ws-id="19"
          data-ws-component="AccordionItem"
          data-ws-index="1"
        >
          <AccordionHeader data-ws-id="21" data-ws-component="AccordionHeader">
            <AccordionTrigger
              data-ws-id="23"
              data-ws-component="AccordionTrigger"
            >
              <Text data-ws-id="25" data-ws-component="Text">
                {"Is it styled?"}
              </Text>
              <Box data-ws-id="26" data-ws-component="Box">
                <HtmlEmbed
                  data-ws-id="28"
                  data-ws-component="HtmlEmbed"
                  code={
                    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width="100%" height="100%" style="display: block;"><path d="M4.04 6.284a.65.65 0 0 1 .92.001L8 9.335l3.04-3.05a.65.65 0 1 1 .921.918l-3.5 3.512a.65.65 0 0 1-.921 0L4.039 7.203a.65.65 0 0 1 .001-.92Z"/></svg>'
                  }
                />
              </Box>
            </AccordionTrigger>
          </AccordionHeader>
          <AccordionContent
            data-ws-id="30"
            data-ws-component="AccordionContent"
          >
            {
              "Yes. It comes with default styles that matches the other components' aesthetic."
            }
          </AccordionContent>
        </AccordionItem>
        <AccordionItem
          data-ws-id="32"
          data-ws-component="AccordionItem"
          data-ws-index="2"
        >
          <AccordionHeader data-ws-id="34" data-ws-component="AccordionHeader">
            <AccordionTrigger
              data-ws-id="36"
              data-ws-component="AccordionTrigger"
            >
              <Text data-ws-id="38" data-ws-component="Text">
                {"Is it animated?"}
              </Text>
              <Box data-ws-id="39" data-ws-component="Box">
                <HtmlEmbed
                  data-ws-id="41"
                  data-ws-component="HtmlEmbed"
                  code={
                    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width="100%" height="100%" style="display: block;"><path d="M4.04 6.284a.65.65 0 0 1 .92.001L8 9.335l3.04-3.05a.65.65 0 1 1 .921.918l-3.5 3.512a.65.65 0 0 1-.921 0L4.039 7.203a.65.65 0 0 1 .001-.92Z"/></svg>'
                  }
                />
              </Box>
            </AccordionTrigger>
          </AccordionHeader>
          <AccordionContent
            data-ws-id="43"
            data-ws-component="AccordionContent"
          >
            {
              "Yes. It's animated by default, but you can disable it if you prefer."
            }
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Box>
  );
};

export default {
  title: "Components/Accordion",
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
  div:where([data-ws-component="Accordion"]) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  div:where([data-ws-component="AccordionItem"]) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  h3:where([data-ws-component="AccordionHeader"]) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px;
    margin-top: 0px;
    margin-bottom: 0px
  }
  button:where([data-ws-component="AccordionTrigger"]) {
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
  div:where([data-ws-component="Text"]) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px;
    min-height: 1em
  }
  div:where([data-ws-component="AccordionContent"]) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
}
@media all {
  [data-ws-id="6"] {
    border-bottom-width: 1px;
    border-bottom-style: solid;
    border-bottom-color: rgba(226, 232, 240, 1)
  }
  [data-ws-id="8"] {
    display: flex
  }
  [data-ws-id="10"] {
    display: flex;
    flex-grow: 1;
    flex-shrink: 1;
    flex-basis: 0%;
    align-items: center;
    justify-content: space-between;
    padding-top: 1rem;
    padding-bottom: 1rem;
    font-weight: 500;
    --accordion-trigger-icon-transform: 0deg
  }
  [data-ws-id="10"]:hover {
    text-decoration-line: underline
  }
  [data-ws-id="10"][data-state=open] {
    --accordion-trigger-icon-transform: 180deg
  }
  [data-ws-id="13"] {
    rotate: var(--accordion-trigger-icon-transform);
    height: 1rem;
    width: 1rem;
    flex-grow: 0;
    transition-property: all;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 200ms
  }
  [data-ws-id="17"] {
    overflow: hidden;
    font-size: 0.875rem;
    line-height: 1.25rem;
    padding-bottom: 1rem
  }
  [data-ws-id="19"] {
    border-bottom-width: 1px;
    border-bottom-style: solid;
    border-bottom-color: rgba(226, 232, 240, 1)
  }
  [data-ws-id="21"] {
    display: flex
  }
  [data-ws-id="23"] {
    display: flex;
    flex-grow: 1;
    flex-shrink: 1;
    flex-basis: 0%;
    align-items: center;
    justify-content: space-between;
    padding-top: 1rem;
    padding-bottom: 1rem;
    font-weight: 500;
    --accordion-trigger-icon-transform: 0deg
  }
  [data-ws-id="23"]:hover {
    text-decoration-line: underline
  }
  [data-ws-id="23"][data-state=open] {
    --accordion-trigger-icon-transform: 180deg
  }
  [data-ws-id="26"] {
    rotate: var(--accordion-trigger-icon-transform);
    height: 1rem;
    width: 1rem;
    flex-grow: 0;
    transition-property: all;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 200ms
  }
  [data-ws-id="30"] {
    overflow: hidden;
    font-size: 0.875rem;
    line-height: 1.25rem;
    padding-bottom: 1rem
  }
  [data-ws-id="32"] {
    border-bottom-width: 1px;
    border-bottom-style: solid;
    border-bottom-color: rgba(226, 232, 240, 1)
  }
  [data-ws-id="34"] {
    display: flex
  }
  [data-ws-id="36"] {
    display: flex;
    flex-grow: 1;
    flex-shrink: 1;
    flex-basis: 0%;
    align-items: center;
    justify-content: space-between;
    padding-top: 1rem;
    padding-bottom: 1rem;
    font-weight: 500;
    --accordion-trigger-icon-transform: 0deg
  }
  [data-ws-id="36"]:hover {
    text-decoration-line: underline
  }
  [data-ws-id="36"][data-state=open] {
    --accordion-trigger-icon-transform: 180deg
  }
  [data-ws-id="39"] {
    rotate: var(--accordion-trigger-icon-transform);
    height: 1rem;
    width: 1rem;
    flex-grow: 0;
    transition-property: all;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 200ms
  }
  [data-ws-id="43"] {
    overflow: hidden;
    font-size: 0.875rem;
    line-height: 1.25rem;
    padding-bottom: 1rem
  }
}
      `}
        </style>
        <Page params={{}} resources={{}} />
      </>
    );
  },
};

export { Story as Accordion };
