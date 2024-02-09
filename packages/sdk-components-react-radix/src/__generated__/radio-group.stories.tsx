import { useState } from "react";
import {
  Box as Box,
  HtmlEmbed as HtmlEmbed,
  Text as Text,
} from "@webstudio-is/sdk-components-react";
import {
  RadioGroup as RadioGroup,
  Label as Label,
  RadioGroupItem as RadioGroupItem,
  RadioGroupIndicator as RadioGroupIndicator,
} from "../components";

const Component = () => {
  let [radioGroupValue, set$radioGroupValue] = useState<any>("");
  return (
    <Box data-ws-id="root" data-ws-component="Box">
      <RadioGroup
        data-ws-id="1"
        data-ws-component="RadioGroup"
        value={radioGroupValue}
        onValueChange={(value: any) => {
          radioGroupValue = value;
          set$radioGroupValue(radioGroupValue);
        }}
        className="c11xgi9i cfd715b c8prkzu c1edvzo4"
      >
        <Label
          data-ws-id="6"
          data-ws-component="Label"
          className="c11xgi9i clo3r8o c8prkzu c1edvzo4"
        >
          <RadioGroupItem
            data-ws-id="8"
            data-ws-component="RadioGroupItem"
            value={"default"}
            className="c1t3sijk c1pmpq0f c1yafs04 c1o2cngd c1riwd65 ci2hmcl c1byz2lk c17al2u0 c1ufcra4 c17gos5d cn4f13s c9mvxkx cu0p3ww c11i8aye ca1f4zs ck2qarh c1nxbatd caktpzb c1bm526f c3i5k81 co0lfwl c1kn3u98 c2odgnt chlvjga c1jx7vpr c1oa7gr0 ce92j53"
          >
            <RadioGroupIndicator
              data-ws-id="11"
              data-ws-component="RadioGroupIndicator"
            >
              <HtmlEmbed
                data-ws-id="12"
                data-ws-component="HtmlEmbed"
                code={
                  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width="100%" height="100%" style="display: block;"><path d="M8 5.35a2.65 2.65 0 1 0 0 5.3 2.65 2.65 0 0 0 0-5.3Z"/></svg>'
                }
              />
            </RadioGroupIndicator>
          </RadioGroupItem>
          <Text data-ws-id="14" data-ws-component="Text">
            {"Default"}
          </Text>
        </Label>
        <Label
          data-ws-id="15"
          data-ws-component="Label"
          className="c11xgi9i clo3r8o c8prkzu c1edvzo4"
        >
          <RadioGroupItem
            data-ws-id="17"
            data-ws-component="RadioGroupItem"
            value={"comfortable"}
            className="c1t3sijk c1pmpq0f c1yafs04 c1o2cngd c1riwd65 ci2hmcl c1byz2lk c17al2u0 c1ufcra4 c17gos5d cn4f13s c9mvxkx cu0p3ww c11i8aye ca1f4zs ck2qarh c1nxbatd caktpzb c1bm526f c3i5k81 co0lfwl c1kn3u98 c2odgnt chlvjga c1jx7vpr c1oa7gr0 ce92j53"
          >
            <RadioGroupIndicator
              data-ws-id="20"
              data-ws-component="RadioGroupIndicator"
            >
              <HtmlEmbed
                data-ws-id="21"
                data-ws-component="HtmlEmbed"
                code={
                  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width="100%" height="100%" style="display: block;"><path d="M8 5.35a2.65 2.65 0 1 0 0 5.3 2.65 2.65 0 0 0 0-5.3Z"/></svg>'
                }
              />
            </RadioGroupIndicator>
          </RadioGroupItem>
          <Text data-ws-id="23" data-ws-component="Text">
            {"Comfortable"}
          </Text>
        </Label>
        <Label
          data-ws-id="24"
          data-ws-component="Label"
          className="c11xgi9i clo3r8o c8prkzu c1edvzo4"
        >
          <RadioGroupItem
            data-ws-id="26"
            data-ws-component="RadioGroupItem"
            value={"compact"}
            className="c1t3sijk c1pmpq0f c1yafs04 c1o2cngd c1riwd65 ci2hmcl c1byz2lk c17al2u0 c1ufcra4 c17gos5d cn4f13s c9mvxkx cu0p3ww c11i8aye ca1f4zs ck2qarh c1nxbatd caktpzb c1bm526f c3i5k81 co0lfwl c1kn3u98 c2odgnt chlvjga c1jx7vpr c1oa7gr0 ce92j53"
          >
            <RadioGroupIndicator
              data-ws-id="29"
              data-ws-component="RadioGroupIndicator"
            >
              <HtmlEmbed
                data-ws-id="30"
                data-ws-component="HtmlEmbed"
                code={
                  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width="100%" height="100%" style="display: block;"><path d="M8 5.35a2.65 2.65 0 1 0 0 5.3 2.65 2.65 0 0 0 0-5.3Z"/></svg>'
                }
              />
            </RadioGroupIndicator>
          </RadioGroupItem>
          <Text data-ws-id="32" data-ws-component="Text">
            {"Compact"}
          </Text>
        </Label>
      </RadioGroup>
    </Box>
  );
};

export default {
  title: "Components/RadioGroup",
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
  div:where([data-ws-component="RadioGroup"]) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  label:where([data-ws-component="Label"]) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  button:where([data-ws-component="RadioGroupItem"]) {
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
  span:where([data-ws-component="RadioGroupIndicator"]) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
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
}@media all {
  .c11xgi9i {
    display: flex
  }
  .cfd715b {
    flex-direction: column
  }
  .c8prkzu {
    row-gap: 0.5rem
  }
  .c1edvzo4 {
    column-gap: 0.5rem
  }
  .clo3r8o {
    align-items: center
  }
  .c1t3sijk {
    aspect-ratio: 1 / 1
  }
  .c1pmpq0f {
    height: 1rem
  }
  .c1yafs04 {
    width: 1rem
  }
  .c1o2cngd {
    border-top-left-radius: 9999px
  }
  .c1riwd65 {
    border-top-right-radius: 9999px
  }
  .ci2hmcl {
    border-bottom-right-radius: 9999px
  }
  .c1byz2lk {
    border-bottom-left-radius: 9999px
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
  .c9mvxkx {
    border-top-color: rgba(15, 23, 42, 1)
  }
  .cu0p3ww {
    border-right-color: rgba(15, 23, 42, 1)
  }
  .c11i8aye {
    border-bottom-color: rgba(15, 23, 42, 1)
  }
  .ca1f4zs {
    border-left-color: rgba(15, 23, 42, 1)
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
  .c3i5k81 {
    color: rgba(15, 23, 42, 1)
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
  .c1oa7gr0:disabled {
    cursor: not-allowed
  }
  .ce92j53:disabled {
    opacity: 0.5
  }
}
      `}
        </style>
        <Component />
      </>
    );
  },
};

export { Story as RadioGroup };
