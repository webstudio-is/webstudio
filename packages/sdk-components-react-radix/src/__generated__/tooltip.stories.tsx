import { useState } from "react";
import {
  Box as Box,
  Button as Button,
  Text as Text,
} from "@webstudio-is/sdk-components-react";
import {
  Tooltip as Tooltip,
  TooltipTrigger as TooltipTrigger,
  TooltipContent as TooltipContent,
} from "../components";

type Params = Record<string, string | undefined>;
type Resources = Record<string, unknown>;
const Page = (_props: { params: Params; resources: Resources }) => {
  let [tooltipOpen, set$tooltipOpen] = useState<any>(false);
  let onOpenChange = (open: any) => {
    tooltipOpen = open;
    set$tooltipOpen(tooltipOpen);
  };
  return (
    <Box data-ws-id="root" data-ws-component="Box">
      <Tooltip
        data-ws-id="1"
        data-ws-component="Tooltip"
        open={tooltipOpen}
        onOpenChange={onOpenChange}
      >
        <TooltipTrigger data-ws-id="5" data-ws-component="TooltipTrigger">
          <Button
            data-ws-id="6"
            data-ws-component="Button"
            className="c1inucbi c1dab7w1 c1uf7v01 czynn8e c6z96ps c9t5qyz c1x5uwe6 csnt51l cgassre c1ndsw6v cjrlou9 c945vvj c15mffxy c1mnuzt9 c4v7k5r cvzkkb6 cym38jd cqimob0 c2tr68t cjdtj3f c1mfk609 c121vm9z cwry1sa c1b8xvex c1y5f9qa cjw7gx9 c1peybss chh2z1n c1t6bql4 czph7hf cncn1ro cb270vo c1rgsd1l c1srwcmr c1grhw0w c8xqq0k cjs8iie"
          >
            {"Button"}
          </Button>
        </TooltipTrigger>
        <TooltipContent
          data-ws-id="8"
          data-ws-component="TooltipContent"
          className="c1wyidsg c1e2gixt cym38jd cqimob0 c2tr68t cjdtj3f c1inucbi c1dab7w1 c1uf7v01 czynn8e c6z96ps c9t5qyz c1x5uwe6 csnt51l cgassre c1ndsw6v cjrlou9 c945vvj c4mw8gp c1kc4g4w c1hi2fgx cs5tzic cl10cx8 c1mfk609 c121vm9z cj0w9yo ci3o5ma"
        >
          <Text data-ws-id="10" data-ws-component="Text">
            {"The text you can edit"}
          </Text>
        </TooltipContent>
      </Tooltip>
    </Box>
  );
};

export default {
  title: "Components/Tooltip",
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
  div:where([data-ws-component="TooltipContent"]) {
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
  .c1y5f9qa {
    padding-left: 1rem
  }
  .cjw7gx9 {
    padding-right: 1rem
  }
  .c1peybss {
    padding-top: 0.5rem
  }
  .chh2z1n {
    padding-bottom: 0.5rem
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
  .c1wyidsg {
    z-index: 50
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
  .c1kc4g4w {
    padding-left: 0.75rem
  }
  .c1hi2fgx {
    padding-right: 0.75rem
  }
  .cs5tzic {
    padding-top: 0.375rem
  }
  .cl10cx8 {
    padding-bottom: 0.375rem
  }
  .c1mfk609 {
    font-size: 0.875rem
  }
  .c121vm9z {
    line-height: 1.25rem
  }
  .cj0w9yo {
    color: rgba(2, 8, 23, 1)
  }
  .ci3o5ma {
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)
  }
}
      `}
        </style>
        <Page params={{}} resources={{}} />
      </>
    );
  },
};

export { Story as Tooltip };
