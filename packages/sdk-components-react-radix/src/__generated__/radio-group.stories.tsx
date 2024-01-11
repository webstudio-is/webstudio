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

type Params = Record<string, string | undefined>;
type Resources = Record<string, unknown>;
const Page = (_props: { params: Params; resources: Resources }) => {
  let [radioGroupValue, set$radioGroupValue] = useState<any>("");
  let onValueChange = (value: any) => {
    radioGroupValue = value;
    set$radioGroupValue(radioGroupValue);
  };
  return (
    <Box data-ws-id="root" data-ws-component="Box">
      <RadioGroup
        data-ws-id="1"
        data-ws-component="RadioGroup"
        value={radioGroupValue}
        onValueChange={onValueChange}
        className="c6gk6ar c13wsd00 cgt00fz cydvc77"
      >
        <Label
          data-ws-id="6"
          data-ws-component="Label"
          className="c6gk6ar c4v7k5r cgt00fz cydvc77"
        >
          <RadioGroupItem
            data-ws-id="8"
            data-ws-component="RadioGroupItem"
            value={"default"}
            className="c1rc9sce c18dp5gp clw3og8 c17f8p6x c15ce0qo c1yisi8r cpvsov c1inucbi c1dab7w1 c1uf7v01 czynn8e cuelx18 c17v08sn c1czmfdb c8nta89 cgassre c1ndsw6v cjrlou9 c945vvj c132tyaz c1t6bql4 czph7hf cncn1ro cb270vo c1rgsd1l cegrmbm c1grhw0w"
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
          className="c6gk6ar c4v7k5r cgt00fz cydvc77"
        >
          <RadioGroupItem
            data-ws-id="17"
            data-ws-component="RadioGroupItem"
            value={"comfortable"}
            className="c1rc9sce c18dp5gp clw3og8 c17f8p6x c15ce0qo c1yisi8r cpvsov c1inucbi c1dab7w1 c1uf7v01 czynn8e cuelx18 c17v08sn c1czmfdb c8nta89 cgassre c1ndsw6v cjrlou9 c945vvj c132tyaz c1t6bql4 czph7hf cncn1ro cb270vo c1rgsd1l cegrmbm c1grhw0w"
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
          className="c6gk6ar c4v7k5r cgt00fz cydvc77"
        >
          <RadioGroupItem
            data-ws-id="26"
            data-ws-component="RadioGroupItem"
            value={"compact"}
            className="c1rc9sce c18dp5gp clw3og8 c17f8p6x c15ce0qo c1yisi8r cpvsov c1inucbi c1dab7w1 c1uf7v01 czynn8e cuelx18 c17v08sn c1czmfdb c8nta89 cgassre c1ndsw6v cjrlou9 c945vvj c132tyaz c1t6bql4 czph7hf cncn1ro cb270vo c1rgsd1l cegrmbm c1grhw0w"
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
  .c6gk6ar {
    display: flex
  }
  .c13wsd00 {
    flex-direction: column
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
  .cgt00fz {
    row-gap: 0.5rem
  }
  .cydvc77 {
    column-gap: 0.5rem
  }
  .c1rc9sce {
    aspect-ratio: 1 / 1
  }
  .c18dp5gp {
    height: 1rem
  }
  .clw3og8 {
    width: 1rem
  }
  .c17f8p6x {
    border-top-left-radius: 9999px
  }
  .c15ce0qo {
    border-top-right-radius: 9999px
  }
  .c1yisi8r {
    border-bottom-right-radius: 9999px
  }
  .cpvsov {
    border-bottom-left-radius: 9999px
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
  .c132tyaz {
    color: rgba(15, 23, 42, 1)
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
  .c4v7k5r {
    align-items: center
  }
  .cgt00fz {
    row-gap: 0.5rem
  }
  .cydvc77 {
    column-gap: 0.5rem
  }
  .c1rc9sce {
    aspect-ratio: 1 / 1
  }
  .c18dp5gp {
    height: 1rem
  }
  .clw3og8 {
    width: 1rem
  }
  .c17f8p6x {
    border-top-left-radius: 9999px
  }
  .c15ce0qo {
    border-top-right-radius: 9999px
  }
  .c1yisi8r {
    border-bottom-right-radius: 9999px
  }
  .cpvsov {
    border-bottom-left-radius: 9999px
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
  .c132tyaz {
    color: rgba(15, 23, 42, 1)
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
  .c4v7k5r {
    align-items: center
  }
  .cgt00fz {
    row-gap: 0.5rem
  }
  .cydvc77 {
    column-gap: 0.5rem
  }
  .c1rc9sce {
    aspect-ratio: 1 / 1
  }
  .c18dp5gp {
    height: 1rem
  }
  .clw3og8 {
    width: 1rem
  }
  .c17f8p6x {
    border-top-left-radius: 9999px
  }
  .c15ce0qo {
    border-top-right-radius: 9999px
  }
  .c1yisi8r {
    border-bottom-right-radius: 9999px
  }
  .cpvsov {
    border-bottom-left-radius: 9999px
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
  .c132tyaz {
    color: rgba(15, 23, 42, 1)
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
}
      `}
        </style>
        <Page params={{}} resources={{}} />
      </>
    );
  },
};

export { Story as RadioGroup };
