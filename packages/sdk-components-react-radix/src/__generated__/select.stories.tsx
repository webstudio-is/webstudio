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

type Params = Record<string, string | undefined>;
type Resources = Record<string, unknown>;
const Page = (_props: { params: Params; resources: Resources }) => {
  let [selectValue, set$selectValue] = useState<any>("");
  let [selectOpen, set$selectOpen] = useState<any>(false);
  let onValueChange = (value: any) => {
    selectValue = value;
    set$selectValue(selectValue);
  };
  let onOpenChange = (open: any) => {
    selectOpen = open;
    set$selectOpen(selectOpen);
  };
  return (
    <Box data-ws-id="root" data-ws-component="Box">
      <Select
        data-ws-id="1"
        data-ws-component="Select"
        value={selectValue}
        onValueChange={onValueChange}
        open={selectOpen}
        onOpenChange={onOpenChange}
      >
        <SelectTrigger
          data-ws-id="8"
          data-ws-component="SelectTrigger"
          className="c6gk6ar c1b8xvex c1i2mn37 c4v7k5r csg71e3 cym38jd cqimob0 c2tr68t cjdtj3f c1inucbi c1dab7w1 c1uf7v01 czynn8e c6z96ps c9t5qyz c1x5uwe6 csnt51l cgassre c1ndsw6v cjrlou9 c945vvj c15mffxy c1kc4g4w c1hi2fgx c1peybss chh2z1n c1mfk609 c121vm9z c13c0q0m c3jm2m1 c1tqca1w chqc64d cjfm7wi c175y1wr cegrmbm c1grhw0w"
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
          className="cnhoj7b c1wyidsg c82b0cd c1e2gixt cym38jd cqimob0 c2tr68t cjdtj3f c1inucbi c1dab7w1 c1uf7v01 czynn8e c6z96ps c9t5qyz c1x5uwe6 csnt51l cgassre c1ndsw6v cjrlou9 c945vvj c4mw8gp cj0w9yo ci3o5ma"
        >
          <SelectViewport
            data-ws-id="14"
            data-ws-component="SelectViewport"
            className="ckc6u2x cue5i4p c1wiz3di c1364qo7 cu1cnl4 c1i2mn37 c1lciyms"
          >
            <SelectItem
              data-ws-id="16"
              data-ws-component="SelectItem"
              value={"light"}
              className="cnhoj7b c6gk6ar c1i2mn37 ch0kuv9 c1hl4mbg c4v7k5r cym38jd cqimob0 c2tr68t cjdtj3f cs5tzic cl10cx8 c11bwakb c18gyxfs c1mfk609 c121vm9z c601nqx c9i3lxo c1sz664l cm8bc7h cbt1ziu c1ci4uzu c144pucd c4g4hty"
            >
              <SelectItemIndicator
                data-ws-id="19"
                data-ws-component="SelectItemIndicator"
                className="c1kb88y7 col5989 c6gk6ar cw8nk89 c192xk4i c4v7k5r cvzkkb6"
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
              className="cnhoj7b c6gk6ar c1i2mn37 ch0kuv9 c1hl4mbg c4v7k5r cym38jd cqimob0 c2tr68t cjdtj3f cs5tzic cl10cx8 c11bwakb c18gyxfs c1mfk609 c121vm9z c601nqx c9i3lxo c1sz664l cm8bc7h cbt1ziu c1ci4uzu c144pucd c4g4hty"
            >
              <SelectItemIndicator
                data-ws-id="27"
                data-ws-component="SelectItemIndicator"
                className="c1kb88y7 col5989 c6gk6ar cw8nk89 c192xk4i c4v7k5r cvzkkb6"
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
              className="cnhoj7b c6gk6ar c1i2mn37 ch0kuv9 c1hl4mbg c4v7k5r cym38jd cqimob0 c2tr68t cjdtj3f cs5tzic cl10cx8 c11bwakb c18gyxfs c1mfk609 c121vm9z c601nqx c9i3lxo c1sz664l cm8bc7h cbt1ziu c1ci4uzu c144pucd c4g4hty"
            >
              <SelectItemIndicator
                data-ws-id="35"
                data-ws-component="SelectItemIndicator"
                className="c1kb88y7 col5989 c6gk6ar cw8nk89 c192xk4i c4v7k5r cvzkkb6"
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
  .c6gk6ar {
    display: flex
  }
  .c1b8xvex {
    height: 2.5rem
  }
  .c1i2mn37 {
    width: 100%
  }
  .c4v7k5r {
    align-items: center
  }
  .csg71e3 {
    justify-content: space-between
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
  .c15mffxy {
    background-color: rgba(255, 255, 255, 0.8)
  }
  .c1kc4g4w {
    padding-left: 0.75rem
  }
  .c1hi2fgx {
    padding-right: 0.75rem
  }
  .c1peybss {
    padding-top: 0.5rem
  }
  .chh2z1n {
    padding-bottom: 0.5rem
  }
  .c1mfk609 {
    font-size: 0.875rem
  }
  .c121vm9z {
    line-height: 1.25rem
  }
  .c13c0q0m::placeholder {
    color: rgba(100, 116, 139, 1)
  }
  .c3jm2m1:focus {
    outline-width: 2px
  }
  .c1tqca1w:focus {
    outline-style: solid
  }
  .chqc64d:focus {
    outline-color: transparent
  }
  .cjfm7wi:focus {
    outline-offset: 2px
  }
  .c175y1wr:focus {
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.8), 0 0 0 4px rgba(148, 163, 184, 1)
  }
  .cegrmbm:disabled {
    cursor: not-allowed
  }
  .c1grhw0w:disabled {
    opacity: 0.5
  }
  .cnhoj7b {
    position: relative
  }
  .c1wyidsg {
    z-index: 50
  }
  .c82b0cd {
    min-width: 8rem
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
  .ci3o5ma {
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)
  }
  .ckc6u2x {
    padding-left: 0.25rem
  }
  .cue5i4p {
    padding-right: 0.25rem
  }
  .c1wiz3di {
    padding-top: 0.25rem
  }
  .c1364qo7 {
    padding-bottom: 0.25rem
  }
  .cu1cnl4 {
    height: var(--radix-select-trigger-height)
  }
  .c1i2mn37 {
    width: 100%
  }
  .c1lciyms {
    min-width: var(--radix-select-trigger-width)
  }
  .cnhoj7b {
    position: relative
  }
  .c1i2mn37 {
    width: 100%
  }
  .ch0kuv9 {
    cursor: default
  }
  .c1hl4mbg {
    user-select: none
  }
  .c4v7k5r {
    align-items: center
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
  .cs5tzic {
    padding-top: 0.375rem
  }
  .cl10cx8 {
    padding-bottom: 0.375rem
  }
  .c11bwakb {
    padding-left: 2rem
  }
  .c18gyxfs {
    padding-right: 0.5rem
  }
  .c1mfk609 {
    font-size: 0.875rem
  }
  .c121vm9z {
    line-height: 1.25rem
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
  .cbt1ziu:focus {
    background-color: rgba(241, 245, 249, 0.9)
  }
  .c1ci4uzu:focus {
    color: rgba(15, 23, 42, 1)
  }
  .c144pucd[data-disabled] {
    pointer-events: none
  }
  .c4g4hty[data-disabled] {
    opacity: 0.5
  }
  .c1kb88y7 {
    position: absolute
  }
  .col5989 {
    left: 0.5rem
  }
  .cw8nk89 {
    height: 0.875rem
  }
  .c192xk4i {
    width: 0.875rem
  }
  .c4v7k5r {
    align-items: center
  }
  .cvzkkb6 {
    justify-content: center
  }
  .cnhoj7b {
    position: relative
  }
  .c1i2mn37 {
    width: 100%
  }
  .ch0kuv9 {
    cursor: default
  }
  .c1hl4mbg {
    user-select: none
  }
  .c4v7k5r {
    align-items: center
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
  .cs5tzic {
    padding-top: 0.375rem
  }
  .cl10cx8 {
    padding-bottom: 0.375rem
  }
  .c11bwakb {
    padding-left: 2rem
  }
  .c18gyxfs {
    padding-right: 0.5rem
  }
  .c1mfk609 {
    font-size: 0.875rem
  }
  .c121vm9z {
    line-height: 1.25rem
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
  .cbt1ziu:focus {
    background-color: rgba(241, 245, 249, 0.9)
  }
  .c1ci4uzu:focus {
    color: rgba(15, 23, 42, 1)
  }
  .c144pucd[data-disabled] {
    pointer-events: none
  }
  .c4g4hty[data-disabled] {
    opacity: 0.5
  }
  .c1kb88y7 {
    position: absolute
  }
  .col5989 {
    left: 0.5rem
  }
  .cw8nk89 {
    height: 0.875rem
  }
  .c192xk4i {
    width: 0.875rem
  }
  .c4v7k5r {
    align-items: center
  }
  .cvzkkb6 {
    justify-content: center
  }
  .cnhoj7b {
    position: relative
  }
  .c1i2mn37 {
    width: 100%
  }
  .ch0kuv9 {
    cursor: default
  }
  .c1hl4mbg {
    user-select: none
  }
  .c4v7k5r {
    align-items: center
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
  .cs5tzic {
    padding-top: 0.375rem
  }
  .cl10cx8 {
    padding-bottom: 0.375rem
  }
  .c11bwakb {
    padding-left: 2rem
  }
  .c18gyxfs {
    padding-right: 0.5rem
  }
  .c1mfk609 {
    font-size: 0.875rem
  }
  .c121vm9z {
    line-height: 1.25rem
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
  .cbt1ziu:focus {
    background-color: rgba(241, 245, 249, 0.9)
  }
  .c1ci4uzu:focus {
    color: rgba(15, 23, 42, 1)
  }
  .c144pucd[data-disabled] {
    pointer-events: none
  }
  .c4g4hty[data-disabled] {
    opacity: 0.5
  }
  .c1kb88y7 {
    position: absolute
  }
  .col5989 {
    left: 0.5rem
  }
  .cw8nk89 {
    height: 0.875rem
  }
  .c192xk4i {
    width: 0.875rem
  }
  .c4v7k5r {
    align-items: center
  }
  .cvzkkb6 {
    justify-content: center
  }
}
      `}
        </style>
        <Page params={{}} resources={{}} />
      </>
    );
  },
};

export { Story as Select };
