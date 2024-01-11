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
type Resources = Record<string, unknown>;
const Page = (_props: { params: Params; resources: Resources }) => {
  let [checkboxChecked, set$checkboxChecked] = useState<any>(false);
  let onCheckedChange = (checked: any) => {
    checkboxChecked = checked;
    set$checkboxChecked(checkboxChecked);
  };
  return (
    <Box data-ws-id="root" data-ws-component="Box">
      <Label
        data-ws-id="1"
        data-ws-component="Label"
        className="c6gk6ar cgt00fz cydvc77 c4v7k5r"
      >
        <Checkbox
          data-ws-id="3"
          data-ws-component="Checkbox"
          checked={checkboxChecked}
          onCheckedChange={onCheckedChange}
          className="c18dp5gp clw3og8 c1qmz361 c1d9pxa5 cnjyf56 c1jpjw0a c1lxvq7u c1inucbi c1dab7w1 c1uf7v01 czynn8e cuelx18 c17v08sn c1czmfdb c8nta89 cgassre c1ndsw6v cjrlou9 c945vvj c1t6bql4 czph7hf cncn1ro cb270vo c1rgsd1l cegrmbm c1grhw0w ccop5vc c19tq2u"
        >
          <CheckboxIndicator
            data-ws-id="8"
            data-ws-component="CheckboxIndicator"
            className="c6gk6ar c4v7k5r cvzkkb6 c2a7z25"
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
  .c6gk6ar {
    display: flex
  }
  .cgt00fz {
    row-gap: 0.5rem
  }
  .cydvc77 {
    column-gap: 0.5rem
  }
  .c4v7k5r {
    align-items: center
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
  .c1d9pxa5 {
    border-top-left-radius: 0.125rem
  }
  .cnjyf56 {
    border-top-right-radius: 0.125rem
  }
  .c1jpjw0a {
    border-bottom-right-radius: 0.125rem
  }
  .c1lxvq7u {
    border-bottom-left-radius: 0.125rem
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
  .cuelx18 {
    border-top-color: rgba(15, 23, 42, 1)
  }
  .c17v08sn {
    border-right-color: rgba(15, 23, 42, 1)
  }
  .c1czmfdb {
    border-bottom-color: rgba(15, 23, 42, 1)
  }
  .c8nta89 {
    border-left-color: rgba(15, 23, 42, 1)
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
  .cegrmbm:disabled {
    cursor: not-allowed
  }
  .c1grhw0w:disabled {
    opacity: 0.5
  }
  .ccop5vc[data-state=checked] {
    background-color: rgba(15, 23, 42, 1)
  }
  .c19tq2u[data-state=checked] {
    color: rgba(248, 250, 252, 1)
  }
  .c4v7k5r {
    align-items: center
  }
  .cvzkkb6 {
    justify-content: center
  }
  .c2a7z25 {
    color: currentColor
  }
}
      `}
        </style>
        <Page params={{}} resources={{}} />
      </>
    );
  },
};

export { Story as Checkbox };
