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
    <Box data-ws-id="root" data-ws-component="Box" className="w-box">
      <NavigationMenu
        data-ws-id="1"
        data-ws-component="NavigationMenu"
        className="w-navigation-menu"
      >
        <NavigationMenuList
          data-ws-id="3"
          data-ws-component="NavigationMenuList"
          className="w-navigation-menu-list"
        >
          <NavigationMenuItem
            data-ws-id="5"
            data-ws-component="NavigationMenuItem"
            data-ws-index="0"
            className="w-navigation-menu-item"
          >
            <NavigationMenuTrigger
              data-ws-id="6"
              data-ws-component="NavigationMenuTrigger"
              className="w-navigation-menu-trigger"
            >
              <Button
                data-ws-id="7"
                data-ws-component="Button"
                className="w-button"
              >
                <Text
                  data-ws-id="9"
                  data-ws-component="Text"
                  className="w-text"
                >
                  {"About"}
                </Text>
                <Box data-ws-id="10" data-ws-component="Box" className="w-box">
                  <HtmlEmbed
                    data-ws-id="12"
                    data-ws-component="HtmlEmbed"
                    code={
                      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width="100%" height="100%" style="display: block;"><path d="M4.04 6.284a.65.65 0 0 1 .92.001L8 9.335l3.04-3.05a.65.65 0 1 1 .921.918l-3.5 3.512a.65.65 0 0 1-.921 0L4.039 7.203a.65.65 0 0 1 .001-.92Z"/></svg>'
                    }
                    className="w-html-embed"
                  />
                </Box>
              </Button>
            </NavigationMenuTrigger>
            <NavigationMenuContent
              data-ws-id="14"
              data-ws-component="NavigationMenuContent"
              data-ws-index="0"
              className="w-navigation-menu-content"
            >
              <Box data-ws-id="16" data-ws-component="Box" className="w-box">
                <Box data-ws-id="18" data-ws-component="Box" className="w-box">
                  {""}
                </Box>
                <Box data-ws-id="20" data-ws-component="Box" className="w-box">
                  <NavigationMenuLink
                    data-ws-id="22"
                    data-ws-component="NavigationMenuLink"
                    className="w-navigation-menu-link"
                  >
                    <Link
                      data-ws-id="23"
                      data-ws-component="Link"
                      href={"https://ui.shadcn.com/docs/components/sheet"}
                      className="w-link"
                    >
                      <Text
                        data-ws-id="26"
                        data-ws-component="Text"
                        className="w-text"
                      >
                        {"Sheet"}
                      </Text>
                      <Paragraph
                        data-ws-id="28"
                        data-ws-component="Paragraph"
                        className="w-paragraph"
                      >
                        {
                          "Extends the Dialog component to display content that complements the main content of the screen."
                        }
                      </Paragraph>
                    </Link>
                  </NavigationMenuLink>
                  <NavigationMenuLink
                    data-ws-id="30"
                    data-ws-component="NavigationMenuLink"
                    className="w-navigation-menu-link"
                  >
                    <Link
                      data-ws-id="31"
                      data-ws-component="Link"
                      href={
                        "https://ui.shadcn.com/docs/components/navigation-menu"
                      }
                      className="w-link"
                    >
                      <Text
                        data-ws-id="34"
                        data-ws-component="Text"
                        className="w-text"
                      >
                        {"Navigation Menu"}
                      </Text>
                      <Paragraph
                        data-ws-id="36"
                        data-ws-component="Paragraph"
                        className="w-paragraph"
                      >
                        {"A collection of links for navigating websites."}
                      </Paragraph>
                    </Link>
                  </NavigationMenuLink>
                  <NavigationMenuLink
                    data-ws-id="38"
                    data-ws-component="NavigationMenuLink"
                    className="w-navigation-menu-link"
                  >
                    <Link
                      data-ws-id="39"
                      data-ws-component="Link"
                      href={"https://ui.shadcn.com/docs/components/tabs"}
                      className="w-link"
                    >
                      <Text
                        data-ws-id="42"
                        data-ws-component="Text"
                        className="w-text"
                      >
                        {"Tabs"}
                      </Text>
                      <Paragraph
                        data-ws-id="44"
                        data-ws-component="Paragraph"
                        className="w-paragraph"
                      >
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
          <NavigationMenuItem
            data-ws-id="46"
            data-ws-component="NavigationMenuItem"
            data-ws-index="1"
            className="w-navigation-menu-item"
          >
            <NavigationMenuTrigger
              data-ws-id="47"
              data-ws-component="NavigationMenuTrigger"
              className="w-navigation-menu-trigger"
            >
              <Button
                data-ws-id="48"
                data-ws-component="Button"
                className="w-button"
              >
                <Text
                  data-ws-id="50"
                  data-ws-component="Text"
                  className="w-text"
                >
                  {"Components"}
                </Text>
                <Box data-ws-id="51" data-ws-component="Box" className="w-box">
                  <HtmlEmbed
                    data-ws-id="53"
                    data-ws-component="HtmlEmbed"
                    code={
                      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width="100%" height="100%" style="display: block;"><path d="M4.04 6.284a.65.65 0 0 1 .92.001L8 9.335l3.04-3.05a.65.65 0 1 1 .921.918l-3.5 3.512a.65.65 0 0 1-.921 0L4.039 7.203a.65.65 0 0 1 .001-.92Z"/></svg>'
                    }
                    className="w-html-embed"
                  />
                </Box>
              </Button>
            </NavigationMenuTrigger>
            <NavigationMenuContent
              data-ws-id="55"
              data-ws-component="NavigationMenuContent"
              data-ws-index="1"
              className="w-navigation-menu-content"
            >
              <Box data-ws-id="57" data-ws-component="Box" className="w-box">
                <Box data-ws-id="59" data-ws-component="Box" className="w-box">
                  <NavigationMenuLink
                    data-ws-id="61"
                    data-ws-component="NavigationMenuLink"
                    className="w-navigation-menu-link"
                  >
                    <Link
                      data-ws-id="62"
                      data-ws-component="Link"
                      href={"https://ui.shadcn.com/docs/components/accordion"}
                      className="w-link"
                    >
                      <Text
                        data-ws-id="65"
                        data-ws-component="Text"
                        className="w-text"
                      >
                        {"Accordion"}
                      </Text>
                      <Paragraph
                        data-ws-id="67"
                        data-ws-component="Paragraph"
                        className="w-paragraph"
                      >
                        {
                          "A vertically stacked set of interactive headings that each reveal a section of content."
                        }
                      </Paragraph>
                    </Link>
                  </NavigationMenuLink>
                  <NavigationMenuLink
                    data-ws-id="69"
                    data-ws-component="NavigationMenuLink"
                    className="w-navigation-menu-link"
                  >
                    <Link
                      data-ws-id="70"
                      data-ws-component="Link"
                      href={"https://ui.shadcn.com/docs/components/dialog"}
                      className="w-link"
                    >
                      <Text
                        data-ws-id="73"
                        data-ws-component="Text"
                        className="w-text"
                      >
                        {"Dialog"}
                      </Text>
                      <Paragraph
                        data-ws-id="75"
                        data-ws-component="Paragraph"
                        className="w-paragraph"
                      >
                        {
                          "A window overlaid on either the primary window or another dialog window, rendering the content underneath inert."
                        }
                      </Paragraph>
                    </Link>
                  </NavigationMenuLink>
                  <NavigationMenuLink
                    data-ws-id="77"
                    data-ws-component="NavigationMenuLink"
                    className="w-navigation-menu-link"
                  >
                    <Link
                      data-ws-id="78"
                      data-ws-component="Link"
                      href={"https://ui.shadcn.com/docs/components/collapsible"}
                      className="w-link"
                    >
                      <Text
                        data-ws-id="81"
                        data-ws-component="Text"
                        className="w-text"
                      >
                        {"Collapsible"}
                      </Text>
                      <Paragraph
                        data-ws-id="83"
                        data-ws-component="Paragraph"
                        className="w-paragraph"
                      >
                        {
                          "An interactive component which expands/collapses a panel."
                        }
                      </Paragraph>
                    </Link>
                  </NavigationMenuLink>
                </Box>
                <Box data-ws-id="85" data-ws-component="Box" className="w-box">
                  <NavigationMenuLink
                    data-ws-id="87"
                    data-ws-component="NavigationMenuLink"
                    className="w-navigation-menu-link"
                  >
                    <Link
                      data-ws-id="88"
                      data-ws-component="Link"
                      href={"https://ui.shadcn.com/docs/components/popover"}
                      className="w-link"
                    >
                      <Text
                        data-ws-id="91"
                        data-ws-component="Text"
                        className="w-text"
                      >
                        {"Popover"}
                      </Text>
                      <Paragraph
                        data-ws-id="93"
                        data-ws-component="Paragraph"
                        className="w-paragraph"
                      >
                        {
                          "Displays rich content in a portal, triggered by a button."
                        }
                      </Paragraph>
                    </Link>
                  </NavigationMenuLink>
                  <NavigationMenuLink
                    data-ws-id="95"
                    data-ws-component="NavigationMenuLink"
                    className="w-navigation-menu-link"
                  >
                    <Link
                      data-ws-id="96"
                      data-ws-component="Link"
                      href={"https://ui.shadcn.com/docs/components/tooltip"}
                      className="w-link"
                    >
                      <Text
                        data-ws-id="99"
                        data-ws-component="Text"
                        className="w-text"
                      >
                        {"Tooltip"}
                      </Text>
                      <Paragraph
                        data-ws-id="101"
                        data-ws-component="Paragraph"
                        className="w-paragraph"
                      >
                        {
                          "A popup that displays information related to an element when the element receives keyboard focus or the mouse hovers over it."
                        }
                      </Paragraph>
                    </Link>
                  </NavigationMenuLink>
                  <NavigationMenuLink
                    data-ws-id="103"
                    data-ws-component="NavigationMenuLink"
                    className="w-navigation-menu-link"
                  >
                    <Link
                      data-ws-id="104"
                      data-ws-component="Link"
                      href={"https://ui.shadcn.com/docs/components/button"}
                      className="w-link"
                    >
                      <Text
                        data-ws-id="107"
                        data-ws-component="Text"
                        className="w-text"
                      >
                        {"Button"}
                      </Text>
                      <Paragraph
                        data-ws-id="109"
                        data-ws-component="Paragraph"
                        className="w-paragraph"
                      >
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
          <NavigationMenuItem
            data-ws-id="111"
            data-ws-component="NavigationMenuItem"
            data-ws-index="2"
            className="w-navigation-menu-item"
          >
            <NavigationMenuLink
              data-ws-id="112"
              data-ws-component="NavigationMenuLink"
              className="w-navigation-menu-link"
            >
              <Link
                data-ws-id="113"
                data-ws-component="Link"
                className="w-link"
              >
                {"Standalone"}
              </Link>
            </NavigationMenuLink>
          </NavigationMenuItem>
        </NavigationMenuList>
        <Box data-ws-id="115" data-ws-component="Box" className="w-box">
          <NavigationMenuViewport
            data-ws-id="117"
            data-ws-component="NavigationMenuViewport"
            className="w-navigation-menu-viewport"
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
  :where(div.w-navigation-menu) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  :where(div.w-navigation-menu-list) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  :where(div.w-navigation-menu-item) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  :where(div.w-navigation-menu-trigger) {
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
  :where(div.w-navigation-menu-content) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  :where(div.w-navigation-menu-link) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  :where(a.w-link) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px;
    min-height: 1em;
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
  :where(div.w-navigation-menu-viewport) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
}
@media all {
  [data-ws-id="1"] {
    position: relative;
    max-width: max-content
  }
  [data-ws-id="3"] {
    display: flex;
    flex-grow: 1;
    flex-shrink: 1;
    flex-basis: 0%;
    list-style-type: none;
    align-items: center;
    justify-content: center;
    row-gap: 0.25rem;
    column-gap: 0.25rem;
    margin: 0px;
    padding: 0px
  }
  [data-ws-id="7"] {
    background-color: transparent;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-top-left-radius: 0.375rem;
    border-top-right-radius: 0.375rem;
    border-bottom-right-radius: 0.375rem;
    border-bottom-left-radius: 0.375rem;
    font-size: 0.875rem;
    line-height: 1.25rem;
    font-weight: 500;
    color: currentColor;
    height: 2.5rem;
    padding-left: 0.75rem;
    padding-right: 0.75rem;
    --navigation-menu-trigger-icon-transform: 0deg;
    border: 0px solid rgba(226, 232, 240, 1)
  }
  [data-ws-id="7"]:disabled {
    pointer-events: none;
    opacity: 0.5
  }
  [data-ws-id="7"]:focus-visible {
    outline-offset: 2px;
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.8), 0 0 0 4px rgba(148, 163, 184, 1);
    outline: 2px solid transparent
  }
  [data-ws-id="7"]:hover {
    background-color: rgba(241, 245, 249, 0.9);
    color: rgba(15, 23, 42, 1)
  }
  [data-ws-id="7"][data-state=open] {
    --navigation-menu-trigger-icon-transform: 180deg
  }
  [data-ws-id="10"] {
    margin-left: 0.25rem;
    rotate: var(--navigation-menu-trigger-icon-transform);
    height: 1rem;
    width: 1rem;
    flex-grow: 0;
    transition-property: all;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 200ms
  }
  [data-ws-id="14"] {
    left: 0px;
    top: 0px;
    position: absolute;
    width: max-content;
    padding: 1rem
  }
  [data-ws-id="16"] {
    display: flex;
    row-gap: 1rem;
    column-gap: 1rem;
    padding: 0.5rem
  }
  [data-ws-id="18"] {
    background-color: rgba(226, 232, 240, 1);
    width: 12rem;
    border-top-left-radius: 0.375rem;
    border-top-right-radius: 0.375rem;
    border-bottom-right-radius: 0.375rem;
    border-bottom-left-radius: 0.375rem;
    padding: 1rem
  }
  [data-ws-id="20"] {
    width: 16rem;
    display: flex;
    row-gap: 1rem;
    column-gap: 1rem;
    flex-direction: column
  }
  [data-ws-id="23"] {
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
    outline-offset: 2px;
    outline: 2px solid transparent;
    padding: 0.75rem
  }
  [data-ws-id="23"]:focus {
    background-color: rgba(241, 245, 249, 0.9);
    color: rgba(15, 23, 42, 1)
  }
  [data-ws-id="23"]:hover {
    background-color: rgba(241, 245, 249, 0.9);
    color: rgba(15, 23, 42, 1)
  }
  [data-ws-id="26"] {
    font-size: 0.875rem;
    line-height: 1;
    font-weight: 500
  }
  [data-ws-id="28"] {
    overflow-x: hidden;
    overflow-y: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    font-size: 0.875rem;
    line-height: 1.375;
    color: rgba(100, 116, 139, 1);
    margin: 0px
  }
  [data-ws-id="31"] {
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
    outline-offset: 2px;
    outline: 2px solid transparent;
    padding: 0.75rem
  }
  [data-ws-id="31"]:focus {
    background-color: rgba(241, 245, 249, 0.9);
    color: rgba(15, 23, 42, 1)
  }
  [data-ws-id="31"]:hover {
    background-color: rgba(241, 245, 249, 0.9);
    color: rgba(15, 23, 42, 1)
  }
  [data-ws-id="34"] {
    font-size: 0.875rem;
    line-height: 1;
    font-weight: 500
  }
  [data-ws-id="36"] {
    overflow-x: hidden;
    overflow-y: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    font-size: 0.875rem;
    line-height: 1.375;
    color: rgba(100, 116, 139, 1);
    margin: 0px
  }
  [data-ws-id="39"] {
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
    outline-offset: 2px;
    outline: 2px solid transparent;
    padding: 0.75rem
  }
  [data-ws-id="39"]:focus {
    background-color: rgba(241, 245, 249, 0.9);
    color: rgba(15, 23, 42, 1)
  }
  [data-ws-id="39"]:hover {
    background-color: rgba(241, 245, 249, 0.9);
    color: rgba(15, 23, 42, 1)
  }
  [data-ws-id="42"] {
    font-size: 0.875rem;
    line-height: 1;
    font-weight: 500
  }
  [data-ws-id="44"] {
    overflow-x: hidden;
    overflow-y: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    font-size: 0.875rem;
    line-height: 1.375;
    color: rgba(100, 116, 139, 1);
    margin: 0px
  }
  [data-ws-id="48"] {
    background-color: transparent;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-top-left-radius: 0.375rem;
    border-top-right-radius: 0.375rem;
    border-bottom-right-radius: 0.375rem;
    border-bottom-left-radius: 0.375rem;
    font-size: 0.875rem;
    line-height: 1.25rem;
    font-weight: 500;
    color: currentColor;
    height: 2.5rem;
    padding-left: 0.75rem;
    padding-right: 0.75rem;
    --navigation-menu-trigger-icon-transform: 0deg;
    border: 0px solid rgba(226, 232, 240, 1)
  }
  [data-ws-id="48"]:disabled {
    pointer-events: none;
    opacity: 0.5
  }
  [data-ws-id="48"]:focus-visible {
    outline-offset: 2px;
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.8), 0 0 0 4px rgba(148, 163, 184, 1);
    outline: 2px solid transparent
  }
  [data-ws-id="48"]:hover {
    background-color: rgba(241, 245, 249, 0.9);
    color: rgba(15, 23, 42, 1)
  }
  [data-ws-id="48"][data-state=open] {
    --navigation-menu-trigger-icon-transform: 180deg
  }
  [data-ws-id="51"] {
    margin-left: 0.25rem;
    rotate: var(--navigation-menu-trigger-icon-transform);
    height: 1rem;
    width: 1rem;
    flex-grow: 0;
    transition-property: all;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 200ms
  }
  [data-ws-id="55"] {
    left: 0px;
    top: 0px;
    position: absolute;
    width: max-content;
    padding: 1rem
  }
  [data-ws-id="57"] {
    display: flex;
    row-gap: 1rem;
    column-gap: 1rem;
    padding: 0px
  }
  [data-ws-id="59"] {
    width: 16rem;
    display: flex;
    row-gap: 1rem;
    column-gap: 1rem;
    flex-direction: column
  }
  [data-ws-id="62"] {
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
    outline-offset: 2px;
    outline: 2px solid transparent;
    padding: 0.75rem
  }
  [data-ws-id="62"]:focus {
    background-color: rgba(241, 245, 249, 0.9);
    color: rgba(15, 23, 42, 1)
  }
  [data-ws-id="62"]:hover {
    background-color: rgba(241, 245, 249, 0.9);
    color: rgba(15, 23, 42, 1)
  }
  [data-ws-id="65"] {
    font-size: 0.875rem;
    line-height: 1;
    font-weight: 500
  }
  [data-ws-id="67"] {
    overflow-x: hidden;
    overflow-y: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    font-size: 0.875rem;
    line-height: 1.375;
    color: rgba(100, 116, 139, 1);
    margin: 0px
  }
  [data-ws-id="70"] {
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
    outline-offset: 2px;
    outline: 2px solid transparent;
    padding: 0.75rem
  }
  [data-ws-id="70"]:focus {
    background-color: rgba(241, 245, 249, 0.9);
    color: rgba(15, 23, 42, 1)
  }
  [data-ws-id="70"]:hover {
    background-color: rgba(241, 245, 249, 0.9);
    color: rgba(15, 23, 42, 1)
  }
  [data-ws-id="73"] {
    font-size: 0.875rem;
    line-height: 1;
    font-weight: 500
  }
  [data-ws-id="75"] {
    overflow-x: hidden;
    overflow-y: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    font-size: 0.875rem;
    line-height: 1.375;
    color: rgba(100, 116, 139, 1);
    margin: 0px
  }
  [data-ws-id="78"] {
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
    outline-offset: 2px;
    outline: 2px solid transparent;
    padding: 0.75rem
  }
  [data-ws-id="78"]:focus {
    background-color: rgba(241, 245, 249, 0.9);
    color: rgba(15, 23, 42, 1)
  }
  [data-ws-id="78"]:hover {
    background-color: rgba(241, 245, 249, 0.9);
    color: rgba(15, 23, 42, 1)
  }
  [data-ws-id="81"] {
    font-size: 0.875rem;
    line-height: 1;
    font-weight: 500
  }
  [data-ws-id="83"] {
    overflow-x: hidden;
    overflow-y: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    font-size: 0.875rem;
    line-height: 1.375;
    color: rgba(100, 116, 139, 1);
    margin: 0px
  }
  [data-ws-id="85"] {
    width: 16rem;
    display: flex;
    row-gap: 1rem;
    column-gap: 1rem;
    flex-direction: column
  }
  [data-ws-id="88"] {
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
    outline-offset: 2px;
    outline: 2px solid transparent;
    padding: 0.75rem
  }
  [data-ws-id="88"]:focus {
    background-color: rgba(241, 245, 249, 0.9);
    color: rgba(15, 23, 42, 1)
  }
  [data-ws-id="88"]:hover {
    background-color: rgba(241, 245, 249, 0.9);
    color: rgba(15, 23, 42, 1)
  }
  [data-ws-id="91"] {
    font-size: 0.875rem;
    line-height: 1;
    font-weight: 500
  }
  [data-ws-id="93"] {
    overflow-x: hidden;
    overflow-y: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    font-size: 0.875rem;
    line-height: 1.375;
    color: rgba(100, 116, 139, 1);
    margin: 0px
  }
  [data-ws-id="96"] {
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
    outline-offset: 2px;
    outline: 2px solid transparent;
    padding: 0.75rem
  }
  [data-ws-id="96"]:focus {
    background-color: rgba(241, 245, 249, 0.9);
    color: rgba(15, 23, 42, 1)
  }
  [data-ws-id="96"]:hover {
    background-color: rgba(241, 245, 249, 0.9);
    color: rgba(15, 23, 42, 1)
  }
  [data-ws-id="99"] {
    font-size: 0.875rem;
    line-height: 1;
    font-weight: 500
  }
  [data-ws-id="101"] {
    overflow-x: hidden;
    overflow-y: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    font-size: 0.875rem;
    line-height: 1.375;
    color: rgba(100, 116, 139, 1);
    margin: 0px
  }
  [data-ws-id="104"] {
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
    outline-offset: 2px;
    outline: 2px solid transparent;
    padding: 0.75rem
  }
  [data-ws-id="104"]:focus {
    background-color: rgba(241, 245, 249, 0.9);
    color: rgba(15, 23, 42, 1)
  }
  [data-ws-id="104"]:hover {
    background-color: rgba(241, 245, 249, 0.9);
    color: rgba(15, 23, 42, 1)
  }
  [data-ws-id="107"] {
    font-size: 0.875rem;
    line-height: 1;
    font-weight: 500
  }
  [data-ws-id="109"] {
    overflow-x: hidden;
    overflow-y: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    font-size: 0.875rem;
    line-height: 1.375;
    color: rgba(100, 116, 139, 1);
    margin: 0px
  }
  [data-ws-id="113"] {
    background-color: transparent;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-top-left-radius: 0.375rem;
    border-top-right-radius: 0.375rem;
    border-bottom-right-radius: 0.375rem;
    border-bottom-left-radius: 0.375rem;
    font-size: 0.875rem;
    line-height: 1.25rem;
    font-weight: 500;
    color: currentColor;
    height: 2.5rem;
    padding-left: 0.75rem;
    padding-right: 0.75rem;
    text-decoration-line: none;
    border: 0px solid rgba(226, 232, 240, 1)
  }
  [data-ws-id="113"]:disabled {
    pointer-events: none;
    opacity: 0.5
  }
  [data-ws-id="113"]:focus-visible {
    outline-offset: 2px;
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.8), 0 0 0 4px rgba(148, 163, 184, 1);
    outline: 2px solid transparent
  }
  [data-ws-id="113"]:hover {
    background-color: rgba(241, 245, 249, 0.9);
    color: rgba(15, 23, 42, 1)
  }
  [data-ws-id="115"] {
    position: absolute;
    left: 0px;
    top: 100%;
    display: flex;
    justify-content: center
  }
  [data-ws-id="117"] {
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
