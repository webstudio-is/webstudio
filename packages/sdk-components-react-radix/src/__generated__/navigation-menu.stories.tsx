import { type ReactNode, useState } from "react";
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

const Page = (props: { scripts?: ReactNode }) => {
  let [menuValue, set$menuValue] = useState<any>("");
  let value = menuValue;
  let onValueChange = (value: any) => {
    menuValue = value;
    set$menuValue(menuValue);
  };
  return (
    <Box data-ws-id="root" data-ws-component="Box">
      <NavigationMenu
        data-ws-id="1"
        data-ws-component="NavigationMenu"
        value={value}
        onValueChange={onValueChange}
      >
        <NavigationMenuList
          data-ws-id="7"
          data-ws-component="NavigationMenuList"
        >
          <NavigationMenuItem
            data-ws-id="9"
            data-ws-component="NavigationMenuItem"
            data-ws-index="0"
          >
            <NavigationMenuTrigger
              data-ws-id="10"
              data-ws-component="NavigationMenuTrigger"
            >
              <Button data-ws-id="11" data-ws-component="Button">
                <Text data-ws-id="13" data-ws-component="Text">
                  {"About"}
                </Text>
                <Box data-ws-id="14" data-ws-component="Box">
                  <HtmlEmbed
                    data-ws-id="16"
                    data-ws-component="HtmlEmbed"
                    code={
                      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width="100%" height="100%" style="display: block;"><path d="M4.04 6.284a.65.65 0 0 1 .92.001L8 9.335l3.04-3.05a.65.65 0 1 1 .921.918l-3.5 3.512a.65.65 0 0 1-.921 0L4.039 7.203a.65.65 0 0 1 .001-.92Z"/></svg>'
                    }
                  />
                </Box>
              </Button>
            </NavigationMenuTrigger>
            <NavigationMenuContent
              data-ws-id="18"
              data-ws-component="NavigationMenuContent"
              data-ws-index="0"
            >
              <Box data-ws-id="20" data-ws-component="Box">
                <Box data-ws-id="22" data-ws-component="Box">
                  {""}
                </Box>
                <Box data-ws-id="24" data-ws-component="Box">
                  <NavigationMenuLink
                    data-ws-id="26"
                    data-ws-component="NavigationMenuLink"
                  >
                    <Link
                      data-ws-id="27"
                      data-ws-component="Link"
                      href={"https://ui.shadcn.com/docs/components/sheet"}
                    >
                      <Text data-ws-id="30" data-ws-component="Text">
                        {"Sheet"}
                      </Text>
                      <Paragraph data-ws-id="32" data-ws-component="Paragraph">
                        {
                          "Extends the Dialog component to display content that complements the main content of the screen."
                        }
                      </Paragraph>
                    </Link>
                  </NavigationMenuLink>
                  <NavigationMenuLink
                    data-ws-id="34"
                    data-ws-component="NavigationMenuLink"
                  >
                    <Link
                      data-ws-id="35"
                      data-ws-component="Link"
                      href={
                        "https://ui.shadcn.com/docs/components/navigation-menu"
                      }
                    >
                      <Text data-ws-id="38" data-ws-component="Text">
                        {"Navigation Menu"}
                      </Text>
                      <Paragraph data-ws-id="40" data-ws-component="Paragraph">
                        {"A collection of links for navigating websites."}
                      </Paragraph>
                    </Link>
                  </NavigationMenuLink>
                  <NavigationMenuLink
                    data-ws-id="42"
                    data-ws-component="NavigationMenuLink"
                  >
                    <Link
                      data-ws-id="43"
                      data-ws-component="Link"
                      href={"https://ui.shadcn.com/docs/components/tabs"}
                    >
                      <Text data-ws-id="46" data-ws-component="Text">
                        {"Tabs"}
                      </Text>
                      <Paragraph data-ws-id="48" data-ws-component="Paragraph">
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
            data-ws-id="50"
            data-ws-component="NavigationMenuItem"
            data-ws-index="1"
          >
            <NavigationMenuTrigger
              data-ws-id="51"
              data-ws-component="NavigationMenuTrigger"
            >
              <Button data-ws-id="52" data-ws-component="Button">
                <Text data-ws-id="54" data-ws-component="Text">
                  {"Components"}
                </Text>
                <Box data-ws-id="55" data-ws-component="Box">
                  <HtmlEmbed
                    data-ws-id="57"
                    data-ws-component="HtmlEmbed"
                    code={
                      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width="100%" height="100%" style="display: block;"><path d="M4.04 6.284a.65.65 0 0 1 .92.001L8 9.335l3.04-3.05a.65.65 0 1 1 .921.918l-3.5 3.512a.65.65 0 0 1-.921 0L4.039 7.203a.65.65 0 0 1 .001-.92Z"/></svg>'
                    }
                  />
                </Box>
              </Button>
            </NavigationMenuTrigger>
            <NavigationMenuContent
              data-ws-id="59"
              data-ws-component="NavigationMenuContent"
              data-ws-index="1"
            >
              <Box data-ws-id="61" data-ws-component="Box">
                <Box data-ws-id="63" data-ws-component="Box">
                  <NavigationMenuLink
                    data-ws-id="65"
                    data-ws-component="NavigationMenuLink"
                  >
                    <Link
                      data-ws-id="66"
                      data-ws-component="Link"
                      href={"https://ui.shadcn.com/docs/components/accordion"}
                    >
                      <Text data-ws-id="69" data-ws-component="Text">
                        {"Accordion"}
                      </Text>
                      <Paragraph data-ws-id="71" data-ws-component="Paragraph">
                        {
                          "A vertically stacked set of interactive headings that each reveal a section of content."
                        }
                      </Paragraph>
                    </Link>
                  </NavigationMenuLink>
                  <NavigationMenuLink
                    data-ws-id="73"
                    data-ws-component="NavigationMenuLink"
                  >
                    <Link
                      data-ws-id="74"
                      data-ws-component="Link"
                      href={"https://ui.shadcn.com/docs/components/dialog"}
                    >
                      <Text data-ws-id="77" data-ws-component="Text">
                        {"Dialog"}
                      </Text>
                      <Paragraph data-ws-id="79" data-ws-component="Paragraph">
                        {
                          "A window overlaid on either the primary window or another dialog window, rendering the content underneath inert."
                        }
                      </Paragraph>
                    </Link>
                  </NavigationMenuLink>
                  <NavigationMenuLink
                    data-ws-id="81"
                    data-ws-component="NavigationMenuLink"
                  >
                    <Link
                      data-ws-id="82"
                      data-ws-component="Link"
                      href={"https://ui.shadcn.com/docs/components/collapsible"}
                    >
                      <Text data-ws-id="85" data-ws-component="Text">
                        {"Collapsible"}
                      </Text>
                      <Paragraph data-ws-id="87" data-ws-component="Paragraph">
                        {
                          "An interactive component which expands/collapses a panel."
                        }
                      </Paragraph>
                    </Link>
                  </NavigationMenuLink>
                </Box>
                <Box data-ws-id="89" data-ws-component="Box">
                  <NavigationMenuLink
                    data-ws-id="91"
                    data-ws-component="NavigationMenuLink"
                  >
                    <Link
                      data-ws-id="92"
                      data-ws-component="Link"
                      href={"https://ui.shadcn.com/docs/components/popover"}
                    >
                      <Text data-ws-id="95" data-ws-component="Text">
                        {"Popover"}
                      </Text>
                      <Paragraph data-ws-id="97" data-ws-component="Paragraph">
                        {
                          "Displays rich content in a portal, triggered by a button."
                        }
                      </Paragraph>
                    </Link>
                  </NavigationMenuLink>
                  <NavigationMenuLink
                    data-ws-id="99"
                    data-ws-component="NavigationMenuLink"
                  >
                    <Link
                      data-ws-id="100"
                      data-ws-component="Link"
                      href={"https://ui.shadcn.com/docs/components/tooltip"}
                    >
                      <Text data-ws-id="103" data-ws-component="Text">
                        {"Tooltip"}
                      </Text>
                      <Paragraph data-ws-id="105" data-ws-component="Paragraph">
                        {
                          "A popup that displays information related to an element when the element receives keyboard focus or the mouse hovers over it."
                        }
                      </Paragraph>
                    </Link>
                  </NavigationMenuLink>
                  <NavigationMenuLink
                    data-ws-id="107"
                    data-ws-component="NavigationMenuLink"
                  >
                    <Link
                      data-ws-id="108"
                      data-ws-component="Link"
                      href={"https://ui.shadcn.com/docs/components/button"}
                    >
                      <Text data-ws-id="111" data-ws-component="Text">
                        {"Button"}
                      </Text>
                      <Paragraph data-ws-id="113" data-ws-component="Paragraph">
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
            data-ws-id="115"
            data-ws-component="NavigationMenuItem"
            data-ws-index="2"
          >
            <NavigationMenuLink
              data-ws-id="116"
              data-ws-component="NavigationMenuLink"
            >
              <Link data-ws-id="117" data-ws-component="Link">
                {"Standalone"}
              </Link>
            </NavigationMenuLink>
          </NavigationMenuItem>
        </NavigationMenuList>
        <Box data-ws-id="119" data-ws-component="Box">
          <NavigationMenuViewport
            data-ws-id="121"
            data-ws-component="NavigationMenuViewport"
          />
        </Box>
      </NavigationMenu>
      {props.scripts}
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
  div:where([data-ws-component="NavigationMenu"]) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  div:where([data-ws-component="NavigationMenuList"]) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  div:where([data-ws-component="NavigationMenuItem"]) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  div:where([data-ws-component="NavigationMenuTrigger"]) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  button:where([data-ws-component="Button"]) {
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
  div:where([data-ws-component="Text"]) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px;
    min-height: 1em
  }
  div:where([data-ws-component="NavigationMenuContent"]) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  div:where([data-ws-component="NavigationMenuLink"]) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  a:where([data-ws-component="Link"]) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px;
    min-height: 1em;
    display: inline-block
  }
  p:where([data-ws-component="Paragraph"]) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  div:where([data-ws-component="NavigationMenuViewport"]) {
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
  [data-ws-id="7"] {
    padding-left: 0px;
    padding-right: 0px;
    padding-top: 0px;
    padding-bottom: 0px;
    margin-left: 0px;
    margin-right: 0px;
    margin-top: 0px;
    margin-bottom: 0px;
    display: flex;
    flex-grow: 1;
    flex-shrink: 1;
    flex-basis: 0%;
    list-style-type: none;
    align-items: center;
    justify-content: center;
    row-gap: 0.25rem;
    column-gap: 0.25rem
  }
  [data-ws-id="11"] {
    border-top-style: solid;
    border-right-style: solid;
    border-bottom-style: solid;
    border-left-style: solid;
    border-top-color: rgba(226, 232, 240, 1);
    border-right-color: rgba(226, 232, 240, 1);
    border-bottom-color: rgba(226, 232, 240, 1);
    border-left-color: rgba(226, 232, 240, 1);
    border-top-width: 0px;
    border-right-width: 0px;
    border-bottom-width: 0px;
    border-left-width: 0px;
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
    height: 2.5rem;
    padding-left: 0.75rem;
    padding-right: 0.75rem;
    --navigation-menu-trigger-icon-transform: 0deg
  }
  [data-ws-id="11"]:focus-visible {
    outline-width: 2px;
    outline-style: solid;
    outline-color: transparent;
    outline-offset: 2px;
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.8), 0 0 0 4px rgba(148, 163, 184, 1)
  }
  [data-ws-id="11"]:disabled {
    pointer-events: none;
    opacity: 0.5
  }
  [data-ws-id="11"]:hover {
    background-color: rgba(241, 245, 249, 0.9);
    color: rgba(15, 23, 42, 1)
  }
  [data-ws-id="11"][data-state=open] {
    --navigation-menu-trigger-icon-transform: 180deg
  }
  [data-ws-id="14"] {
    margin-left: 0.25rem;
    rotate: var(--navigation-menu-trigger-icon-transform);
    height: 1rem;
    width: 1rem;
    flex-grow: 0;
    transition-property: all;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 200ms
  }
  [data-ws-id="18"] {
    left: 0px;
    top: 0px;
    position: absolute;
    width: max-content;
    padding-left: 1rem;
    padding-right: 1rem;
    padding-top: 1rem;
    padding-bottom: 1rem
  }
  [data-ws-id="20"] {
    display: flex;
    row-gap: 1rem;
    column-gap: 1rem;
    padding-left: 0.5rem;
    padding-right: 0.5rem;
    padding-top: 0.5rem;
    padding-bottom: 0.5rem
  }
  [data-ws-id="22"] {
    background-color: rgba(226, 232, 240, 1);
    padding-left: 1rem;
    padding-right: 1rem;
    padding-top: 1rem;
    padding-bottom: 1rem;
    width: 12rem;
    border-top-left-radius: 0.375rem;
    border-top-right-radius: 0.375rem;
    border-bottom-right-radius: 0.375rem;
    border-bottom-left-radius: 0.375rem
  }
  [data-ws-id="24"] {
    width: 16rem;
    display: flex;
    row-gap: 1rem;
    column-gap: 1rem;
    flex-direction: column
  }
  [data-ws-id="27"] {
    color: inherit;
    display: flex;
    flex-direction: column;
    user-select: none;
    row-gap: 0.25rem;
    column-gap: 0.25rem;
    border-top-left-radius: 0.375rem;
    border-top-right-radius: 0.375rem;
    border-bottom-right-radius: 0.375rem;
    border-bottom-left-radius: 0.375rem;
    padding-left: 0.75rem;
    padding-right: 0.75rem;
    padding-top: 0.75rem;
    padding-bottom: 0.75rem;
    line-height: 1;
    text-decoration-line: none;
    outline-width: 2px;
    outline-style: solid;
    outline-color: transparent;
    outline-offset: 2px
  }
  [data-ws-id="27"]:hover {
    background-color: rgba(241, 245, 249, 0.9);
    color: rgba(15, 23, 42, 1)
  }
  [data-ws-id="27"]:focus {
    background-color: rgba(241, 245, 249, 0.9);
    color: rgba(15, 23, 42, 1)
  }
  [data-ws-id="30"] {
    font-size: 0.875rem;
    line-height: 1;
    font-weight: 500
  }
  [data-ws-id="32"] {
    margin-left: 0px;
    margin-right: 0px;
    margin-top: 0px;
    margin-bottom: 0px;
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    font-size: 0.875rem;
    line-height: 1.375;
    color: rgba(100, 116, 139, 1)
  }
  [data-ws-id="35"] {
    color: inherit;
    display: flex;
    flex-direction: column;
    user-select: none;
    row-gap: 0.25rem;
    column-gap: 0.25rem;
    border-top-left-radius: 0.375rem;
    border-top-right-radius: 0.375rem;
    border-bottom-right-radius: 0.375rem;
    border-bottom-left-radius: 0.375rem;
    padding-left: 0.75rem;
    padding-right: 0.75rem;
    padding-top: 0.75rem;
    padding-bottom: 0.75rem;
    line-height: 1;
    text-decoration-line: none;
    outline-width: 2px;
    outline-style: solid;
    outline-color: transparent;
    outline-offset: 2px
  }
  [data-ws-id="35"]:hover {
    background-color: rgba(241, 245, 249, 0.9);
    color: rgba(15, 23, 42, 1)
  }
  [data-ws-id="35"]:focus {
    background-color: rgba(241, 245, 249, 0.9);
    color: rgba(15, 23, 42, 1)
  }
  [data-ws-id="38"] {
    font-size: 0.875rem;
    line-height: 1;
    font-weight: 500
  }
  [data-ws-id="40"] {
    margin-left: 0px;
    margin-right: 0px;
    margin-top: 0px;
    margin-bottom: 0px;
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    font-size: 0.875rem;
    line-height: 1.375;
    color: rgba(100, 116, 139, 1)
  }
  [data-ws-id="43"] {
    color: inherit;
    display: flex;
    flex-direction: column;
    user-select: none;
    row-gap: 0.25rem;
    column-gap: 0.25rem;
    border-top-left-radius: 0.375rem;
    border-top-right-radius: 0.375rem;
    border-bottom-right-radius: 0.375rem;
    border-bottom-left-radius: 0.375rem;
    padding-left: 0.75rem;
    padding-right: 0.75rem;
    padding-top: 0.75rem;
    padding-bottom: 0.75rem;
    line-height: 1;
    text-decoration-line: none;
    outline-width: 2px;
    outline-style: solid;
    outline-color: transparent;
    outline-offset: 2px
  }
  [data-ws-id="43"]:hover {
    background-color: rgba(241, 245, 249, 0.9);
    color: rgba(15, 23, 42, 1)
  }
  [data-ws-id="43"]:focus {
    background-color: rgba(241, 245, 249, 0.9);
    color: rgba(15, 23, 42, 1)
  }
  [data-ws-id="46"] {
    font-size: 0.875rem;
    line-height: 1;
    font-weight: 500
  }
  [data-ws-id="48"] {
    margin-left: 0px;
    margin-right: 0px;
    margin-top: 0px;
    margin-bottom: 0px;
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    font-size: 0.875rem;
    line-height: 1.375;
    color: rgba(100, 116, 139, 1)
  }
  [data-ws-id="52"] {
    border-top-style: solid;
    border-right-style: solid;
    border-bottom-style: solid;
    border-left-style: solid;
    border-top-color: rgba(226, 232, 240, 1);
    border-right-color: rgba(226, 232, 240, 1);
    border-bottom-color: rgba(226, 232, 240, 1);
    border-left-color: rgba(226, 232, 240, 1);
    border-top-width: 0px;
    border-right-width: 0px;
    border-bottom-width: 0px;
    border-left-width: 0px;
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
    height: 2.5rem;
    padding-left: 0.75rem;
    padding-right: 0.75rem;
    --navigation-menu-trigger-icon-transform: 0deg
  }
  [data-ws-id="52"]:focus-visible {
    outline-width: 2px;
    outline-style: solid;
    outline-color: transparent;
    outline-offset: 2px;
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.8), 0 0 0 4px rgba(148, 163, 184, 1)
  }
  [data-ws-id="52"]:disabled {
    pointer-events: none;
    opacity: 0.5
  }
  [data-ws-id="52"]:hover {
    background-color: rgba(241, 245, 249, 0.9);
    color: rgba(15, 23, 42, 1)
  }
  [data-ws-id="52"][data-state=open] {
    --navigation-menu-trigger-icon-transform: 180deg
  }
  [data-ws-id="55"] {
    margin-left: 0.25rem;
    rotate: var(--navigation-menu-trigger-icon-transform);
    height: 1rem;
    width: 1rem;
    flex-grow: 0;
    transition-property: all;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 200ms
  }
  [data-ws-id="59"] {
    left: 0px;
    top: 0px;
    position: absolute;
    width: max-content;
    padding-left: 1rem;
    padding-right: 1rem;
    padding-top: 1rem;
    padding-bottom: 1rem
  }
  [data-ws-id="61"] {
    display: flex;
    row-gap: 1rem;
    column-gap: 1rem;
    padding-left: 0px;
    padding-right: 0px;
    padding-top: 0px;
    padding-bottom: 0px
  }
  [data-ws-id="63"] {
    width: 16rem;
    display: flex;
    row-gap: 1rem;
    column-gap: 1rem;
    flex-direction: column
  }
  [data-ws-id="66"] {
    color: inherit;
    display: flex;
    flex-direction: column;
    user-select: none;
    row-gap: 0.25rem;
    column-gap: 0.25rem;
    border-top-left-radius: 0.375rem;
    border-top-right-radius: 0.375rem;
    border-bottom-right-radius: 0.375rem;
    border-bottom-left-radius: 0.375rem;
    padding-left: 0.75rem;
    padding-right: 0.75rem;
    padding-top: 0.75rem;
    padding-bottom: 0.75rem;
    line-height: 1;
    text-decoration-line: none;
    outline-width: 2px;
    outline-style: solid;
    outline-color: transparent;
    outline-offset: 2px
  }
  [data-ws-id="66"]:hover {
    background-color: rgba(241, 245, 249, 0.9);
    color: rgba(15, 23, 42, 1)
  }
  [data-ws-id="66"]:focus {
    background-color: rgba(241, 245, 249, 0.9);
    color: rgba(15, 23, 42, 1)
  }
  [data-ws-id="69"] {
    font-size: 0.875rem;
    line-height: 1;
    font-weight: 500
  }
  [data-ws-id="71"] {
    margin-left: 0px;
    margin-right: 0px;
    margin-top: 0px;
    margin-bottom: 0px;
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    font-size: 0.875rem;
    line-height: 1.375;
    color: rgba(100, 116, 139, 1)
  }
  [data-ws-id="74"] {
    color: inherit;
    display: flex;
    flex-direction: column;
    user-select: none;
    row-gap: 0.25rem;
    column-gap: 0.25rem;
    border-top-left-radius: 0.375rem;
    border-top-right-radius: 0.375rem;
    border-bottom-right-radius: 0.375rem;
    border-bottom-left-radius: 0.375rem;
    padding-left: 0.75rem;
    padding-right: 0.75rem;
    padding-top: 0.75rem;
    padding-bottom: 0.75rem;
    line-height: 1;
    text-decoration-line: none;
    outline-width: 2px;
    outline-style: solid;
    outline-color: transparent;
    outline-offset: 2px
  }
  [data-ws-id="74"]:hover {
    background-color: rgba(241, 245, 249, 0.9);
    color: rgba(15, 23, 42, 1)
  }
  [data-ws-id="74"]:focus {
    background-color: rgba(241, 245, 249, 0.9);
    color: rgba(15, 23, 42, 1)
  }
  [data-ws-id="77"] {
    font-size: 0.875rem;
    line-height: 1;
    font-weight: 500
  }
  [data-ws-id="79"] {
    margin-left: 0px;
    margin-right: 0px;
    margin-top: 0px;
    margin-bottom: 0px;
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    font-size: 0.875rem;
    line-height: 1.375;
    color: rgba(100, 116, 139, 1)
  }
  [data-ws-id="82"] {
    color: inherit;
    display: flex;
    flex-direction: column;
    user-select: none;
    row-gap: 0.25rem;
    column-gap: 0.25rem;
    border-top-left-radius: 0.375rem;
    border-top-right-radius: 0.375rem;
    border-bottom-right-radius: 0.375rem;
    border-bottom-left-radius: 0.375rem;
    padding-left: 0.75rem;
    padding-right: 0.75rem;
    padding-top: 0.75rem;
    padding-bottom: 0.75rem;
    line-height: 1;
    text-decoration-line: none;
    outline-width: 2px;
    outline-style: solid;
    outline-color: transparent;
    outline-offset: 2px
  }
  [data-ws-id="82"]:hover {
    background-color: rgba(241, 245, 249, 0.9);
    color: rgba(15, 23, 42, 1)
  }
  [data-ws-id="82"]:focus {
    background-color: rgba(241, 245, 249, 0.9);
    color: rgba(15, 23, 42, 1)
  }
  [data-ws-id="85"] {
    font-size: 0.875rem;
    line-height: 1;
    font-weight: 500
  }
  [data-ws-id="87"] {
    margin-left: 0px;
    margin-right: 0px;
    margin-top: 0px;
    margin-bottom: 0px;
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    font-size: 0.875rem;
    line-height: 1.375;
    color: rgba(100, 116, 139, 1)
  }
  [data-ws-id="89"] {
    width: 16rem;
    display: flex;
    row-gap: 1rem;
    column-gap: 1rem;
    flex-direction: column
  }
  [data-ws-id="92"] {
    color: inherit;
    display: flex;
    flex-direction: column;
    user-select: none;
    row-gap: 0.25rem;
    column-gap: 0.25rem;
    border-top-left-radius: 0.375rem;
    border-top-right-radius: 0.375rem;
    border-bottom-right-radius: 0.375rem;
    border-bottom-left-radius: 0.375rem;
    padding-left: 0.75rem;
    padding-right: 0.75rem;
    padding-top: 0.75rem;
    padding-bottom: 0.75rem;
    line-height: 1;
    text-decoration-line: none;
    outline-width: 2px;
    outline-style: solid;
    outline-color: transparent;
    outline-offset: 2px
  }
  [data-ws-id="92"]:hover {
    background-color: rgba(241, 245, 249, 0.9);
    color: rgba(15, 23, 42, 1)
  }
  [data-ws-id="92"]:focus {
    background-color: rgba(241, 245, 249, 0.9);
    color: rgba(15, 23, 42, 1)
  }
  [data-ws-id="95"] {
    font-size: 0.875rem;
    line-height: 1;
    font-weight: 500
  }
  [data-ws-id="97"] {
    margin-left: 0px;
    margin-right: 0px;
    margin-top: 0px;
    margin-bottom: 0px;
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    font-size: 0.875rem;
    line-height: 1.375;
    color: rgba(100, 116, 139, 1)
  }
  [data-ws-id="100"] {
    color: inherit;
    display: flex;
    flex-direction: column;
    user-select: none;
    row-gap: 0.25rem;
    column-gap: 0.25rem;
    border-top-left-radius: 0.375rem;
    border-top-right-radius: 0.375rem;
    border-bottom-right-radius: 0.375rem;
    border-bottom-left-radius: 0.375rem;
    padding-left: 0.75rem;
    padding-right: 0.75rem;
    padding-top: 0.75rem;
    padding-bottom: 0.75rem;
    line-height: 1;
    text-decoration-line: none;
    outline-width: 2px;
    outline-style: solid;
    outline-color: transparent;
    outline-offset: 2px
  }
  [data-ws-id="100"]:hover {
    background-color: rgba(241, 245, 249, 0.9);
    color: rgba(15, 23, 42, 1)
  }
  [data-ws-id="100"]:focus {
    background-color: rgba(241, 245, 249, 0.9);
    color: rgba(15, 23, 42, 1)
  }
  [data-ws-id="103"] {
    font-size: 0.875rem;
    line-height: 1;
    font-weight: 500
  }
  [data-ws-id="105"] {
    margin-left: 0px;
    margin-right: 0px;
    margin-top: 0px;
    margin-bottom: 0px;
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    font-size: 0.875rem;
    line-height: 1.375;
    color: rgba(100, 116, 139, 1)
  }
  [data-ws-id="108"] {
    color: inherit;
    display: flex;
    flex-direction: column;
    user-select: none;
    row-gap: 0.25rem;
    column-gap: 0.25rem;
    border-top-left-radius: 0.375rem;
    border-top-right-radius: 0.375rem;
    border-bottom-right-radius: 0.375rem;
    border-bottom-left-radius: 0.375rem;
    padding-left: 0.75rem;
    padding-right: 0.75rem;
    padding-top: 0.75rem;
    padding-bottom: 0.75rem;
    line-height: 1;
    text-decoration-line: none;
    outline-width: 2px;
    outline-style: solid;
    outline-color: transparent;
    outline-offset: 2px
  }
  [data-ws-id="108"]:hover {
    background-color: rgba(241, 245, 249, 0.9);
    color: rgba(15, 23, 42, 1)
  }
  [data-ws-id="108"]:focus {
    background-color: rgba(241, 245, 249, 0.9);
    color: rgba(15, 23, 42, 1)
  }
  [data-ws-id="111"] {
    font-size: 0.875rem;
    line-height: 1;
    font-weight: 500
  }
  [data-ws-id="113"] {
    margin-left: 0px;
    margin-right: 0px;
    margin-top: 0px;
    margin-bottom: 0px;
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    font-size: 0.875rem;
    line-height: 1.375;
    color: rgba(100, 116, 139, 1)
  }
  [data-ws-id="117"] {
    border-top-style: solid;
    border-right-style: solid;
    border-bottom-style: solid;
    border-left-style: solid;
    border-top-color: rgba(226, 232, 240, 1);
    border-right-color: rgba(226, 232, 240, 1);
    border-bottom-color: rgba(226, 232, 240, 1);
    border-left-color: rgba(226, 232, 240, 1);
    border-top-width: 0px;
    border-right-width: 0px;
    border-bottom-width: 0px;
    border-left-width: 0px;
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
    height: 2.5rem;
    padding-left: 0.75rem;
    padding-right: 0.75rem;
    text-decoration-line: none;
    color: currentColor
  }
  [data-ws-id="117"]:focus-visible {
    outline-width: 2px;
    outline-style: solid;
    outline-color: transparent;
    outline-offset: 2px;
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.8), 0 0 0 4px rgba(148, 163, 184, 1)
  }
  [data-ws-id="117"]:disabled {
    pointer-events: none;
    opacity: 0.5
  }
  [data-ws-id="117"]:hover {
    background-color: rgba(241, 245, 249, 0.9);
    color: rgba(15, 23, 42, 1)
  }
  [data-ws-id="119"] {
    position: absolute;
    left: 0px;
    top: 100%;
    display: flex;
    justify-content: center
  }
  [data-ws-id="121"] {
    position: relative;
    margin-top: 0.375rem;
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
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
    height: var(--radix-navigation-menu-viewport-height);
    width: var(--radix-navigation-menu-viewport-width)
  }
}
      `}
        </style>
        <Page />
      </>
    );
  },
};

export { Story as NavigationMenu };
