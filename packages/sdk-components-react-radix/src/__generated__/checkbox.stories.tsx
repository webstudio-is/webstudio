import { useState } from "react";
import {
  Box as Box,
  HtmlEmbed as HtmlEmbed,
  Text as Text,
} from "@webstudio-is/sdk-components-react";
import {
  Label as Label,
  Checkbox as Checkbox,
  CheckboxIndicator as CheckboxIndicator,
} from "../components";

type Params = Record<string, string | undefined>;
const Page = (_props: { params: Params }) => {
  let [checkboxChecked, set$checkboxChecked] = useState<any>(false);
  return (
    <Box data-ws-id="root" data-ws-component="Box">
      <Label
        data-ws-id="1"
        data-ws-component="Label"
        className="c11xgi9i c8prkzu c1edvzo4 clo3r8o"
      >
        <Checkbox
          data-ws-id="3"
          data-ws-component="Checkbox"
          checked={checkboxChecked}
          onCheckedChange={(checked: any) => {
            checkboxChecked = checked;
            set$checkboxChecked(checkboxChecked);
          }}
          className="c1pmpq0f c1yafs04 c11hichb c12e8ong c13c161l chzvexg c1s51a6q c17al2u0 c1ufcra4 c17gos5d cn4f13s c9mvxkx cu0p3ww c11i8aye ca1f4zs ck2qarh c1nxbatd caktpzb c1bm526f co0lfwl c1kn3u98 c2odgnt chlvjga c1jx7vpr c1oa7gr0 ce92j53 c1939zof c4lzij8"
        >
          <CheckboxIndicator
            data-ws-id="8"
            data-ws-component="CheckboxIndicator"
            className="c11xgi9i clo3r8o cw9oyzl c1hdhil0"
          >
            <HtmlEmbed
              data-ws-id="10"
              data-ws-component="HtmlEmbed"
              code={
                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width="100%" height="100%" style="display: block;"><path fill-rule="evenodd" d="M11.957 5.043a1 1 0 0 1 0 1.414l-4.5 4.5a1 1 0 0 1-1.414 0l-2-2a1 1 0 0 1 1.414-1.414L6.75 8.836l3.793-3.793a1 1 0 0 1 1.414 0Z" clip-rule="evenodd"/></svg>'
              }
            />
          </CheckboxIndicator>
        </Checkbox>
        <Text data-ws-id="12" data-ws-component="Text" tag={"span"}>
          {"Checkbox"}
        </Text>
      </Label>
    </Box>
  );
};

export default {
  title: "Components/Checkbox",
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
  label:where([data-ws-component="Label"]) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  button:where([data-ws-component="Checkbox"]) {
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
  span:where([data-ws-component="CheckboxIndicator"]) {
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
  .c8prkzu {
    row-gap: 0.5rem
  }
  .c1edvzo4 {
    column-gap: 0.5rem
  }
  .clo3r8o {
    align-items: center
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
  .c12e8ong {
    border-top-left-radius: 0.125rem
  }
  .c13c161l {
    border-top-right-radius: 0.125rem
  }
  .chzvexg {
    border-bottom-right-radius: 0.125rem
  }
  .c1s51a6q {
    border-bottom-left-radius: 0.125rem
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
  .c1939zof[data-state=checked] {
    background-color: rgba(15, 23, 42, 1)
  }
  .c4lzij8[data-state=checked] {
    color: rgba(248, 250, 252, 1)
  }
  .cw9oyzl {
    justify-content: center
  }
  .c1hdhil0 {
    color: currentColor
  }
}
      `}
        </style>
        <Page params={{}} />
      </>
    );
  },
};

export { Story as Checkbox };
