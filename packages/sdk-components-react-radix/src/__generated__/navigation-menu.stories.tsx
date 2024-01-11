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

type Params = Record<string, string | undefined>;
type Resources = Record<string, unknown>;
const Page = (_props: { params: Params; resources: Resources }) => {
  let [menuValue, set$menuValue] = useState<any>("");
  let onValueChange = (value: any) => {
    menuValue = value;
    set$menuValue(menuValue);
  };
  return (
    <Box data-ws-id="root" data-ws-component="Box">
      <NavigationMenu
        data-ws-id="1"
        data-ws-component="NavigationMenu"
        value={menuValue}
        onValueChange={onValueChange}
        className="cnhoj7b c1a0z5in"
      >
        <NavigationMenuList
          data-ws-id="6"
          data-ws-component="NavigationMenuList"
          className="c1hxtwzc c1j0bzjz cbjj14v c15sjadq c3rzppk c17ybgbw c1u5xdcd cdf5ze5 c6gk6ar cn4ngym c1ee1pe1 c1xcrn9h csrd2h5 c4v7k5r cvzkkb6 cu0fd6l c8098d3"
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
                className="c1inucbi c1dab7w1 c1uf7v01 czynn8e c6z96ps c9t5qyz c1x5uwe6 csnt51l c1v4k4ip c2iozhh c1j5pqo1 cmqevnc cvxnx00 c1mnuzt9 c4v7k5r cvzkkb6 cym38jd cqimob0 c2tr68t cjdtj3f c1mfk609 c121vm9z cwry1sa c1b8xvex c1kc4g4w c1hi2fgx c1jrmp29 c1t6bql4 czph7hf cncn1ro cb270vo c1rgsd1l c1srwcmr c1grhw0w c8xqq0k cjs8iie c157d2k6"
              >
                <Text data-ws-id="12" data-ws-component="Text">
                  {"About"}
                </Text>
                <Box
                  data-ws-id="13"
                  data-ws-component="Box"
                  className="ck5mafm cm547tf c18dp5gp clw3og8 c1qmz361 cu8n5i6 cqhjzs2 c1498b83"
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
              className="c17k6ftv ci9y33x c1kb88y7 cbgnvea c1y5f9qa cjw7gx9 c1mdun74 c1bfvzwl"
            >
              <Box
                data-ws-id="19"
                data-ws-component="Box"
                className="c6gk6ar cb99ak4 ctl64vj cbxivag c18gyxfs c1peybss chh2z1n"
              >
                <Box
                  data-ws-id="21"
                  data-ws-component="Box"
                  className="c1af0hjb c1y5f9qa cjw7gx9 c1mdun74 c1bfvzwl c1187wgd cym38jd cqimob0 c2tr68t cjdtj3f"
                >
                  {""}
                </Box>
                <Box
                  data-ws-id="23"
                  data-ws-component="Box"
                  className="c88y2pm c6gk6ar cb99ak4 ctl64vj c13wsd00"
                >
                  <NavigationMenuLink
                    data-ws-id="25"
                    data-ws-component="NavigationMenuLink"
                  >
                    <Link
                      data-ws-id="26"
                      data-ws-component="Link"
                      href={"https://ui.shadcn.com/docs/components/sheet"}
                      className="c1wv658c c6gk6ar c13wsd00 c1hl4mbg cu0fd6l c8098d3 cym38jd cqimob0 c2tr68t cjdtj3f c1kc4g4w c1hi2fgx c16a2e8i c1y90k37 cvjxq2s chhysup c601nqx c9i3lxo c1sz664l cm8bc7h c8xqq0k cjs8iie cbt1ziu c1ci4uzu"
                    >
                      <Text
                        data-ws-id="29"
                        data-ws-component="Text"
                        className="c1mfk609 cvjxq2s cwry1sa"
                      >
                        {"Sheet"}
                      </Text>
                      <Paragraph
                        data-ws-id="31"
                        data-ws-component="Paragraph"
                        className="c3rzppk c17ybgbw c1u5xdcd cdf5ze5 c1e2gixt c16sc1pt c78rgey c1mxykr c1mfk609 c18mq0f5 caa8yt3"
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
                      className="c1wv658c c6gk6ar c13wsd00 c1hl4mbg cu0fd6l c8098d3 cym38jd cqimob0 c2tr68t cjdtj3f c1kc4g4w c1hi2fgx c16a2e8i c1y90k37 cvjxq2s chhysup c601nqx c9i3lxo c1sz664l cm8bc7h c8xqq0k cjs8iie cbt1ziu c1ci4uzu"
                    >
                      <Text
                        data-ws-id="37"
                        data-ws-component="Text"
                        className="c1mfk609 cvjxq2s cwry1sa"
                      >
                        {"Navigation Menu"}
                      </Text>
                      <Paragraph
                        data-ws-id="39"
                        data-ws-component="Paragraph"
                        className="c3rzppk c17ybgbw c1u5xdcd cdf5ze5 c1e2gixt c16sc1pt c78rgey c1mxykr c1mfk609 c18mq0f5 caa8yt3"
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
                      className="c1wv658c c6gk6ar c13wsd00 c1hl4mbg cu0fd6l c8098d3 cym38jd cqimob0 c2tr68t cjdtj3f c1kc4g4w c1hi2fgx c16a2e8i c1y90k37 cvjxq2s chhysup c601nqx c9i3lxo c1sz664l cm8bc7h c8xqq0k cjs8iie cbt1ziu c1ci4uzu"
                    >
                      <Text
                        data-ws-id="45"
                        data-ws-component="Text"
                        className="c1mfk609 cvjxq2s cwry1sa"
                      >
                        {"Tabs"}
                      </Text>
                      <Paragraph
                        data-ws-id="47"
                        data-ws-component="Paragraph"
                        className="c3rzppk c17ybgbw c1u5xdcd cdf5ze5 c1e2gixt c16sc1pt c78rgey c1mxykr c1mfk609 c18mq0f5 caa8yt3"
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
                className="c1inucbi c1dab7w1 c1uf7v01 czynn8e c6z96ps c9t5qyz c1x5uwe6 csnt51l c1v4k4ip c2iozhh c1j5pqo1 cmqevnc cvxnx00 c1mnuzt9 c4v7k5r cvzkkb6 cym38jd cqimob0 c2tr68t cjdtj3f c1mfk609 c121vm9z cwry1sa c1b8xvex c1kc4g4w c1hi2fgx c1jrmp29 c1t6bql4 czph7hf cncn1ro cb270vo c1rgsd1l c1srwcmr c1grhw0w c8xqq0k cjs8iie c157d2k6"
              >
                <Text data-ws-id="53" data-ws-component="Text">
                  {"Components"}
                </Text>
                <Box
                  data-ws-id="54"
                  data-ws-component="Box"
                  className="ck5mafm cm547tf c18dp5gp clw3og8 c1qmz361 cu8n5i6 cqhjzs2 c1498b83"
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
              className="c17k6ftv ci9y33x c1kb88y7 cbgnvea c1y5f9qa cjw7gx9 c1mdun74 c1bfvzwl"
            >
              <Box
                data-ws-id="60"
                data-ws-component="Box"
                className="c6gk6ar cb99ak4 ctl64vj c1hxtwzc c1j0bzjz cbjj14v c15sjadq"
              >
                <Box
                  data-ws-id="62"
                  data-ws-component="Box"
                  className="c88y2pm c6gk6ar cb99ak4 ctl64vj c13wsd00"
                >
                  <NavigationMenuLink
                    data-ws-id="64"
                    data-ws-component="NavigationMenuLink"
                  >
                    <Link
                      data-ws-id="65"
                      data-ws-component="Link"
                      href={"https://ui.shadcn.com/docs/components/accordion"}
                      className="c1wv658c c6gk6ar c13wsd00 c1hl4mbg cu0fd6l c8098d3 cym38jd cqimob0 c2tr68t cjdtj3f c1kc4g4w c1hi2fgx c16a2e8i c1y90k37 cvjxq2s chhysup c601nqx c9i3lxo c1sz664l cm8bc7h c8xqq0k cjs8iie cbt1ziu c1ci4uzu"
                    >
                      <Text
                        data-ws-id="68"
                        data-ws-component="Text"
                        className="c1mfk609 cvjxq2s cwry1sa"
                      >
                        {"Accordion"}
                      </Text>
                      <Paragraph
                        data-ws-id="70"
                        data-ws-component="Paragraph"
                        className="c3rzppk c17ybgbw c1u5xdcd cdf5ze5 c1e2gixt c16sc1pt c78rgey c1mxykr c1mfk609 c18mq0f5 caa8yt3"
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
                      className="c1wv658c c6gk6ar c13wsd00 c1hl4mbg cu0fd6l c8098d3 cym38jd cqimob0 c2tr68t cjdtj3f c1kc4g4w c1hi2fgx c16a2e8i c1y90k37 cvjxq2s chhysup c601nqx c9i3lxo c1sz664l cm8bc7h c8xqq0k cjs8iie cbt1ziu c1ci4uzu"
                    >
                      <Text
                        data-ws-id="76"
                        data-ws-component="Text"
                        className="c1mfk609 cvjxq2s cwry1sa"
                      >
                        {"Dialog"}
                      </Text>
                      <Paragraph
                        data-ws-id="78"
                        data-ws-component="Paragraph"
                        className="c3rzppk c17ybgbw c1u5xdcd cdf5ze5 c1e2gixt c16sc1pt c78rgey c1mxykr c1mfk609 c18mq0f5 caa8yt3"
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
                      className="c1wv658c c6gk6ar c13wsd00 c1hl4mbg cu0fd6l c8098d3 cym38jd cqimob0 c2tr68t cjdtj3f c1kc4g4w c1hi2fgx c16a2e8i c1y90k37 cvjxq2s chhysup c601nqx c9i3lxo c1sz664l cm8bc7h c8xqq0k cjs8iie cbt1ziu c1ci4uzu"
                    >
                      <Text
                        data-ws-id="84"
                        data-ws-component="Text"
                        className="c1mfk609 cvjxq2s cwry1sa"
                      >
                        {"Collapsible"}
                      </Text>
                      <Paragraph
                        data-ws-id="86"
                        data-ws-component="Paragraph"
                        className="c3rzppk c17ybgbw c1u5xdcd cdf5ze5 c1e2gixt c16sc1pt c78rgey c1mxykr c1mfk609 c18mq0f5 caa8yt3"
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
                  className="c88y2pm c6gk6ar cb99ak4 ctl64vj c13wsd00"
                >
                  <NavigationMenuLink
                    data-ws-id="90"
                    data-ws-component="NavigationMenuLink"
                  >
                    <Link
                      data-ws-id="91"
                      data-ws-component="Link"
                      href={"https://ui.shadcn.com/docs/components/popover"}
                      className="c1wv658c c6gk6ar c13wsd00 c1hl4mbg cu0fd6l c8098d3 cym38jd cqimob0 c2tr68t cjdtj3f c1kc4g4w c1hi2fgx c16a2e8i c1y90k37 cvjxq2s chhysup c601nqx c9i3lxo c1sz664l cm8bc7h c8xqq0k cjs8iie cbt1ziu c1ci4uzu"
                    >
                      <Text
                        data-ws-id="94"
                        data-ws-component="Text"
                        className="c1mfk609 cvjxq2s cwry1sa"
                      >
                        {"Popover"}
                      </Text>
                      <Paragraph
                        data-ws-id="96"
                        data-ws-component="Paragraph"
                        className="c3rzppk c17ybgbw c1u5xdcd cdf5ze5 c1e2gixt c16sc1pt c78rgey c1mxykr c1mfk609 c18mq0f5 caa8yt3"
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
                      className="c1wv658c c6gk6ar c13wsd00 c1hl4mbg cu0fd6l c8098d3 cym38jd cqimob0 c2tr68t cjdtj3f c1kc4g4w c1hi2fgx c16a2e8i c1y90k37 cvjxq2s chhysup c601nqx c9i3lxo c1sz664l cm8bc7h c8xqq0k cjs8iie cbt1ziu c1ci4uzu"
                    >
                      <Text
                        data-ws-id="102"
                        data-ws-component="Text"
                        className="c1mfk609 cvjxq2s cwry1sa"
                      >
                        {"Tooltip"}
                      </Text>
                      <Paragraph
                        data-ws-id="104"
                        data-ws-component="Paragraph"
                        className="c3rzppk c17ybgbw c1u5xdcd cdf5ze5 c1e2gixt c16sc1pt c78rgey c1mxykr c1mfk609 c18mq0f5 caa8yt3"
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
                      className="c1wv658c c6gk6ar c13wsd00 c1hl4mbg cu0fd6l c8098d3 cym38jd cqimob0 c2tr68t cjdtj3f c1kc4g4w c1hi2fgx c16a2e8i c1y90k37 cvjxq2s chhysup c601nqx c9i3lxo c1sz664l cm8bc7h c8xqq0k cjs8iie cbt1ziu c1ci4uzu"
                    >
                      <Text
                        data-ws-id="110"
                        data-ws-component="Text"
                        className="c1mfk609 cvjxq2s cwry1sa"
                      >
                        {"Button"}
                      </Text>
                      <Paragraph
                        data-ws-id="112"
                        data-ws-component="Paragraph"
                        className="c3rzppk c17ybgbw c1u5xdcd cdf5ze5 c1e2gixt c16sc1pt c78rgey c1mxykr c1mfk609 c18mq0f5 caa8yt3"
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
                className="c1inucbi c1dab7w1 c1uf7v01 czynn8e c6z96ps c9t5qyz c1x5uwe6 csnt51l c1v4k4ip c2iozhh c1j5pqo1 cmqevnc cvxnx00 c1mnuzt9 c4v7k5r cvzkkb6 cym38jd cqimob0 c2tr68t cjdtj3f c1mfk609 c121vm9z cwry1sa c1b8xvex c1kc4g4w c1hi2fgx chhysup c2a7z25 c1t6bql4 czph7hf cncn1ro cb270vo c1rgsd1l c1srwcmr c1grhw0w c8xqq0k cjs8iie"
              >
                {"Standalone"}
              </Link>
            </NavigationMenuLink>
          </NavigationMenuItem>
        </NavigationMenuList>
        <Box
          data-ws-id="118"
          data-ws-component="Box"
          className="c1kb88y7 c17k6ftv cd2po1q c6gk6ar cvzkkb6"
        >
          <NavigationMenuViewport
            data-ws-id="120"
            data-ws-component="NavigationMenuViewport"
            className="cnhoj7b c1t5p0zw c1e2gixt cym38jd cqimob0 c2tr68t cjdtj3f c1inucbi c1dab7w1 c1uf7v01 czynn8e c6z96ps c9t5qyz c1x5uwe6 csnt51l cgassre c1ndsw6v cjrlou9 c945vvj c4mw8gp cj0w9yo cbzcu1y c1srbwx8 cr0e7oa"
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
  .cnhoj7b {
    position: relative
  }
  .c1a0z5in {
    max-width: max-content
  }
  .c1hxtwzc {
    padding-left: 0px
  }
  .c1j0bzjz {
    padding-right: 0px
  }
  .cbjj14v {
    padding-top: 0px
  }
  .c15sjadq {
    padding-bottom: 0px
  }
  .c3rzppk {
    margin-left: 0px
  }
  .c17ybgbw {
    margin-right: 0px
  }
  .c1u5xdcd {
    margin-top: 0px
  }
  .cdf5ze5 {
    margin-bottom: 0px
  }
  .c6gk6ar {
    display: flex
  }
  .cn4ngym {
    flex-grow: 1
  }
  .c1ee1pe1 {
    flex-shrink: 1
  }
  .c1xcrn9h {
    flex-basis: 0%
  }
  .csrd2h5 {
    list-style-type: none
  }
  .c4v7k5r {
    align-items: center
  }
  .cvzkkb6 {
    justify-content: center
  }
  .cu0fd6l {
    row-gap: 0.25rem
  }
  .c8098d3 {
    column-gap: 0.25rem
  }
  .c1inucbi {
    border-top-style: solid
  }
  .c1dab7w1 {
    border-right-style: solid
  }
  .c1uf7v01 {
    border-bottom-style: solid
  }
  .czynn8e {
    border-left-style: solid
  }
  .c6z96ps {
    border-top-color: rgba(226, 232, 240, 1)
  }
  .c9t5qyz {
    border-right-color: rgba(226, 232, 240, 1)
  }
  .c1x5uwe6 {
    border-bottom-color: rgba(226, 232, 240, 1)
  }
  .csnt51l {
    border-left-color: rgba(226, 232, 240, 1)
  }
  .c1v4k4ip {
    border-top-width: 0px
  }
  .c2iozhh {
    border-right-width: 0px
  }
  .c1j5pqo1 {
    border-bottom-width: 0px
  }
  .cmqevnc {
    border-left-width: 0px
  }
  .cvxnx00 {
    background-color: transparent
  }
  .c1mnuzt9 {
    display: inline-flex
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
  .c1mfk609 {
    font-size: 0.875rem
  }
  .c121vm9z {
    line-height: 1.25rem
  }
  .cwry1sa {
    font-weight: 500
  }
  .c1b8xvex {
    height: 2.5rem
  }
  .c1kc4g4w {
    padding-left: 0.75rem
  }
  .c1hi2fgx {
    padding-right: 0.75rem
  }
  .c1jrmp29 {
    --navigation-menu-trigger-icon-transform: 0deg
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
  .c8xqq0k:hover {
    background-color: rgba(241, 245, 249, 0.9)
  }
  .cjs8iie:hover {
    color: rgba(15, 23, 42, 1)
  }
  .c157d2k6[data-state=open] {
    --navigation-menu-trigger-icon-transform: 180deg
  }
  .ck5mafm {
    margin-left: 0.25rem
  }
  .cm547tf {
    rotate: var(--navigation-menu-trigger-icon-transform)
  }
  .c18dp5gp {
    height: 1rem
  }
  .clw3og8 {
    width: 1rem
  }
  .c1qmz361 {
    flex-grow: 0
  }
  .cu8n5i6 {
    transition-property: all
  }
  .cqhjzs2 {
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1)
  }
  .c1498b83 {
    transition-duration: 200ms
  }
  .c17k6ftv {
    left: 0px
  }
  .ci9y33x {
    top: 0px
  }
  .c1kb88y7 {
    position: absolute
  }
  .cbgnvea {
    width: max-content
  }
  .c1y5f9qa {
    padding-left: 1rem
  }
  .cjw7gx9 {
    padding-right: 1rem
  }
  .c1mdun74 {
    padding-top: 1rem
  }
  .c1bfvzwl {
    padding-bottom: 1rem
  }
  .c6gk6ar {
    display: flex
  }
  .cb99ak4 {
    row-gap: 1rem
  }
  .ctl64vj {
    column-gap: 1rem
  }
  .cbxivag {
    padding-left: 0.5rem
  }
  .c18gyxfs {
    padding-right: 0.5rem
  }
  .c1peybss {
    padding-top: 0.5rem
  }
  .chh2z1n {
    padding-bottom: 0.5rem
  }
  .c1af0hjb {
    background-color: rgba(226, 232, 240, 1)
  }
  .c1y5f9qa {
    padding-left: 1rem
  }
  .cjw7gx9 {
    padding-right: 1rem
  }
  .c1mdun74 {
    padding-top: 1rem
  }
  .c1bfvzwl {
    padding-bottom: 1rem
  }
  .c1187wgd {
    width: 12rem
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
  .c88y2pm {
    width: 16rem
  }
  .c6gk6ar {
    display: flex
  }
  .cb99ak4 {
    row-gap: 1rem
  }
  .ctl64vj {
    column-gap: 1rem
  }
  .c13wsd00 {
    flex-direction: column
  }
  .c1wv658c {
    color: inherit
  }
  .c6gk6ar {
    display: flex
  }
  .c13wsd00 {
    flex-direction: column
  }
  .c1hl4mbg {
    user-select: none
  }
  .cu0fd6l {
    row-gap: 0.25rem
  }
  .c8098d3 {
    column-gap: 0.25rem
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
  .c16a2e8i {
    padding-top: 0.75rem
  }
  .c1y90k37 {
    padding-bottom: 0.75rem
  }
  .cvjxq2s {
    line-height: 1
  }
  .chhysup {
    text-decoration-line: none
  }
  .c601nqx {
    outline-width: 2px
  }
  .c9i3lxo {
    outline-style: solid
  }
  .c1sz664l {
    outline-color: transparent
  }
  .cm8bc7h {
    outline-offset: 2px
  }
  .c8xqq0k:hover {
    background-color: rgba(241, 245, 249, 0.9)
  }
  .cjs8iie:hover {
    color: rgba(15, 23, 42, 1)
  }
  .cbt1ziu:focus {
    background-color: rgba(241, 245, 249, 0.9)
  }
  .c1ci4uzu:focus {
    color: rgba(15, 23, 42, 1)
  }
  .c1mfk609 {
    font-size: 0.875rem
  }
  .cvjxq2s {
    line-height: 1
  }
  .cwry1sa {
    font-weight: 500
  }
  .c3rzppk {
    margin-left: 0px
  }
  .c17ybgbw {
    margin-right: 0px
  }
  .c1u5xdcd {
    margin-top: 0px
  }
  .cdf5ze5 {
    margin-bottom: 0px
  }
  .c1e2gixt {
    overflow: hidden
  }
  .c16sc1pt {
    display: -webkit-box
  }
  .c78rgey {
    -webkit-box-orient: vertical
  }
  .c1mxykr {
    -webkit-line-clamp: 2
  }
  .c1mfk609 {
    font-size: 0.875rem
  }
  .c18mq0f5 {
    line-height: 1.375
  }
  .caa8yt3 {
    color: rgba(100, 116, 139, 1)
  }
  .c1wv658c {
    color: inherit
  }
  .c6gk6ar {
    display: flex
  }
  .c13wsd00 {
    flex-direction: column
  }
  .c1hl4mbg {
    user-select: none
  }
  .cu0fd6l {
    row-gap: 0.25rem
  }
  .c8098d3 {
    column-gap: 0.25rem
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
  .c16a2e8i {
    padding-top: 0.75rem
  }
  .c1y90k37 {
    padding-bottom: 0.75rem
  }
  .cvjxq2s {
    line-height: 1
  }
  .chhysup {
    text-decoration-line: none
  }
  .c601nqx {
    outline-width: 2px
  }
  .c9i3lxo {
    outline-style: solid
  }
  .c1sz664l {
    outline-color: transparent
  }
  .cm8bc7h {
    outline-offset: 2px
  }
  .c8xqq0k:hover {
    background-color: rgba(241, 245, 249, 0.9)
  }
  .cjs8iie:hover {
    color: rgba(15, 23, 42, 1)
  }
  .cbt1ziu:focus {
    background-color: rgba(241, 245, 249, 0.9)
  }
  .c1ci4uzu:focus {
    color: rgba(15, 23, 42, 1)
  }
  .c1mfk609 {
    font-size: 0.875rem
  }
  .cvjxq2s {
    line-height: 1
  }
  .cwry1sa {
    font-weight: 500
  }
  .c3rzppk {
    margin-left: 0px
  }
  .c17ybgbw {
    margin-right: 0px
  }
  .c1u5xdcd {
    margin-top: 0px
  }
  .cdf5ze5 {
    margin-bottom: 0px
  }
  .c1e2gixt {
    overflow: hidden
  }
  .c16sc1pt {
    display: -webkit-box
  }
  .c78rgey {
    -webkit-box-orient: vertical
  }
  .c1mxykr {
    -webkit-line-clamp: 2
  }
  .c1mfk609 {
    font-size: 0.875rem
  }
  .c18mq0f5 {
    line-height: 1.375
  }
  .caa8yt3 {
    color: rgba(100, 116, 139, 1)
  }
  .c1wv658c {
    color: inherit
  }
  .c6gk6ar {
    display: flex
  }
  .c13wsd00 {
    flex-direction: column
  }
  .c1hl4mbg {
    user-select: none
  }
  .cu0fd6l {
    row-gap: 0.25rem
  }
  .c8098d3 {
    column-gap: 0.25rem
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
  .c16a2e8i {
    padding-top: 0.75rem
  }
  .c1y90k37 {
    padding-bottom: 0.75rem
  }
  .cvjxq2s {
    line-height: 1
  }
  .chhysup {
    text-decoration-line: none
  }
  .c601nqx {
    outline-width: 2px
  }
  .c9i3lxo {
    outline-style: solid
  }
  .c1sz664l {
    outline-color: transparent
  }
  .cm8bc7h {
    outline-offset: 2px
  }
  .c8xqq0k:hover {
    background-color: rgba(241, 245, 249, 0.9)
  }
  .cjs8iie:hover {
    color: rgba(15, 23, 42, 1)
  }
  .cbt1ziu:focus {
    background-color: rgba(241, 245, 249, 0.9)
  }
  .c1ci4uzu:focus {
    color: rgba(15, 23, 42, 1)
  }
  .c1mfk609 {
    font-size: 0.875rem
  }
  .cvjxq2s {
    line-height: 1
  }
  .cwry1sa {
    font-weight: 500
  }
  .c3rzppk {
    margin-left: 0px
  }
  .c17ybgbw {
    margin-right: 0px
  }
  .c1u5xdcd {
    margin-top: 0px
  }
  .cdf5ze5 {
    margin-bottom: 0px
  }
  .c1e2gixt {
    overflow: hidden
  }
  .c16sc1pt {
    display: -webkit-box
  }
  .c78rgey {
    -webkit-box-orient: vertical
  }
  .c1mxykr {
    -webkit-line-clamp: 2
  }
  .c1mfk609 {
    font-size: 0.875rem
  }
  .c18mq0f5 {
    line-height: 1.375
  }
  .caa8yt3 {
    color: rgba(100, 116, 139, 1)
  }
  .c1inucbi {
    border-top-style: solid
  }
  .c1dab7w1 {
    border-right-style: solid
  }
  .c1uf7v01 {
    border-bottom-style: solid
  }
  .czynn8e {
    border-left-style: solid
  }
  .c6z96ps {
    border-top-color: rgba(226, 232, 240, 1)
  }
  .c9t5qyz {
    border-right-color: rgba(226, 232, 240, 1)
  }
  .c1x5uwe6 {
    border-bottom-color: rgba(226, 232, 240, 1)
  }
  .csnt51l {
    border-left-color: rgba(226, 232, 240, 1)
  }
  .c1v4k4ip {
    border-top-width: 0px
  }
  .c2iozhh {
    border-right-width: 0px
  }
  .c1j5pqo1 {
    border-bottom-width: 0px
  }
  .cmqevnc {
    border-left-width: 0px
  }
  .cvxnx00 {
    background-color: transparent
  }
  .c1mnuzt9 {
    display: inline-flex
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
  .c1mfk609 {
    font-size: 0.875rem
  }
  .c121vm9z {
    line-height: 1.25rem
  }
  .cwry1sa {
    font-weight: 500
  }
  .c1b8xvex {
    height: 2.5rem
  }
  .c1kc4g4w {
    padding-left: 0.75rem
  }
  .c1hi2fgx {
    padding-right: 0.75rem
  }
  .c1jrmp29 {
    --navigation-menu-trigger-icon-transform: 0deg
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
  .c8xqq0k:hover {
    background-color: rgba(241, 245, 249, 0.9)
  }
  .cjs8iie:hover {
    color: rgba(15, 23, 42, 1)
  }
  .c157d2k6[data-state=open] {
    --navigation-menu-trigger-icon-transform: 180deg
  }
  .ck5mafm {
    margin-left: 0.25rem
  }
  .cm547tf {
    rotate: var(--navigation-menu-trigger-icon-transform)
  }
  .c18dp5gp {
    height: 1rem
  }
  .clw3og8 {
    width: 1rem
  }
  .c1qmz361 {
    flex-grow: 0
  }
  .cu8n5i6 {
    transition-property: all
  }
  .cqhjzs2 {
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1)
  }
  .c1498b83 {
    transition-duration: 200ms
  }
  .c17k6ftv {
    left: 0px
  }
  .ci9y33x {
    top: 0px
  }
  .c1kb88y7 {
    position: absolute
  }
  .cbgnvea {
    width: max-content
  }
  .c1y5f9qa {
    padding-left: 1rem
  }
  .cjw7gx9 {
    padding-right: 1rem
  }
  .c1mdun74 {
    padding-top: 1rem
  }
  .c1bfvzwl {
    padding-bottom: 1rem
  }
  .c6gk6ar {
    display: flex
  }
  .cb99ak4 {
    row-gap: 1rem
  }
  .ctl64vj {
    column-gap: 1rem
  }
  .c1hxtwzc {
    padding-left: 0px
  }
  .c1j0bzjz {
    padding-right: 0px
  }
  .cbjj14v {
    padding-top: 0px
  }
  .c15sjadq {
    padding-bottom: 0px
  }
  .c88y2pm {
    width: 16rem
  }
  .c6gk6ar {
    display: flex
  }
  .cb99ak4 {
    row-gap: 1rem
  }
  .ctl64vj {
    column-gap: 1rem
  }
  .c13wsd00 {
    flex-direction: column
  }
  .c1wv658c {
    color: inherit
  }
  .c6gk6ar {
    display: flex
  }
  .c13wsd00 {
    flex-direction: column
  }
  .c1hl4mbg {
    user-select: none
  }
  .cu0fd6l {
    row-gap: 0.25rem
  }
  .c8098d3 {
    column-gap: 0.25rem
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
  .c16a2e8i {
    padding-top: 0.75rem
  }
  .c1y90k37 {
    padding-bottom: 0.75rem
  }
  .cvjxq2s {
    line-height: 1
  }
  .chhysup {
    text-decoration-line: none
  }
  .c601nqx {
    outline-width: 2px
  }
  .c9i3lxo {
    outline-style: solid
  }
  .c1sz664l {
    outline-color: transparent
  }
  .cm8bc7h {
    outline-offset: 2px
  }
  .c8xqq0k:hover {
    background-color: rgba(241, 245, 249, 0.9)
  }
  .cjs8iie:hover {
    color: rgba(15, 23, 42, 1)
  }
  .cbt1ziu:focus {
    background-color: rgba(241, 245, 249, 0.9)
  }
  .c1ci4uzu:focus {
    color: rgba(15, 23, 42, 1)
  }
  .c1mfk609 {
    font-size: 0.875rem
  }
  .cvjxq2s {
    line-height: 1
  }
  .cwry1sa {
    font-weight: 500
  }
  .c3rzppk {
    margin-left: 0px
  }
  .c17ybgbw {
    margin-right: 0px
  }
  .c1u5xdcd {
    margin-top: 0px
  }
  .cdf5ze5 {
    margin-bottom: 0px
  }
  .c1e2gixt {
    overflow: hidden
  }
  .c16sc1pt {
    display: -webkit-box
  }
  .c78rgey {
    -webkit-box-orient: vertical
  }
  .c1mxykr {
    -webkit-line-clamp: 2
  }
  .c1mfk609 {
    font-size: 0.875rem
  }
  .c18mq0f5 {
    line-height: 1.375
  }
  .caa8yt3 {
    color: rgba(100, 116, 139, 1)
  }
  .c1wv658c {
    color: inherit
  }
  .c6gk6ar {
    display: flex
  }
  .c13wsd00 {
    flex-direction: column
  }
  .c1hl4mbg {
    user-select: none
  }
  .cu0fd6l {
    row-gap: 0.25rem
  }
  .c8098d3 {
    column-gap: 0.25rem
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
  .c16a2e8i {
    padding-top: 0.75rem
  }
  .c1y90k37 {
    padding-bottom: 0.75rem
  }
  .cvjxq2s {
    line-height: 1
  }
  .chhysup {
    text-decoration-line: none
  }
  .c601nqx {
    outline-width: 2px
  }
  .c9i3lxo {
    outline-style: solid
  }
  .c1sz664l {
    outline-color: transparent
  }
  .cm8bc7h {
    outline-offset: 2px
  }
  .c8xqq0k:hover {
    background-color: rgba(241, 245, 249, 0.9)
  }
  .cjs8iie:hover {
    color: rgba(15, 23, 42, 1)
  }
  .cbt1ziu:focus {
    background-color: rgba(241, 245, 249, 0.9)
  }
  .c1ci4uzu:focus {
    color: rgba(15, 23, 42, 1)
  }
  .c1mfk609 {
    font-size: 0.875rem
  }
  .cvjxq2s {
    line-height: 1
  }
  .cwry1sa {
    font-weight: 500
  }
  .c3rzppk {
    margin-left: 0px
  }
  .c17ybgbw {
    margin-right: 0px
  }
  .c1u5xdcd {
    margin-top: 0px
  }
  .cdf5ze5 {
    margin-bottom: 0px
  }
  .c1e2gixt {
    overflow: hidden
  }
  .c16sc1pt {
    display: -webkit-box
  }
  .c78rgey {
    -webkit-box-orient: vertical
  }
  .c1mxykr {
    -webkit-line-clamp: 2
  }
  .c1mfk609 {
    font-size: 0.875rem
  }
  .c18mq0f5 {
    line-height: 1.375
  }
  .caa8yt3 {
    color: rgba(100, 116, 139, 1)
  }
  .c1wv658c {
    color: inherit
  }
  .c6gk6ar {
    display: flex
  }
  .c13wsd00 {
    flex-direction: column
  }
  .c1hl4mbg {
    user-select: none
  }
  .cu0fd6l {
    row-gap: 0.25rem
  }
  .c8098d3 {
    column-gap: 0.25rem
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
  .c16a2e8i {
    padding-top: 0.75rem
  }
  .c1y90k37 {
    padding-bottom: 0.75rem
  }
  .cvjxq2s {
    line-height: 1
  }
  .chhysup {
    text-decoration-line: none
  }
  .c601nqx {
    outline-width: 2px
  }
  .c9i3lxo {
    outline-style: solid
  }
  .c1sz664l {
    outline-color: transparent
  }
  .cm8bc7h {
    outline-offset: 2px
  }
  .c8xqq0k:hover {
    background-color: rgba(241, 245, 249, 0.9)
  }
  .cjs8iie:hover {
    color: rgba(15, 23, 42, 1)
  }
  .cbt1ziu:focus {
    background-color: rgba(241, 245, 249, 0.9)
  }
  .c1ci4uzu:focus {
    color: rgba(15, 23, 42, 1)
  }
  .c1mfk609 {
    font-size: 0.875rem
  }
  .cvjxq2s {
    line-height: 1
  }
  .cwry1sa {
    font-weight: 500
  }
  .c3rzppk {
    margin-left: 0px
  }
  .c17ybgbw {
    margin-right: 0px
  }
  .c1u5xdcd {
    margin-top: 0px
  }
  .cdf5ze5 {
    margin-bottom: 0px
  }
  .c1e2gixt {
    overflow: hidden
  }
  .c16sc1pt {
    display: -webkit-box
  }
  .c78rgey {
    -webkit-box-orient: vertical
  }
  .c1mxykr {
    -webkit-line-clamp: 2
  }
  .c1mfk609 {
    font-size: 0.875rem
  }
  .c18mq0f5 {
    line-height: 1.375
  }
  .caa8yt3 {
    color: rgba(100, 116, 139, 1)
  }
  .c88y2pm {
    width: 16rem
  }
  .c6gk6ar {
    display: flex
  }
  .cb99ak4 {
    row-gap: 1rem
  }
  .ctl64vj {
    column-gap: 1rem
  }
  .c13wsd00 {
    flex-direction: column
  }
  .c1wv658c {
    color: inherit
  }
  .c6gk6ar {
    display: flex
  }
  .c13wsd00 {
    flex-direction: column
  }
  .c1hl4mbg {
    user-select: none
  }
  .cu0fd6l {
    row-gap: 0.25rem
  }
  .c8098d3 {
    column-gap: 0.25rem
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
  .c16a2e8i {
    padding-top: 0.75rem
  }
  .c1y90k37 {
    padding-bottom: 0.75rem
  }
  .cvjxq2s {
    line-height: 1
  }
  .chhysup {
    text-decoration-line: none
  }
  .c601nqx {
    outline-width: 2px
  }
  .c9i3lxo {
    outline-style: solid
  }
  .c1sz664l {
    outline-color: transparent
  }
  .cm8bc7h {
    outline-offset: 2px
  }
  .c8xqq0k:hover {
    background-color: rgba(241, 245, 249, 0.9)
  }
  .cjs8iie:hover {
    color: rgba(15, 23, 42, 1)
  }
  .cbt1ziu:focus {
    background-color: rgba(241, 245, 249, 0.9)
  }
  .c1ci4uzu:focus {
    color: rgba(15, 23, 42, 1)
  }
  .c1mfk609 {
    font-size: 0.875rem
  }
  .cvjxq2s {
    line-height: 1
  }
  .cwry1sa {
    font-weight: 500
  }
  .c3rzppk {
    margin-left: 0px
  }
  .c17ybgbw {
    margin-right: 0px
  }
  .c1u5xdcd {
    margin-top: 0px
  }
  .cdf5ze5 {
    margin-bottom: 0px
  }
  .c1e2gixt {
    overflow: hidden
  }
  .c16sc1pt {
    display: -webkit-box
  }
  .c78rgey {
    -webkit-box-orient: vertical
  }
  .c1mxykr {
    -webkit-line-clamp: 2
  }
  .c1mfk609 {
    font-size: 0.875rem
  }
  .c18mq0f5 {
    line-height: 1.375
  }
  .caa8yt3 {
    color: rgba(100, 116, 139, 1)
  }
  .c1wv658c {
    color: inherit
  }
  .c6gk6ar {
    display: flex
  }
  .c13wsd00 {
    flex-direction: column
  }
  .c1hl4mbg {
    user-select: none
  }
  .cu0fd6l {
    row-gap: 0.25rem
  }
  .c8098d3 {
    column-gap: 0.25rem
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
  .c16a2e8i {
    padding-top: 0.75rem
  }
  .c1y90k37 {
    padding-bottom: 0.75rem
  }
  .cvjxq2s {
    line-height: 1
  }
  .chhysup {
    text-decoration-line: none
  }
  .c601nqx {
    outline-width: 2px
  }
  .c9i3lxo {
    outline-style: solid
  }
  .c1sz664l {
    outline-color: transparent
  }
  .cm8bc7h {
    outline-offset: 2px
  }
  .c8xqq0k:hover {
    background-color: rgba(241, 245, 249, 0.9)
  }
  .cjs8iie:hover {
    color: rgba(15, 23, 42, 1)
  }
  .cbt1ziu:focus {
    background-color: rgba(241, 245, 249, 0.9)
  }
  .c1ci4uzu:focus {
    color: rgba(15, 23, 42, 1)
  }
  .c1mfk609 {
    font-size: 0.875rem
  }
  .cvjxq2s {
    line-height: 1
  }
  .cwry1sa {
    font-weight: 500
  }
  .c3rzppk {
    margin-left: 0px
  }
  .c17ybgbw {
    margin-right: 0px
  }
  .c1u5xdcd {
    margin-top: 0px
  }
  .cdf5ze5 {
    margin-bottom: 0px
  }
  .c1e2gixt {
    overflow: hidden
  }
  .c16sc1pt {
    display: -webkit-box
  }
  .c78rgey {
    -webkit-box-orient: vertical
  }
  .c1mxykr {
    -webkit-line-clamp: 2
  }
  .c1mfk609 {
    font-size: 0.875rem
  }
  .c18mq0f5 {
    line-height: 1.375
  }
  .caa8yt3 {
    color: rgba(100, 116, 139, 1)
  }
  .c1wv658c {
    color: inherit
  }
  .c6gk6ar {
    display: flex
  }
  .c13wsd00 {
    flex-direction: column
  }
  .c1hl4mbg {
    user-select: none
  }
  .cu0fd6l {
    row-gap: 0.25rem
  }
  .c8098d3 {
    column-gap: 0.25rem
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
  .c16a2e8i {
    padding-top: 0.75rem
  }
  .c1y90k37 {
    padding-bottom: 0.75rem
  }
  .cvjxq2s {
    line-height: 1
  }
  .chhysup {
    text-decoration-line: none
  }
  .c601nqx {
    outline-width: 2px
  }
  .c9i3lxo {
    outline-style: solid
  }
  .c1sz664l {
    outline-color: transparent
  }
  .cm8bc7h {
    outline-offset: 2px
  }
  .c8xqq0k:hover {
    background-color: rgba(241, 245, 249, 0.9)
  }
  .cjs8iie:hover {
    color: rgba(15, 23, 42, 1)
  }
  .cbt1ziu:focus {
    background-color: rgba(241, 245, 249, 0.9)
  }
  .c1ci4uzu:focus {
    color: rgba(15, 23, 42, 1)
  }
  .c1mfk609 {
    font-size: 0.875rem
  }
  .cvjxq2s {
    line-height: 1
  }
  .cwry1sa {
    font-weight: 500
  }
  .c3rzppk {
    margin-left: 0px
  }
  .c17ybgbw {
    margin-right: 0px
  }
  .c1u5xdcd {
    margin-top: 0px
  }
  .cdf5ze5 {
    margin-bottom: 0px
  }
  .c1e2gixt {
    overflow: hidden
  }
  .c16sc1pt {
    display: -webkit-box
  }
  .c78rgey {
    -webkit-box-orient: vertical
  }
  .c1mxykr {
    -webkit-line-clamp: 2
  }
  .c1mfk609 {
    font-size: 0.875rem
  }
  .c18mq0f5 {
    line-height: 1.375
  }
  .caa8yt3 {
    color: rgba(100, 116, 139, 1)
  }
  .c1inucbi {
    border-top-style: solid
  }
  .c1dab7w1 {
    border-right-style: solid
  }
  .c1uf7v01 {
    border-bottom-style: solid
  }
  .czynn8e {
    border-left-style: solid
  }
  .c6z96ps {
    border-top-color: rgba(226, 232, 240, 1)
  }
  .c9t5qyz {
    border-right-color: rgba(226, 232, 240, 1)
  }
  .c1x5uwe6 {
    border-bottom-color: rgba(226, 232, 240, 1)
  }
  .csnt51l {
    border-left-color: rgba(226, 232, 240, 1)
  }
  .c1v4k4ip {
    border-top-width: 0px
  }
  .c2iozhh {
    border-right-width: 0px
  }
  .c1j5pqo1 {
    border-bottom-width: 0px
  }
  .cmqevnc {
    border-left-width: 0px
  }
  .cvxnx00 {
    background-color: transparent
  }
  .c1mnuzt9 {
    display: inline-flex
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
  .c1mfk609 {
    font-size: 0.875rem
  }
  .c121vm9z {
    line-height: 1.25rem
  }
  .cwry1sa {
    font-weight: 500
  }
  .c1b8xvex {
    height: 2.5rem
  }
  .c1kc4g4w {
    padding-left: 0.75rem
  }
  .c1hi2fgx {
    padding-right: 0.75rem
  }
  .chhysup {
    text-decoration-line: none
  }
  .c2a7z25 {
    color: currentColor
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
  .c8xqq0k:hover {
    background-color: rgba(241, 245, 249, 0.9)
  }
  .cjs8iie:hover {
    color: rgba(15, 23, 42, 1)
  }
  .c1kb88y7 {
    position: absolute
  }
  .c17k6ftv {
    left: 0px
  }
  .cd2po1q {
    top: 100%
  }
  .c6gk6ar {
    display: flex
  }
  .cvzkkb6 {
    justify-content: center
  }
  .c1t5p0zw {
    margin-top: 0.375rem
  }
  .c1e2gixt {
    overflow: hidden
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
  .c1inucbi {
    border-top-style: solid
  }
  .c1dab7w1 {
    border-right-style: solid
  }
  .c1uf7v01 {
    border-bottom-style: solid
  }
  .czynn8e {
    border-left-style: solid
  }
  .c6z96ps {
    border-top-color: rgba(226, 232, 240, 1)
  }
  .c9t5qyz {
    border-right-color: rgba(226, 232, 240, 1)
  }
  .c1x5uwe6 {
    border-bottom-color: rgba(226, 232, 240, 1)
  }
  .csnt51l {
    border-left-color: rgba(226, 232, 240, 1)
  }
  .cgassre {
    border-top-width: 1px
  }
  .c1ndsw6v {
    border-right-width: 1px
  }
  .cjrlou9 {
    border-bottom-width: 1px
  }
  .c945vvj {
    border-left-width: 1px
  }
  .c4mw8gp {
    background-color: rgba(255, 255, 255, 1)
  }
  .cj0w9yo {
    color: rgba(2, 8, 23, 1)
  }
  .cbzcu1y {
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)
  }
  .c1srbwx8 {
    height: var(--radix-navigation-menu-viewport-height)
  }
  .cr0e7oa {
    width: var(--radix-navigation-menu-viewport-width)
  }
}
      `}
        </style>
        <Page params={{}} resources={{}} />
      </>
    );
  },
};

export { Story as NavigationMenu };
