import { useState } from "react";
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
  let [menuValue, set$menuValue] = useState<any>("");
  return (
    <Box data-ws-id="root" data-ws-component="Box">
      <NavigationMenu
        data-ws-id="1"
        data-ws-component="NavigationMenu"
        value={menuValue}
        onValueChange={(value: any) => {
          menuValue = value;
          set$menuValue(menuValue);
        }}
        className="crmoyyg cvxi4jc"
      >
        <NavigationMenuList
          data-ws-id="6"
          data-ws-component="NavigationMenuList"
          className="c11ubft8 c19nnvu2 c6epq1b cniw9w8 cawkm6w clp87x0 cvrokas crk8tjo c11xgi9i c1yubncr c1iq6hwp cv7p8tf cq9q4za clo3r8o cw9oyzl csjyi15 c1xv9rff"
        >
          <NavigationMenuItem
            data-ws-id="8"
            data-ws-component="NavigationMenuItem"
            data-ws-index="0"
          >
            <NavigationMenuTrigger
              data-ws-id="9"
              data-ws-component="NavigationMenuTrigger"
            >
              <Button
                data-ws-id="10"
                data-ws-component="Button"
                className="c17al2u0 c1ufcra4 c17gos5d cn4f13s c1wic2il cdem58j c102tttv cb204z1 cok6gp c1ebb32d c1ed2n1f c1an30v3 ca60kt0 c1oai8p0 clo3r8o cw9oyzl cuqxbts cg19ih8 c1479lj6 comq4ym c1qx3pju cut8gip c1qjvju3 c18kkil c16g5416 c111au61 c1uw27mb co0lfwl c1kn3u98 c2odgnt chlvjga c1jx7vpr c1jirpm3 ce92j53 c1dr421o c14ytp9r c1a713iq"
              >
                <Text data-ws-id="12" data-ws-component="Text">
                  {"About"}
                </Text>
                <Box
                  data-ws-id="13"
                  data-ws-component="Box"
                  className="c9je87j cwfkqjc c1pmpq0f c1yafs04 c11hichb cpr3ke2 c1wmnqxw c1aw50j7"
                >
                  <HtmlEmbed
                    data-ws-id="15"
                    data-ws-component="HtmlEmbed"
                    code={
                      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width="100%" height="100%" style="display: block;"><path d="M4.04 6.284a.65.65 0 0 1 .92.001L8 9.335l3.04-3.05a.65.65 0 1 1 .921.918l-3.5 3.512a.65.65 0 0 1-.921 0L4.039 7.203a.65.65 0 0 1 .001-.92Z"/></svg>'
                    }
                  />
                </Box>
              </Button>
            </NavigationMenuTrigger>
            <NavigationMenuContent
              data-ws-id="17"
              data-ws-component="NavigationMenuContent"
              data-ws-index="0"
              className="cboqcgi ccq2s6t ct2k8wg c12s9tcd c1c2uk29 c1x1m3cj c17g8s4n c657y94"
            >
              <Box
                data-ws-id="19"
                data-ws-component="Box"
                className="c11xgi9i ci4ea85 c13l7myj c1jmgbvo c1qmwsx9 cey1d5i cbnv1sn"
              >
                <Box
                  data-ws-id="21"
                  data-ws-component="Box"
                  className="csvgwzp c1c2uk29 c1x1m3cj c17g8s4n c657y94 c1fd7x2o cuqxbts cg19ih8 c1479lj6 comq4ym"
                >
                  {""}
                </Box>
                <Box
                  data-ws-id="23"
                  data-ws-component="Box"
                  className="c3e36dl c11xgi9i ci4ea85 c13l7myj cfd715b"
                >
                  <NavigationMenuLink
                    data-ws-id="25"
                    data-ws-component="NavigationMenuLink"
                  >
                    <Link
                      data-ws-id="26"
                      data-ws-component="Link"
                      href={"https://ui.shadcn.com/docs/components/sheet"}
                      className="c1lp1p2a c11xgi9i cfd715b cekw1i5 csjyi15 c1xv9rff cuqxbts cg19ih8 c1479lj6 comq4ym c16g5416 c111au61 c17g4cws ctolsm2 crxf9g c1gfew4a cxlxl0c c1gfzcg5 cohan28 c15roejc c1dr421o c14ytp9r c11eeprv c1rbq5ju"
                    >
                      <Text
                        data-ws-id="29"
                        data-ws-component="Text"
                        className="c1qx3pju crxf9g c1qjvju3"
                      >
                        {"Sheet"}
                      </Text>
                      <Paragraph
                        data-ws-id="31"
                        data-ws-component="Paragraph"
                        className="cawkm6w clp87x0 cvrokas crk8tjo c1p3lwwv c1ldl5ci c1rc3t1c c69w97g c1qx3pju c1ls6yv2 c1pcz91e"
                      >
                        {
                          "Extends the Dialog component to display content that complements the main content of the screen."
                        }
                      </Paragraph>
                    </Link>
                  </NavigationMenuLink>
                  <NavigationMenuLink
                    data-ws-id="33"
                    data-ws-component="NavigationMenuLink"
                  >
                    <Link
                      data-ws-id="34"
                      data-ws-component="Link"
                      href={
                        "https://ui.shadcn.com/docs/components/navigation-menu"
                      }
                      className="c1lp1p2a c11xgi9i cfd715b cekw1i5 csjyi15 c1xv9rff cuqxbts cg19ih8 c1479lj6 comq4ym c16g5416 c111au61 c17g4cws ctolsm2 crxf9g c1gfew4a cxlxl0c c1gfzcg5 cohan28 c15roejc c1dr421o c14ytp9r c11eeprv c1rbq5ju"
                    >
                      <Text
                        data-ws-id="37"
                        data-ws-component="Text"
                        className="c1qx3pju crxf9g c1qjvju3"
                      >
                        {"Navigation Menu"}
                      </Text>
                      <Paragraph
                        data-ws-id="39"
                        data-ws-component="Paragraph"
                        className="cawkm6w clp87x0 cvrokas crk8tjo c1p3lwwv c1ldl5ci c1rc3t1c c69w97g c1qx3pju c1ls6yv2 c1pcz91e"
                      >
                        {"A collection of links for navigating websites."}
                      </Paragraph>
                    </Link>
                  </NavigationMenuLink>
                  <NavigationMenuLink
                    data-ws-id="41"
                    data-ws-component="NavigationMenuLink"
                  >
                    <Link
                      data-ws-id="42"
                      data-ws-component="Link"
                      href={"https://ui.shadcn.com/docs/components/tabs"}
                      className="c1lp1p2a c11xgi9i cfd715b cekw1i5 csjyi15 c1xv9rff cuqxbts cg19ih8 c1479lj6 comq4ym c16g5416 c111au61 c17g4cws ctolsm2 crxf9g c1gfew4a cxlxl0c c1gfzcg5 cohan28 c15roejc c1dr421o c14ytp9r c11eeprv c1rbq5ju"
                    >
                      <Text
                        data-ws-id="45"
                        data-ws-component="Text"
                        className="c1qx3pju crxf9g c1qjvju3"
                      >
                        {"Tabs"}
                      </Text>
                      <Paragraph
                        data-ws-id="47"
                        data-ws-component="Paragraph"
                        className="cawkm6w clp87x0 cvrokas crk8tjo c1p3lwwv c1ldl5ci c1rc3t1c c69w97g c1qx3pju c1ls6yv2 c1pcz91e"
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
            data-ws-id="49"
            data-ws-component="NavigationMenuItem"
            data-ws-index="1"
          >
            <NavigationMenuTrigger
              data-ws-id="50"
              data-ws-component="NavigationMenuTrigger"
            >
              <Button
                data-ws-id="51"
                data-ws-component="Button"
                className="c17al2u0 c1ufcra4 c17gos5d cn4f13s c1wic2il cdem58j c102tttv cb204z1 cok6gp c1ebb32d c1ed2n1f c1an30v3 ca60kt0 c1oai8p0 clo3r8o cw9oyzl cuqxbts cg19ih8 c1479lj6 comq4ym c1qx3pju cut8gip c1qjvju3 c18kkil c16g5416 c111au61 c1uw27mb co0lfwl c1kn3u98 c2odgnt chlvjga c1jx7vpr c1jirpm3 ce92j53 c1dr421o c14ytp9r c1a713iq"
              >
                <Text data-ws-id="53" data-ws-component="Text">
                  {"Components"}
                </Text>
                <Box
                  data-ws-id="54"
                  data-ws-component="Box"
                  className="c9je87j cwfkqjc c1pmpq0f c1yafs04 c11hichb cpr3ke2 c1wmnqxw c1aw50j7"
                >
                  <HtmlEmbed
                    data-ws-id="56"
                    data-ws-component="HtmlEmbed"
                    code={
                      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width="100%" height="100%" style="display: block;"><path d="M4.04 6.284a.65.65 0 0 1 .92.001L8 9.335l3.04-3.05a.65.65 0 1 1 .921.918l-3.5 3.512a.65.65 0 0 1-.921 0L4.039 7.203a.65.65 0 0 1 .001-.92Z"/></svg>'
                    }
                  />
                </Box>
              </Button>
            </NavigationMenuTrigger>
            <NavigationMenuContent
              data-ws-id="58"
              data-ws-component="NavigationMenuContent"
              data-ws-index="1"
              className="cboqcgi ccq2s6t ct2k8wg c12s9tcd c1c2uk29 c1x1m3cj c17g8s4n c657y94"
            >
              <Box
                data-ws-id="60"
                data-ws-component="Box"
                className="c11xgi9i ci4ea85 c13l7myj c11ubft8 c19nnvu2 c6epq1b cniw9w8"
              >
                <Box
                  data-ws-id="62"
                  data-ws-component="Box"
                  className="c3e36dl c11xgi9i ci4ea85 c13l7myj cfd715b"
                >
                  <NavigationMenuLink
                    data-ws-id="64"
                    data-ws-component="NavigationMenuLink"
                  >
                    <Link
                      data-ws-id="65"
                      data-ws-component="Link"
                      href={"https://ui.shadcn.com/docs/components/accordion"}
                      className="c1lp1p2a c11xgi9i cfd715b cekw1i5 csjyi15 c1xv9rff cuqxbts cg19ih8 c1479lj6 comq4ym c16g5416 c111au61 c17g4cws ctolsm2 crxf9g c1gfew4a cxlxl0c c1gfzcg5 cohan28 c15roejc c1dr421o c14ytp9r c11eeprv c1rbq5ju"
                    >
                      <Text
                        data-ws-id="68"
                        data-ws-component="Text"
                        className="c1qx3pju crxf9g c1qjvju3"
                      >
                        {"Accordion"}
                      </Text>
                      <Paragraph
                        data-ws-id="70"
                        data-ws-component="Paragraph"
                        className="cawkm6w clp87x0 cvrokas crk8tjo c1p3lwwv c1ldl5ci c1rc3t1c c69w97g c1qx3pju c1ls6yv2 c1pcz91e"
                      >
                        {
                          "A vertically stacked set of interactive headings that each reveal a section of content."
                        }
                      </Paragraph>
                    </Link>
                  </NavigationMenuLink>
                  <NavigationMenuLink
                    data-ws-id="72"
                    data-ws-component="NavigationMenuLink"
                  >
                    <Link
                      data-ws-id="73"
                      data-ws-component="Link"
                      href={"https://ui.shadcn.com/docs/components/dialog"}
                      className="c1lp1p2a c11xgi9i cfd715b cekw1i5 csjyi15 c1xv9rff cuqxbts cg19ih8 c1479lj6 comq4ym c16g5416 c111au61 c17g4cws ctolsm2 crxf9g c1gfew4a cxlxl0c c1gfzcg5 cohan28 c15roejc c1dr421o c14ytp9r c11eeprv c1rbq5ju"
                    >
                      <Text
                        data-ws-id="76"
                        data-ws-component="Text"
                        className="c1qx3pju crxf9g c1qjvju3"
                      >
                        {"Dialog"}
                      </Text>
                      <Paragraph
                        data-ws-id="78"
                        data-ws-component="Paragraph"
                        className="cawkm6w clp87x0 cvrokas crk8tjo c1p3lwwv c1ldl5ci c1rc3t1c c69w97g c1qx3pju c1ls6yv2 c1pcz91e"
                      >
                        {
                          "A window overlaid on either the primary window or another dialog window, rendering the content underneath inert."
                        }
                      </Paragraph>
                    </Link>
                  </NavigationMenuLink>
                  <NavigationMenuLink
                    data-ws-id="80"
                    data-ws-component="NavigationMenuLink"
                  >
                    <Link
                      data-ws-id="81"
                      data-ws-component="Link"
                      href={"https://ui.shadcn.com/docs/components/collapsible"}
                      className="c1lp1p2a c11xgi9i cfd715b cekw1i5 csjyi15 c1xv9rff cuqxbts cg19ih8 c1479lj6 comq4ym c16g5416 c111au61 c17g4cws ctolsm2 crxf9g c1gfew4a cxlxl0c c1gfzcg5 cohan28 c15roejc c1dr421o c14ytp9r c11eeprv c1rbq5ju"
                    >
                      <Text
                        data-ws-id="84"
                        data-ws-component="Text"
                        className="c1qx3pju crxf9g c1qjvju3"
                      >
                        {"Collapsible"}
                      </Text>
                      <Paragraph
                        data-ws-id="86"
                        data-ws-component="Paragraph"
                        className="cawkm6w clp87x0 cvrokas crk8tjo c1p3lwwv c1ldl5ci c1rc3t1c c69w97g c1qx3pju c1ls6yv2 c1pcz91e"
                      >
                        {
                          "An interactive component which expands/collapses a panel."
                        }
                      </Paragraph>
                    </Link>
                  </NavigationMenuLink>
                </Box>
                <Box
                  data-ws-id="88"
                  data-ws-component="Box"
                  className="c3e36dl c11xgi9i ci4ea85 c13l7myj cfd715b"
                >
                  <NavigationMenuLink
                    data-ws-id="90"
                    data-ws-component="NavigationMenuLink"
                  >
                    <Link
                      data-ws-id="91"
                      data-ws-component="Link"
                      href={"https://ui.shadcn.com/docs/components/popover"}
                      className="c1lp1p2a c11xgi9i cfd715b cekw1i5 csjyi15 c1xv9rff cuqxbts cg19ih8 c1479lj6 comq4ym c16g5416 c111au61 c17g4cws ctolsm2 crxf9g c1gfew4a cxlxl0c c1gfzcg5 cohan28 c15roejc c1dr421o c14ytp9r c11eeprv c1rbq5ju"
                    >
                      <Text
                        data-ws-id="94"
                        data-ws-component="Text"
                        className="c1qx3pju crxf9g c1qjvju3"
                      >
                        {"Popover"}
                      </Text>
                      <Paragraph
                        data-ws-id="96"
                        data-ws-component="Paragraph"
                        className="cawkm6w clp87x0 cvrokas crk8tjo c1p3lwwv c1ldl5ci c1rc3t1c c69w97g c1qx3pju c1ls6yv2 c1pcz91e"
                      >
                        {
                          "Displays rich content in a portal, triggered by a button."
                        }
                      </Paragraph>
                    </Link>
                  </NavigationMenuLink>
                  <NavigationMenuLink
                    data-ws-id="98"
                    data-ws-component="NavigationMenuLink"
                  >
                    <Link
                      data-ws-id="99"
                      data-ws-component="Link"
                      href={"https://ui.shadcn.com/docs/components/tooltip"}
                      className="c1lp1p2a c11xgi9i cfd715b cekw1i5 csjyi15 c1xv9rff cuqxbts cg19ih8 c1479lj6 comq4ym c16g5416 c111au61 c17g4cws ctolsm2 crxf9g c1gfew4a cxlxl0c c1gfzcg5 cohan28 c15roejc c1dr421o c14ytp9r c11eeprv c1rbq5ju"
                    >
                      <Text
                        data-ws-id="102"
                        data-ws-component="Text"
                        className="c1qx3pju crxf9g c1qjvju3"
                      >
                        {"Tooltip"}
                      </Text>
                      <Paragraph
                        data-ws-id="104"
                        data-ws-component="Paragraph"
                        className="cawkm6w clp87x0 cvrokas crk8tjo c1p3lwwv c1ldl5ci c1rc3t1c c69w97g c1qx3pju c1ls6yv2 c1pcz91e"
                      >
                        {
                          "A popup that displays information related to an element when the element receives keyboard focus or the mouse hovers over it."
                        }
                      </Paragraph>
                    </Link>
                  </NavigationMenuLink>
                  <NavigationMenuLink
                    data-ws-id="106"
                    data-ws-component="NavigationMenuLink"
                  >
                    <Link
                      data-ws-id="107"
                      data-ws-component="Link"
                      href={"https://ui.shadcn.com/docs/components/button"}
                      className="c1lp1p2a c11xgi9i cfd715b cekw1i5 csjyi15 c1xv9rff cuqxbts cg19ih8 c1479lj6 comq4ym c16g5416 c111au61 c17g4cws ctolsm2 crxf9g c1gfew4a cxlxl0c c1gfzcg5 cohan28 c15roejc c1dr421o c14ytp9r c11eeprv c1rbq5ju"
                    >
                      <Text
                        data-ws-id="110"
                        data-ws-component="Text"
                        className="c1qx3pju crxf9g c1qjvju3"
                      >
                        {"Button"}
                      </Text>
                      <Paragraph
                        data-ws-id="112"
                        data-ws-component="Paragraph"
                        className="cawkm6w clp87x0 cvrokas crk8tjo c1p3lwwv c1ldl5ci c1rc3t1c c69w97g c1qx3pju c1ls6yv2 c1pcz91e"
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
            data-ws-id="114"
            data-ws-component="NavigationMenuItem"
            data-ws-index="2"
          >
            <NavigationMenuLink
              data-ws-id="115"
              data-ws-component="NavigationMenuLink"
            >
              <Link
                data-ws-id="116"
                data-ws-component="Link"
                className="c17al2u0 c1ufcra4 c17gos5d cn4f13s c1wic2il cdem58j c102tttv cb204z1 cok6gp c1ebb32d c1ed2n1f c1an30v3 ca60kt0 c1oai8p0 clo3r8o cw9oyzl cuqxbts cg19ih8 c1479lj6 comq4ym c1qx3pju cut8gip c1qjvju3 c18kkil c16g5416 c111au61 c1gfew4a c1hdhil0 co0lfwl c1kn3u98 c2odgnt chlvjga c1jx7vpr c1jirpm3 ce92j53 c1dr421o c14ytp9r"
              >
                {"Standalone"}
              </Link>
            </NavigationMenuLink>
          </NavigationMenuItem>
        </NavigationMenuList>
        <Box
          data-ws-id="118"
          data-ws-component="Box"
          className="ct2k8wg cboqcgi coe4ay6 c11xgi9i cw9oyzl"
        >
          <NavigationMenuViewport
            data-ws-id="120"
            data-ws-component="NavigationMenuViewport"
            className="crmoyyg cg2jhpq c1p3lwwv cuqxbts cg19ih8 c1479lj6 comq4ym c17al2u0 c1ufcra4 c17gos5d cn4f13s c1wic2il cdem58j c102tttv cb204z1 ck2qarh c1nxbatd caktpzb c1bm526f c1rt44f4 cwi0ez9 c1ii9nza c53wwee c1daganl"
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
}@media all {
  .crmoyyg {
    position: relative
  }
  .cvxi4jc {
    max-width: max-content
  }
  .c11ubft8 {
    padding-left: 0px
  }
  .c19nnvu2 {
    padding-right: 0px
  }
  .c6epq1b {
    padding-top: 0px
  }
  .cniw9w8 {
    padding-bottom: 0px
  }
  .cawkm6w {
    margin-left: 0px
  }
  .clp87x0 {
    margin-right: 0px
  }
  .cvrokas {
    margin-top: 0px
  }
  .crk8tjo {
    margin-bottom: 0px
  }
  .c11xgi9i {
    display: flex
  }
  .c1yubncr {
    flex-grow: 1
  }
  .c1iq6hwp {
    flex-shrink: 1
  }
  .cv7p8tf {
    flex-basis: 0%
  }
  .cq9q4za {
    list-style-type: none
  }
  .clo3r8o {
    align-items: center
  }
  .cw9oyzl {
    justify-content: center
  }
  .csjyi15 {
    row-gap: 0.25rem
  }
  .c1xv9rff {
    column-gap: 0.25rem
  }
  .c17al2u0 {
    border-top-style: solid
  }
  .c1ufcra4 {
    border-right-style: solid
  }
  .c17gos5d {
    border-bottom-style: solid
  }
  .cn4f13s {
    border-left-style: solid
  }
  .c1wic2il {
    border-top-color: rgba(226, 232, 240, 1)
  }
  .cdem58j {
    border-right-color: rgba(226, 232, 240, 1)
  }
  .c102tttv {
    border-bottom-color: rgba(226, 232, 240, 1)
  }
  .cb204z1 {
    border-left-color: rgba(226, 232, 240, 1)
  }
  .cok6gp {
    border-top-width: 0px
  }
  .c1ebb32d {
    border-right-width: 0px
  }
  .c1ed2n1f {
    border-bottom-width: 0px
  }
  .c1an30v3 {
    border-left-width: 0px
  }
  .ca60kt0 {
    background-color: transparent
  }
  .c1oai8p0 {
    display: inline-flex
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
  .c1qx3pju {
    font-size: 0.875rem
  }
  .cut8gip {
    line-height: 1.25rem
  }
  .c1qjvju3 {
    font-weight: 500
  }
  .c18kkil {
    height: 2.5rem
  }
  .c16g5416 {
    padding-left: 0.75rem
  }
  .c111au61 {
    padding-right: 0.75rem
  }
  .c1uw27mb {
    --navigation-menu-trigger-icon-transform: 0deg
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
  .c1dr421o:hover {
    background-color: rgba(241, 245, 249, 0.9)
  }
  .c14ytp9r:hover {
    color: rgba(15, 23, 42, 1)
  }
  .c1a713iq[data-state=open] {
    --navigation-menu-trigger-icon-transform: 180deg
  }
  .c9je87j {
    margin-left: 0.25rem
  }
  .cwfkqjc {
    rotate: var(--navigation-menu-trigger-icon-transform)
  }
  .c1pmpq0f {
    height: 1rem
  }
  .c1yafs04 {
    width: 1rem
  }
  .c11hichb {
    flex-grow: 0
  }
  .cpr3ke2 {
    transition-property: all
  }
  .c1wmnqxw {
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1)
  }
  .c1aw50j7 {
    transition-duration: 200ms
  }
  .cboqcgi {
    left: 0px
  }
  .ccq2s6t {
    top: 0px
  }
  .ct2k8wg {
    position: absolute
  }
  .c12s9tcd {
    width: max-content
  }
  .c1c2uk29 {
    padding-left: 1rem
  }
  .c1x1m3cj {
    padding-right: 1rem
  }
  .c17g8s4n {
    padding-top: 1rem
  }
  .c657y94 {
    padding-bottom: 1rem
  }
  .ci4ea85 {
    row-gap: 1rem
  }
  .c13l7myj {
    column-gap: 1rem
  }
  .c1jmgbvo {
    padding-left: 0.5rem
  }
  .c1qmwsx9 {
    padding-right: 0.5rem
  }
  .cey1d5i {
    padding-top: 0.5rem
  }
  .cbnv1sn {
    padding-bottom: 0.5rem
  }
  .csvgwzp {
    background-color: rgba(226, 232, 240, 1)
  }
  .c1fd7x2o {
    width: 12rem
  }
  .c3e36dl {
    width: 16rem
  }
  .cfd715b {
    flex-direction: column
  }
  .c1lp1p2a {
    color: inherit
  }
  .cekw1i5 {
    user-select: none
  }
  .c17g4cws {
    padding-top: 0.75rem
  }
  .ctolsm2 {
    padding-bottom: 0.75rem
  }
  .crxf9g {
    line-height: 1
  }
  .c1gfew4a {
    text-decoration-line: none
  }
  .cxlxl0c {
    outline-width: 2px
  }
  .c1gfzcg5 {
    outline-style: solid
  }
  .cohan28 {
    outline-color: transparent
  }
  .c15roejc {
    outline-offset: 2px
  }
  .c11eeprv:focus {
    background-color: rgba(241, 245, 249, 0.9)
  }
  .c1rbq5ju:focus {
    color: rgba(15, 23, 42, 1)
  }
  .c1p3lwwv {
    overflow: hidden
  }
  .c1ldl5ci {
    display: -webkit-box
  }
  .c1rc3t1c {
    -webkit-box-orient: vertical
  }
  .c69w97g {
    -webkit-line-clamp: 2
  }
  .c1ls6yv2 {
    line-height: 1.375
  }
  .c1pcz91e {
    color: rgba(100, 116, 139, 1)
  }
  .c1hdhil0 {
    color: currentColor
  }
  .coe4ay6 {
    top: 100%
  }
  .cg2jhpq {
    margin-top: 0.375rem
  }
  .ck2qarh {
    border-top-width: 1px
  }
  .c1nxbatd {
    border-right-width: 1px
  }
  .caktpzb {
    border-bottom-width: 1px
  }
  .c1bm526f {
    border-left-width: 1px
  }
  .c1rt44f4 {
    background-color: rgba(255, 255, 255, 1)
  }
  .cwi0ez9 {
    color: rgba(2, 8, 23, 1)
  }
  .c1ii9nza {
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)
  }
  .c53wwee {
    height: var(--radix-navigation-menu-viewport-height)
  }
  .c1daganl {
    width: var(--radix-navigation-menu-viewport-width)
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
