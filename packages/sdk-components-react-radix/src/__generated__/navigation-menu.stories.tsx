import {
  Box as Box,
  Button as Button,
  Text as Text,
  HtmlEmbed as HtmlEmbed,
  Link as Link,
  Paragraph as Paragraph,
} from "@webstudio-is/sdk-components-react";
import {
  NavigationMenu as NavigationMenu,
  NavigationMenuList as NavigationMenuList,
  NavigationMenuItem as NavigationMenuItem,
  NavigationMenuTrigger as NavigationMenuTrigger,
  NavigationMenuContent as NavigationMenuContent,
  NavigationMenuLink as NavigationMenuLink,
  NavigationMenuViewport as NavigationMenuViewport,
} from "../components";

const Component = () => {
  return (
    <Box className={"w-box"}>
      <NavigationMenu className={"w-navigation-menu w-navigation-menu-1"}>
        <NavigationMenuList className={"w-menu-list w-menu-list-1"}>
          <NavigationMenuItem data-ws-index="0" className={"w-menu-item"}>
            <NavigationMenuTrigger className={"w-menu-trigger"}>
              <Button className={"w-button w-button-1"}>
                <Text className={"w-text"}>{"About"}</Text>
                <Box className={"w-box w-icon-container"}>
                  <HtmlEmbed
                    code={
                      '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 16 16" width="100%" height="100%" style="display: block;"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="m4 6 4 4 4-4"/></svg>'
                    }
                    className={"w-html-embed"}
                  />
                </Box>
              </Button>
            </NavigationMenuTrigger>
            <NavigationMenuContent
              data-ws-index="0"
              className={"w-menu-content w-menu-content-1"}
            >
              <Box className={"w-box w-content"}>
                <Box className={"w-box w-box-1"}>{""}</Box>
                <Box className={"w-box w-flex-column"}>
                  <NavigationMenuLink className={"w-accessible-link-wrapper"}>
                    <Link
                      href={"https://ui.shadcn.com/docs/components/sheet"}
                      className={"w-link w-link-1"}
                    >
                      <Text className={"w-text w-text-1"}>{"Sheet"}</Text>
                      <Paragraph className={"w-paragraph w-paragraph-1"}>
                        {
                          "Extends the Dialog component to display content that complements the main content of the screen."
                        }
                      </Paragraph>
                    </Link>
                  </NavigationMenuLink>
                  <NavigationMenuLink className={"w-accessible-link-wrapper"}>
                    <Link
                      href={
                        "https://ui.shadcn.com/docs/components/navigation-menu"
                      }
                      className={"w-link w-link-2"}
                    >
                      <Text className={"w-text w-text-2"}>
                        {"Navigation Menu"}
                      </Text>
                      <Paragraph className={"w-paragraph w-paragraph-2"}>
                        {"A collection of links for navigating websites."}
                      </Paragraph>
                    </Link>
                  </NavigationMenuLink>
                  <NavigationMenuLink className={"w-accessible-link-wrapper"}>
                    <Link
                      href={"https://ui.shadcn.com/docs/components/tabs"}
                      className={"w-link w-link-3"}
                    >
                      <Text className={"w-text w-text-3"}>{"Tabs"}</Text>
                      <Paragraph className={"w-paragraph w-paragraph-3"}>
                        {
                          "A set of layered sections of content—known as tab panels—that are displayed one at a time."
                        }
                      </Paragraph>
                    </Link>
                  </NavigationMenuLink>
                </Box>
              </Box>
            </NavigationMenuContent>
          </NavigationMenuItem>
          <NavigationMenuItem data-ws-index="1" className={"w-menu-item"}>
            <NavigationMenuTrigger className={"w-menu-trigger"}>
              <Button className={"w-button w-button-2"}>
                <Text className={"w-text"}>{"Components"}</Text>
                <Box className={"w-box w-icon-container-1"}>
                  <HtmlEmbed
                    code={
                      '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 16 16" width="100%" height="100%" style="display: block;"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="m4 6 4 4 4-4"/></svg>'
                    }
                    className={"w-html-embed"}
                  />
                </Box>
              </Button>
            </NavigationMenuTrigger>
            <NavigationMenuContent
              data-ws-index="1"
              className={"w-menu-content w-menu-content-2"}
            >
              <Box className={"w-box w-content-1"}>
                <Box className={"w-box w-flex-column-1"}>
                  <NavigationMenuLink className={"w-accessible-link-wrapper"}>
                    <Link
                      href={"https://ui.shadcn.com/docs/components/accordion"}
                      className={"w-link w-link-4"}
                    >
                      <Text className={"w-text w-text-4"}>{"Accordion"}</Text>
                      <Paragraph className={"w-paragraph w-paragraph-4"}>
                        {
                          "A vertically stacked set of interactive headings that each reveal a section of content."
                        }
                      </Paragraph>
                    </Link>
                  </NavigationMenuLink>
                  <NavigationMenuLink className={"w-accessible-link-wrapper"}>
                    <Link
                      href={"https://ui.shadcn.com/docs/components/dialog"}
                      className={"w-link w-link-5"}
                    >
                      <Text className={"w-text w-text-5"}>{"Dialog"}</Text>
                      <Paragraph className={"w-paragraph w-paragraph-5"}>
                        {
                          "A window overlaid on either the primary window or another dialog window, rendering the content underneath inert."
                        }
                      </Paragraph>
                    </Link>
                  </NavigationMenuLink>
                  <NavigationMenuLink className={"w-accessible-link-wrapper"}>
                    <Link
                      href={"https://ui.shadcn.com/docs/components/collapsible"}
                      className={"w-link w-link-6"}
                    >
                      <Text className={"w-text w-text-6"}>{"Collapsible"}</Text>
                      <Paragraph className={"w-paragraph w-paragraph-6"}>
                        {
                          "An interactive component which expands/collapses a panel."
                        }
                      </Paragraph>
                    </Link>
                  </NavigationMenuLink>
                </Box>
                <Box className={"w-box w-flex-column-2"}>
                  <NavigationMenuLink className={"w-accessible-link-wrapper"}>
                    <Link
                      href={"https://ui.shadcn.com/docs/components/popover"}
                      className={"w-link w-link-7"}
                    >
                      <Text className={"w-text w-text-7"}>{"Popover"}</Text>
                      <Paragraph className={"w-paragraph w-paragraph-7"}>
                        {
                          "Displays rich content in a portal, triggered by a button."
                        }
                      </Paragraph>
                    </Link>
                  </NavigationMenuLink>
                  <NavigationMenuLink className={"w-accessible-link-wrapper"}>
                    <Link
                      href={"https://ui.shadcn.com/docs/components/tooltip"}
                      className={"w-link w-link-8"}
                    >
                      <Text className={"w-text w-text-8"}>{"Tooltip"}</Text>
                      <Paragraph className={"w-paragraph w-paragraph-8"}>
                        {
                          "A popup that displays information related to an element when the element receives keyboard focus or the mouse hovers over it."
                        }
                      </Paragraph>
                    </Link>
                  </NavigationMenuLink>
                  <NavigationMenuLink className={"w-accessible-link-wrapper"}>
                    <Link
                      href={"https://ui.shadcn.com/docs/components/button"}
                      className={"w-link w-link-9"}
                    >
                      <Text className={"w-text w-text-9"}>{"Button"}</Text>
                      <Paragraph className={"w-paragraph w-paragraph-9"}>
                        {
                          "Displays a button or a component that looks like a button."
                        }
                      </Paragraph>
                    </Link>
                  </NavigationMenuLink>
                </Box>
              </Box>
            </NavigationMenuContent>
          </NavigationMenuItem>
          <NavigationMenuItem data-ws-index="2" className={"w-menu-item"}>
            <NavigationMenuLink className={"w-accessible-link-wrapper"}>
              <Link className={"w-link w-link-10"}>{"Standalone"}</Link>
            </NavigationMenuLink>
          </NavigationMenuItem>
        </NavigationMenuList>
        <Box className={"w-box w-viewport-container"}>
          <NavigationMenuViewport
            className={"w-menu-viewport w-menu-viewport-1"}
          />
        </Box>
      </NavigationMenu>
    </Box>
  );
};

export default {
  title: "Components/NavigationMenu",
};

const Story = {
  render() {
    return (
      <>
        <style>
          {`
@media all {
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
  :where(button.w-button) {
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
  :where(div.w-html-embed) {
    display: contents;
    white-space: normal;
    white-space-collapse: collapse
  }
  :where(a.w-link) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px;
    display: inline-block
  }
  :where(p.w-paragraph) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
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
  :where(div.w-navigation-menu) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  :where(div.w-menu-content) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  :where(div.w-menu-item) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  :where(div.w-accessible-link-wrapper) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  :where(div.w-menu-list) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  :where(div.w-menu-trigger) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  :where(div.w-menu-viewport) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
}
@media all {
  .w-navigation-menu-1 {
    position: relative;
    max-width: max-content
  }
  .w-menu-list-1 {
    display: flex;
    flex-grow: 1;
    flex-shrink: 1;
    flex-basis: 0;
    list-style-type: none;
    align-items: center;
    justify-content: center;
    row-gap: 0.25rem;
    column-gap: 0.25rem;
    margin: 0;
    padding: 0
  }
  .w-button-1 {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background-color: transparent;
    border-top-left-radius: 0.375rem;
    border-top-right-radius: 0.375rem;
    border-bottom-right-radius: 0.375rem;
    border-bottom-left-radius: 0.375rem;
    font-size: 0.875rem;
    line-height: 1.25rem;
    font-weight: 500;
    height: 2.25rem;
    padding-top: 0;
    padding-right: 0.75rem;
    padding-bottom: 0;
    padding-left: 0.75rem;
    --navigation-menu-trigger-icon-transform: 0deg;
    border: 0 solid rgba(226, 232, 240, 1)
  }
  .w-button-1:disabled {
    pointer-events: none;
    opacity: 0.5
  }
  .w-button-1:focus-visible {
    outline-offset: 2px;
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 1), 0 0 0 calc(2px + 2px) rgba(148, 163, 184, 1);
    outline: 2px solid transparent
  }
  .w-button-1:hover {
    background-color: rgba(241, 245, 249, 1);
    color: rgba(15, 23, 42, 1)
  }
  .w-button-1[data-state="open"] {
    --navigation-menu-trigger-icon-transform: 180deg
  }
  .w-icon-container {
    margin-left: 0.25rem;
    rotate: var(--navigation-menu-trigger-icon-transform);
    height: 1rem;
    width: 1rem;
    flex-shrink: 0;
    transition-property: all;
    transition-duration: 200ms;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-delay: 0s;
    transition-behavior: normal
  }
  .w-menu-content-1 {
    left: 0;
    top: 0;
    positon: absolute;
    width: max-content;
    padding: 1rem
  }
  .w-content {
    display: flex;
    row-gap: 1rem;
    column-gap: 1rem;
    padding: 0.5rem
  }
  .w-box-1 {
    background-color: rgba(226, 232, 240, 1);
    width: 12rem;
    border-top-left-radius: 0.375rem;
    border-top-right-radius: 0.375rem;
    border-bottom-right-radius: 0.375rem;
    border-bottom-left-radius: 0.375rem;
    padding: 1rem
  }
  .w-flex-column {
    width: 16rem;
    display: flex;
    row-gap: 1rem;
    column-gap: 1rem;
    flex-direction: column
  }
  .w-link-1 {
    color: inherit;
    display: flex;
    flex-direction: column;
    -webkit-user-select: none;
    user-select: none;
    row-gap: 0.25rem;
    column-gap: 0.25rem;
    border-top-left-radius: 0.375rem;
    border-top-right-radius: 0.375rem;
    border-bottom-right-radius: 0.375rem;
    border-bottom-left-radius: 0.375rem;
    line-height: 1;
    text-decoration-line: none;
    outline: medium none currentcolor;
    padding: 0.75rem
  }
  .w-link-1:focus {
    background-color: rgba(241, 245, 249, 1);
    color: rgba(15, 23, 42, 1)
  }
  .w-link-1:hover {
    background-color: rgba(241, 245, 249, 1);
    color: rgba(15, 23, 42, 1)
  }
  .w-text-1 {
    font-size: 0.875rem;
    font-weight: 500;
    line-height: 1
  }
  .w-paragraph-1 {
    overflow-x: hidden;
    overflow-y: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    font-size: 0.875rem;
    line-height: 1.375;
    color: rgba(100, 116, 139, 1);
    margin: 0
  }
  .w-link-2 {
    color: inherit;
    display: flex;
    flex-direction: column;
    -webkit-user-select: none;
    user-select: none;
    row-gap: 0.25rem;
    column-gap: 0.25rem;
    border-top-left-radius: 0.375rem;
    border-top-right-radius: 0.375rem;
    border-bottom-right-radius: 0.375rem;
    border-bottom-left-radius: 0.375rem;
    line-height: 1;
    text-decoration-line: none;
    outline: medium none currentcolor;
    padding: 0.75rem
  }
  .w-link-2:focus {
    background-color: rgba(241, 245, 249, 1);
    color: rgba(15, 23, 42, 1)
  }
  .w-link-2:hover {
    background-color: rgba(241, 245, 249, 1);
    color: rgba(15, 23, 42, 1)
  }
  .w-text-2 {
    font-size: 0.875rem;
    font-weight: 500;
    line-height: 1
  }
  .w-paragraph-2 {
    overflow-x: hidden;
    overflow-y: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    font-size: 0.875rem;
    line-height: 1.375;
    color: rgba(100, 116, 139, 1);
    margin: 0
  }
  .w-link-3 {
    color: inherit;
    display: flex;
    flex-direction: column;
    -webkit-user-select: none;
    user-select: none;
    row-gap: 0.25rem;
    column-gap: 0.25rem;
    border-top-left-radius: 0.375rem;
    border-top-right-radius: 0.375rem;
    border-bottom-right-radius: 0.375rem;
    border-bottom-left-radius: 0.375rem;
    line-height: 1;
    text-decoration-line: none;
    outline: medium none currentcolor;
    padding: 0.75rem
  }
  .w-link-3:focus {
    background-color: rgba(241, 245, 249, 1);
    color: rgba(15, 23, 42, 1)
  }
  .w-link-3:hover {
    background-color: rgba(241, 245, 249, 1);
    color: rgba(15, 23, 42, 1)
  }
  .w-text-3 {
    font-size: 0.875rem;
    font-weight: 500;
    line-height: 1
  }
  .w-paragraph-3 {
    overflow-x: hidden;
    overflow-y: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    font-size: 0.875rem;
    line-height: 1.375;
    color: rgba(100, 116, 139, 1);
    margin: 0
  }
  .w-button-2 {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background-color: transparent;
    border-top-left-radius: 0.375rem;
    border-top-right-radius: 0.375rem;
    border-bottom-right-radius: 0.375rem;
    border-bottom-left-radius: 0.375rem;
    font-size: 0.875rem;
    line-height: 1.25rem;
    font-weight: 500;
    height: 2.25rem;
    padding-top: 0;
    padding-right: 0.75rem;
    padding-bottom: 0;
    padding-left: 0.75rem;
    --navigation-menu-trigger-icon-transform: 0deg;
    border: 0 solid rgba(226, 232, 240, 1)
  }
  .w-button-2:disabled {
    pointer-events: none;
    opacity: 0.5
  }
  .w-button-2:focus-visible {
    outline-offset: 2px;
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 1), 0 0 0 calc(2px + 2px) rgba(148, 163, 184, 1);
    outline: 2px solid transparent
  }
  .w-button-2:hover {
    background-color: rgba(241, 245, 249, 1);
    color: rgba(15, 23, 42, 1)
  }
  .w-button-2[data-state="open"] {
    --navigation-menu-trigger-icon-transform: 180deg
  }
  .w-icon-container-1 {
    margin-left: 0.25rem;
    rotate: var(--navigation-menu-trigger-icon-transform);
    height: 1rem;
    width: 1rem;
    flex-shrink: 0;
    transition-property: all;
    transition-duration: 200ms;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-delay: 0s;
    transition-behavior: normal
  }
  .w-menu-content-2 {
    left: 0;
    top: 0;
    positon: absolute;
    width: max-content;
    padding: 1rem
  }
  .w-content-1 {
    display: flex;
    row-gap: 1rem;
    column-gap: 1rem
  }
  .w-flex-column-1 {
    width: 16rem;
    display: flex;
    row-gap: 1rem;
    column-gap: 1rem;
    flex-direction: column
  }
  .w-link-4 {
    color: inherit;
    display: flex;
    flex-direction: column;
    -webkit-user-select: none;
    user-select: none;
    row-gap: 0.25rem;
    column-gap: 0.25rem;
    border-top-left-radius: 0.375rem;
    border-top-right-radius: 0.375rem;
    border-bottom-right-radius: 0.375rem;
    border-bottom-left-radius: 0.375rem;
    line-height: 1;
    text-decoration-line: none;
    outline: medium none currentcolor;
    padding: 0.75rem
  }
  .w-link-4:focus {
    background-color: rgba(241, 245, 249, 1);
    color: rgba(15, 23, 42, 1)
  }
  .w-link-4:hover {
    background-color: rgba(241, 245, 249, 1);
    color: rgba(15, 23, 42, 1)
  }
  .w-text-4 {
    font-size: 0.875rem;
    font-weight: 500;
    line-height: 1
  }
  .w-paragraph-4 {
    overflow-x: hidden;
    overflow-y: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    font-size: 0.875rem;
    line-height: 1.375;
    color: rgba(100, 116, 139, 1);
    margin: 0
  }
  .w-link-5 {
    color: inherit;
    display: flex;
    flex-direction: column;
    -webkit-user-select: none;
    user-select: none;
    row-gap: 0.25rem;
    column-gap: 0.25rem;
    border-top-left-radius: 0.375rem;
    border-top-right-radius: 0.375rem;
    border-bottom-right-radius: 0.375rem;
    border-bottom-left-radius: 0.375rem;
    line-height: 1;
    text-decoration-line: none;
    outline: medium none currentcolor;
    padding: 0.75rem
  }
  .w-link-5:focus {
    background-color: rgba(241, 245, 249, 1);
    color: rgba(15, 23, 42, 1)
  }
  .w-link-5:hover {
    background-color: rgba(241, 245, 249, 1);
    color: rgba(15, 23, 42, 1)
  }
  .w-text-5 {
    font-size: 0.875rem;
    font-weight: 500;
    line-height: 1
  }
  .w-paragraph-5 {
    overflow-x: hidden;
    overflow-y: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    font-size: 0.875rem;
    line-height: 1.375;
    color: rgba(100, 116, 139, 1);
    margin: 0
  }
  .w-link-6 {
    color: inherit;
    display: flex;
    flex-direction: column;
    -webkit-user-select: none;
    user-select: none;
    row-gap: 0.25rem;
    column-gap: 0.25rem;
    border-top-left-radius: 0.375rem;
    border-top-right-radius: 0.375rem;
    border-bottom-right-radius: 0.375rem;
    border-bottom-left-radius: 0.375rem;
    line-height: 1;
    text-decoration-line: none;
    outline: medium none currentcolor;
    padding: 0.75rem
  }
  .w-link-6:focus {
    background-color: rgba(241, 245, 249, 1);
    color: rgba(15, 23, 42, 1)
  }
  .w-link-6:hover {
    background-color: rgba(241, 245, 249, 1);
    color: rgba(15, 23, 42, 1)
  }
  .w-text-6 {
    font-size: 0.875rem;
    font-weight: 500;
    line-height: 1
  }
  .w-paragraph-6 {
    overflow-x: hidden;
    overflow-y: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    font-size: 0.875rem;
    line-height: 1.375;
    color: rgba(100, 116, 139, 1);
    margin: 0
  }
  .w-flex-column-2 {
    width: 16rem;
    display: flex;
    row-gap: 1rem;
    column-gap: 1rem;
    flex-direction: column
  }
  .w-link-7 {
    color: inherit;
    display: flex;
    flex-direction: column;
    -webkit-user-select: none;
    user-select: none;
    row-gap: 0.25rem;
    column-gap: 0.25rem;
    border-top-left-radius: 0.375rem;
    border-top-right-radius: 0.375rem;
    border-bottom-right-radius: 0.375rem;
    border-bottom-left-radius: 0.375rem;
    line-height: 1;
    text-decoration-line: none;
    outline: medium none currentcolor;
    padding: 0.75rem
  }
  .w-link-7:focus {
    background-color: rgba(241, 245, 249, 1);
    color: rgba(15, 23, 42, 1)
  }
  .w-link-7:hover {
    background-color: rgba(241, 245, 249, 1);
    color: rgba(15, 23, 42, 1)
  }
  .w-text-7 {
    font-size: 0.875rem;
    font-weight: 500;
    line-height: 1
  }
  .w-paragraph-7 {
    overflow-x: hidden;
    overflow-y: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    font-size: 0.875rem;
    line-height: 1.375;
    color: rgba(100, 116, 139, 1);
    margin: 0
  }
  .w-link-8 {
    color: inherit;
    display: flex;
    flex-direction: column;
    -webkit-user-select: none;
    user-select: none;
    row-gap: 0.25rem;
    column-gap: 0.25rem;
    border-top-left-radius: 0.375rem;
    border-top-right-radius: 0.375rem;
    border-bottom-right-radius: 0.375rem;
    border-bottom-left-radius: 0.375rem;
    line-height: 1;
    text-decoration-line: none;
    outline: medium none currentcolor;
    padding: 0.75rem
  }
  .w-link-8:focus {
    background-color: rgba(241, 245, 249, 1);
    color: rgba(15, 23, 42, 1)
  }
  .w-link-8:hover {
    background-color: rgba(241, 245, 249, 1);
    color: rgba(15, 23, 42, 1)
  }
  .w-text-8 {
    font-size: 0.875rem;
    font-weight: 500;
    line-height: 1
  }
  .w-paragraph-8 {
    overflow-x: hidden;
    overflow-y: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    font-size: 0.875rem;
    line-height: 1.375;
    color: rgba(100, 116, 139, 1);
    margin: 0
  }
  .w-link-9 {
    color: inherit;
    display: flex;
    flex-direction: column;
    -webkit-user-select: none;
    user-select: none;
    row-gap: 0.25rem;
    column-gap: 0.25rem;
    border-top-left-radius: 0.375rem;
    border-top-right-radius: 0.375rem;
    border-bottom-right-radius: 0.375rem;
    border-bottom-left-radius: 0.375rem;
    line-height: 1;
    text-decoration-line: none;
    outline: medium none currentcolor;
    padding: 0.75rem
  }
  .w-link-9:focus {
    background-color: rgba(241, 245, 249, 1);
    color: rgba(15, 23, 42, 1)
  }
  .w-link-9:hover {
    background-color: rgba(241, 245, 249, 1);
    color: rgba(15, 23, 42, 1)
  }
  .w-text-9 {
    font-size: 0.875rem;
    font-weight: 500;
    line-height: 1
  }
  .w-paragraph-9 {
    overflow-x: hidden;
    overflow-y: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    font-size: 0.875rem;
    line-height: 1.375;
    color: rgba(100, 116, 139, 1);
    margin: 0
  }
  .w-link-10 {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background-color: transparent;
    border-top-left-radius: 0.375rem;
    border-top-right-radius: 0.375rem;
    border-bottom-right-radius: 0.375rem;
    border-bottom-left-radius: 0.375rem;
    font-size: 0.875rem;
    line-height: 1.25rem;
    font-weight: 500;
    height: 2.25rem;
    padding-top: 0;
    padding-right: 0.75rem;
    padding-bottom: 0;
    padding-left: 0.75rem;
    text-decoration-line: none;
    color: currentcolor;
    border: 0 solid rgba(226, 232, 240, 1)
  }
  .w-link-10:disabled {
    pointer-events: none;
    opacity: 0.5
  }
  .w-link-10:focus-visible {
    outline-offset: 2px;
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 1), 0 0 0 calc(2px + 2px) rgba(148, 163, 184, 1);
    outline: 2px solid transparent
  }
  .w-link-10:hover {
    background-color: rgba(241, 245, 249, 1);
    color: rgba(15, 23, 42, 1)
  }
  .w-viewport-container {
    position: absolute;
    left: 0;
    top: 100%;
    display: flex;
    justify-content: center
  }
  .w-menu-viewport-1 {
    position: relative;
    margin-top: 0.375rem;
    overflow-x: hidden;
    overflow-y: hidden;
    border-top-left-radius: 0.375rem;
    border-top-right-radius: 0.375rem;
    border-bottom-right-radius: 0.375rem;
    border-bottom-left-radius: 0.375rem;
    background-color: rgba(255, 255, 255, 1);
    color: rgba(2, 8, 23, 1);
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
    height: var(--radix-navigation-menu-viewport-height);
    width: var(--radix-navigation-menu-viewport-width);
    border: 1px solid rgba(226, 232, 240, 1)
  }
}
      `}
        </style>
        <Component />
      </>
    );
  },
};

export { Story as NavigationMenu };
