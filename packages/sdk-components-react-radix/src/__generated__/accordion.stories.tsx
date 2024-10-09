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

const Component = () => {
  return (
    <Box className={"w-box"}>
      <Accordion
        collapsible={true}
        defaultValue={"0"}
        className={"w-accordion"}
      >
        <AccordionItem data-ws-index="0" className={"w-item w-item-1"}>
          <AccordionHeader className={"w-item-header w-item-header-1"}>
            <AccordionTrigger className={"w-item-trigger w-item-trigger-1"}>
              <Text className={"w-text"}>{"Is it accessible?"}</Text>
              <Box className={"w-box w-icon-container"}>
                <HtmlEmbed
                  code={
                    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width="100%" height="100%" style="display: block;"><path d="M4.04 6.284a.65.65 0 0 1 .92.001L8 9.335l3.04-3.05a.65.65 0 1 1 .921.918l-3.5 3.512a.65.65 0 0 1-.921 0L4.039 7.203a.65.65 0 0 1 .001-.92Z"/></svg>'
                  }
                  className={"w-html-embed"}
                />
              </Box>
            </AccordionTrigger>
          </AccordionHeader>
          <AccordionContent className={"w-item-content w-item-content-1"}>
            {"Yes. It adheres to the WAI-ARIA design pattern."}
          </AccordionContent>
        </AccordionItem>
        <AccordionItem data-ws-index="1" className={"w-item w-item-2"}>
          <AccordionHeader className={"w-item-header w-item-header-2"}>
            <AccordionTrigger className={"w-item-trigger w-item-trigger-2"}>
              <Text className={"w-text"}>{"Is it styled?"}</Text>
              <Box className={"w-box w-icon-container-1"}>
                <HtmlEmbed
                  code={
                    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width="100%" height="100%" style="display: block;"><path d="M4.04 6.284a.65.65 0 0 1 .92.001L8 9.335l3.04-3.05a.65.65 0 1 1 .921.918l-3.5 3.512a.65.65 0 0 1-.921 0L4.039 7.203a.65.65 0 0 1 .001-.92Z"/></svg>'
                  }
                  className={"w-html-embed"}
                />
              </Box>
            </AccordionTrigger>
          </AccordionHeader>
          <AccordionContent className={"w-item-content w-item-content-2"}>
            {
              "Yes. It comes with default styles that matches the other components' aesthetic."
            }
          </AccordionContent>
        </AccordionItem>
        <AccordionItem data-ws-index="2" className={"w-item w-item-3"}>
          <AccordionHeader className={"w-item-header w-item-header-3"}>
            <AccordionTrigger className={"w-item-trigger w-item-trigger-3"}>
              <Text className={"w-text"}>{"Is it animated?"}</Text>
              <Box className={"w-box w-icon-container-2"}>
                <HtmlEmbed
                  code={
                    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width="100%" height="100%" style="display: block;"><path d="M4.04 6.284a.65.65 0 0 1 .92.001L8 9.335l3.04-3.05a.65.65 0 1 1 .921.918l-3.5 3.512a.65.65 0 0 1-.921 0L4.039 7.203a.65.65 0 0 1 .001-.92Z"/></svg>'
                  }
                  className={"w-html-embed"}
                />
              </Box>
            </AccordionTrigger>
          </AccordionHeader>
          <AccordionContent className={"w-item-content w-item-content-3"}>
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
  :where(div.w-accordion) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  :where(div.w-item) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  :where(h3.w-item-header) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px;
    margin-top: 0px;
    margin-bottom: 0px
  }
  :where(button.w-item-trigger) {
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
  :where(div.w-text) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px;
    min-height: 1em
  }
  :where(div.w-html-embed) {
    display: contents
  }
  :where(div.w-item-content) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
}
@media all {
  .w-item-1 {
    border-bottom: 1px solid rgba(226, 232, 240, 1)
  }
  .w-item-header-1 {
    display: flex
  }
  .w-item-trigger-1 {
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
  .w-item-trigger-1:hover {
    text-decoration-line: underline
  }
  .w-item-trigger-1[data-state=open] {
    --accordion-trigger-icon-transform: 180deg
  }
  .w-icon-container {
    rotate: var(--accordion-trigger-icon-transform);
    height: 1rem;
    width: 1rem;
    flex-grow: 0;
    transition-property: all;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 200ms
  }
  .w-item-content-1 {
    overflow-x: hidden;
    overflow-y: hidden;
    font-size: 0.875rem;
    line-height: 1.25rem;
    padding-bottom: 1rem
  }
  .w-item-2 {
    border-bottom: 1px solid rgba(226, 232, 240, 1)
  }
  .w-item-header-2 {
    display: flex
  }
  .w-item-trigger-2 {
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
  .w-item-trigger-2:hover {
    text-decoration-line: underline
  }
  .w-item-trigger-2[data-state=open] {
    --accordion-trigger-icon-transform: 180deg
  }
  .w-icon-container-1 {
    rotate: var(--accordion-trigger-icon-transform);
    height: 1rem;
    width: 1rem;
    flex-grow: 0;
    transition-property: all;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 200ms
  }
  .w-item-content-2 {
    overflow-x: hidden;
    overflow-y: hidden;
    font-size: 0.875rem;
    line-height: 1.25rem;
    padding-bottom: 1rem
  }
  .w-item-3 {
    border-bottom: 1px solid rgba(226, 232, 240, 1)
  }
  .w-item-header-3 {
    display: flex
  }
  .w-item-trigger-3 {
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
  .w-item-trigger-3:hover {
    text-decoration-line: underline
  }
  .w-item-trigger-3[data-state=open] {
    --accordion-trigger-icon-transform: 180deg
  }
  .w-icon-container-2 {
    rotate: var(--accordion-trigger-icon-transform);
    height: 1rem;
    width: 1rem;
    flex-grow: 0;
    transition-property: all;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 200ms
  }
  .w-item-content-3 {
    overflow-x: hidden;
    overflow-y: hidden;
    font-size: 0.875rem;
    line-height: 1.25rem;
    padding-bottom: 1rem
  }
}
      `}
        </style>
        <Component />
      </>
    );
  },
};

export { Story as Accordion };
