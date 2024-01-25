import { useState } from "react";
import {
  Box as Box,
  HtmlEmbed as HtmlEmbed,
} from "@webstudio-is/sdk-components-react";
import {
  Select as Select,
  SelectTrigger as SelectTrigger,
  SelectValue as SelectValue,
  SelectContent as SelectContent,
  SelectViewport as SelectViewport,
  SelectItem as SelectItem,
  SelectItemIndicator as SelectItemIndicator,
  SelectItemText as SelectItemText,
} from "../components";

const Component = () => {
  let [selectValue, set$selectValue] = useState<any>("");
  let [selectOpen, set$selectOpen] = useState<any>(false);
  return (
    <Box data-ws-id="root" data-ws-component="Box">
      <Select
        data-ws-id="1"
        data-ws-component="Select"
        value={selectValue}
        onValueChange={(value: any) => {
          selectValue = value;
          set$selectValue(selectValue);
        }}
        open={selectOpen}
        onOpenChange={(open: any) => {
          selectOpen = open;
          set$selectOpen(selectOpen);
        }}
      >
        <SelectTrigger
          data-ws-id="8"
          data-ws-component="SelectTrigger"
          className="c11xgi9i c18kkil c3elmho clo3r8o cqq29ax cuqxbts cg19ih8 c1479lj6 comq4ym c17al2u0 c1ufcra4 c17gos5d cn4f13s c1wic2il cdem58j c102tttv cb204z1 ck2qarh c1nxbatd caktpzb c1bm526f c110hgy6 c16g5416 c111au61 cey1d5i cbnv1sn c1qx3pju cut8gip cllerde c19s8l4l cvjgjoo cjdxik5 c1uf353 c192vyv4 c1oa7gr0 ce92j53"
        >
          <SelectValue
            data-ws-id="10"
            data-ws-component="SelectValue"
            placeholder={"Theme"}
          />
        </SelectTrigger>
        <SelectContent
          data-ws-id="12"
          data-ws-component="SelectContent"
          className="crmoyyg c173yyao c1ca5jk5 c1p3lwwv cuqxbts cg19ih8 c1479lj6 comq4ym c17al2u0 c1ufcra4 c17gos5d cn4f13s c1wic2il cdem58j c102tttv cb204z1 ck2qarh c1nxbatd caktpzb c1bm526f c1rt44f4 cwi0ez9 cpbhzvr"
        >
          <SelectViewport
            data-ws-id="14"
            data-ws-component="SelectViewport"
            className="c1tn9z53 c164ur30 c1ukzx8x c1wau4tj c1vx0yks c3elmho cav9kfy"
          >
            <SelectItem
              data-ws-id="16"
              data-ws-component="SelectItem"
              value={"light"}
              className="crmoyyg c11xgi9i c3elmho c17sljc0 cekw1i5 clo3r8o cuqxbts cg19ih8 c1479lj6 comq4ym ck4c8na c1mbhour c1dqbquh c1qmwsx9 c1qx3pju cut8gip cxlxl0c c1gfzcg5 cohan28 c15roejc c11eeprv c1rbq5ju cechooj c7yue4i"
            >
              <SelectItemIndicator
                data-ws-id="19"
                data-ws-component="SelectItemIndicator"
                className="ct2k8wg cf4i3oe c11xgi9i c3jw7et c1kurney clo3r8o cw9oyzl"
              >
                <HtmlEmbed
                  data-ws-id="21"
                  data-ws-component="HtmlEmbed"
                  code={
                    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width="100%" height="100%" style="display: block;"><path fill-rule="evenodd" d="M11.957 5.043a1 1 0 0 1 0 1.414l-4.5 4.5a1 1 0 0 1-1.414 0l-2-2a1 1 0 0 1 1.414-1.414L6.75 8.836l3.793-3.793a1 1 0 0 1 1.414 0Z" clip-rule="evenodd"/></svg>'
                  }
                />
              </SelectItemIndicator>
              <SelectItemText
                data-ws-id="23"
                data-ws-component="SelectItemText"
              >
                {"Light"}
              </SelectItemText>
            </SelectItem>
            <SelectItem
              data-ws-id="24"
              data-ws-component="SelectItem"
              value={"dark"}
              className="crmoyyg c11xgi9i c3elmho c17sljc0 cekw1i5 clo3r8o cuqxbts cg19ih8 c1479lj6 comq4ym ck4c8na c1mbhour c1dqbquh c1qmwsx9 c1qx3pju cut8gip cxlxl0c c1gfzcg5 cohan28 c15roejc c11eeprv c1rbq5ju cechooj c7yue4i"
            >
              <SelectItemIndicator
                data-ws-id="27"
                data-ws-component="SelectItemIndicator"
                className="ct2k8wg cf4i3oe c11xgi9i c3jw7et c1kurney clo3r8o cw9oyzl"
              >
                <HtmlEmbed
                  data-ws-id="29"
                  data-ws-component="HtmlEmbed"
                  code={
                    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width="100%" height="100%" style="display: block;"><path fill-rule="evenodd" d="M11.957 5.043a1 1 0 0 1 0 1.414l-4.5 4.5a1 1 0 0 1-1.414 0l-2-2a1 1 0 0 1 1.414-1.414L6.75 8.836l3.793-3.793a1 1 0 0 1 1.414 0Z" clip-rule="evenodd"/></svg>'
                  }
                />
              </SelectItemIndicator>
              <SelectItemText
                data-ws-id="31"
                data-ws-component="SelectItemText"
              >
                {"Dark"}
              </SelectItemText>
            </SelectItem>
            <SelectItem
              data-ws-id="32"
              data-ws-component="SelectItem"
              value={"system"}
              className="crmoyyg c11xgi9i c3elmho c17sljc0 cekw1i5 clo3r8o cuqxbts cg19ih8 c1479lj6 comq4ym ck4c8na c1mbhour c1dqbquh c1qmwsx9 c1qx3pju cut8gip cxlxl0c c1gfzcg5 cohan28 c15roejc c11eeprv c1rbq5ju cechooj c7yue4i"
            >
              <SelectItemIndicator
                data-ws-id="35"
                data-ws-component="SelectItemIndicator"
                className="ct2k8wg cf4i3oe c11xgi9i c3jw7et c1kurney clo3r8o cw9oyzl"
              >
                <HtmlEmbed
                  data-ws-id="37"
                  data-ws-component="HtmlEmbed"
                  code={
                    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width="100%" height="100%" style="display: block;"><path fill-rule="evenodd" d="M11.957 5.043a1 1 0 0 1 0 1.414l-4.5 4.5a1 1 0 0 1-1.414 0l-2-2a1 1 0 0 1 1.414-1.414L6.75 8.836l3.793-3.793a1 1 0 0 1 1.414 0Z" clip-rule="evenodd"/></svg>'
                  }
                />
              </SelectItemIndicator>
              <SelectItemText
                data-ws-id="39"
                data-ws-component="SelectItemText"
              >
                {"System"}
              </SelectItemText>
            </SelectItem>
          </SelectViewport>
        </SelectContent>
      </Select>
    </Box>
  );
};

export default {
  title: "Components/Select",
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
  button:where([data-ws-component="SelectTrigger"]) {
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
  span:where([data-ws-component="SelectValue"]) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  div:where([data-ws-component="SelectContent"]) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  div:where([data-ws-component="SelectViewport"]) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  div:where([data-ws-component="SelectItem"]) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  span:where([data-ws-component="SelectItemIndicator"]) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  span:where([data-ws-component="SelectItemText"]) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
}@media all {
  .c11xgi9i {
    display: flex
  }
  .c18kkil {
    height: 2.5rem
  }
  .c3elmho {
    width: 100%
  }
  .clo3r8o {
    align-items: center
  }
  .cqq29ax {
    justify-content: space-between
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
  .c110hgy6 {
    background-color: rgba(255, 255, 255, 0.8)
  }
  .c16g5416 {
    padding-left: 0.75rem
  }
  .c111au61 {
    padding-right: 0.75rem
  }
  .cey1d5i {
    padding-top: 0.5rem
  }
  .cbnv1sn {
    padding-bottom: 0.5rem
  }
  .c1qx3pju {
    font-size: 0.875rem
  }
  .cut8gip {
    line-height: 1.25rem
  }
  .cllerde::placeholder {
    color: rgba(100, 116, 139, 1)
  }
  .c19s8l4l:focus {
    outline-width: 2px
  }
  .cvjgjoo:focus {
    outline-style: solid
  }
  .cjdxik5:focus {
    outline-color: transparent
  }
  .c1uf353:focus {
    outline-offset: 2px
  }
  .c192vyv4:focus {
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.8), 0 0 0 4px rgba(148, 163, 184, 1)
  }
  .c1oa7gr0:disabled {
    cursor: not-allowed
  }
  .ce92j53:disabled {
    opacity: 0.5
  }
  .crmoyyg {
    position: relative
  }
  .c173yyao {
    z-index: 50
  }
  .c1ca5jk5 {
    min-width: 8rem
  }
  .c1p3lwwv {
    overflow: hidden
  }
  .c1rt44f4 {
    background-color: rgba(255, 255, 255, 1)
  }
  .cwi0ez9 {
    color: rgba(2, 8, 23, 1)
  }
  .cpbhzvr {
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)
  }
  .c1tn9z53 {
    padding-left: 0.25rem
  }
  .c164ur30 {
    padding-right: 0.25rem
  }
  .c1ukzx8x {
    padding-top: 0.25rem
  }
  .c1wau4tj {
    padding-bottom: 0.25rem
  }
  .c1vx0yks {
    height: var(--radix-select-trigger-height)
  }
  .cav9kfy {
    min-width: var(--radix-select-trigger-width)
  }
  .c17sljc0 {
    cursor: default
  }
  .cekw1i5 {
    user-select: none
  }
  .ck4c8na {
    padding-top: 0.375rem
  }
  .c1mbhour {
    padding-bottom: 0.375rem
  }
  .c1dqbquh {
    padding-left: 2rem
  }
  .c1qmwsx9 {
    padding-right: 0.5rem
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
  .cechooj[data-disabled] {
    pointer-events: none
  }
  .c7yue4i[data-disabled] {
    opacity: 0.5
  }
  .ct2k8wg {
    position: absolute
  }
  .cf4i3oe {
    left: 0.5rem
  }
  .c3jw7et {
    height: 0.875rem
  }
  .c1kurney {
    width: 0.875rem
  }
  .cw9oyzl {
    justify-content: center
  }
}
      `}
        </style>
        <Component />
      </>
    );
  },
};

export { Story as Select };
