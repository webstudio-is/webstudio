import { useState } from "react";
import {
  Box as Box,
  Button as Button,
  HtmlEmbed as HtmlEmbed,
  Text as Text,
} from "@webstudio-is/sdk-components-react";
import {
  Dialog as Dialog,
  DialogTrigger as DialogTrigger,
  DialogOverlay as DialogOverlay,
  DialogContent as DialogContent,
  DialogTitle as DialogTitle,
  DialogDescription as DialogDescription,
  DialogClose as DialogClose,
} from "../components";

type Params = Record<string, string | undefined>;
type Resources = Record<string, unknown>;
const Page = (_props: { params: Params; resources: Resources }) => {
  let [sheetOpen, set$sheetOpen] = useState<any>(false);
  let onOpenChange = (open: any) => {
    sheetOpen = open;
    set$sheetOpen(sheetOpen);
  };
  return (
    <Box data-ws-id="root" data-ws-component="Box">
      <Dialog
        data-ws-id="1"
        data-ws-component="Dialog"
        open={sheetOpen}
        onOpenChange={onOpenChange}
      >
        <DialogTrigger data-ws-id="5" data-ws-component="DialogTrigger">
          <Button
            data-ws-id="6"
            data-ws-component="Button"
            className="c1inucbi c1dab7w1 c1uf7v01 czynn8e c6z96ps c9t5qyz c1x5uwe6 csnt51l c1v4k4ip c2iozhh c1j5pqo1 cmqevnc cvxnx00 c1mnuzt9 c4v7k5r cvzkkb6 cym38jd cqimob0 c2tr68t cjdtj3f c1mfk609 c121vm9z cwry1sa c1b8xvex c347ys1 c1t6bql4 czph7hf cncn1ro cb270vo c1rgsd1l c1srwcmr c1grhw0w c8xqq0k cjs8iie"
          >
            <HtmlEmbed
              data-ws-id="8"
              data-ws-component="HtmlEmbed"
              code={
                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 22 22" fill="currentColor" width="100%" height="100%" style="display: block;"><path fill-rule="evenodd" d="M2 5.998a.75.75 0 0 1 .75-.75h16.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Zm0 5.5a.75.75 0 0 1 .75-.75h16.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Zm0 5.5a.75.75 0 0 1 .75-.75h16.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z" clip-rule="evenodd"/></svg>'
              }
            />
          </Button>
        </DialogTrigger>
        <DialogOverlay
          data-ws-id="10"
          data-ws-component="DialogOverlay"
          className="c1g0ebn8 c17k6ftv co2vb1i ci9y33x ckl9uqx c1wyidsg c15mffxy c1c159w3 c6gk6ar c13wsd00 c19jsld4"
        >
          <DialogContent
            data-ws-id="12"
            data-ws-component="DialogContent"
            className="c1i2mn37 c1wyidsg c6gk6ar c13wsd00 cb99ak4 ctl64vj c1inucbi c1dab7w1 c1uf7v01 czynn8e c6z96ps c9t5qyz c1x5uwe6 csnt51l cgassre c1ndsw6v cjrlou9 c945vvj c15mffxy cm3zvb4 c174435h c1xpn2dk c3vgloq cbzcu1y cnhoj7b c1rj6y8a cgfujm0 cn4ngym"
          >
            <Box
              data-ws-id="14"
              data-ws-component="Box"
              tag={"nav"}
              role={"navigation"}
            >
              <Box
                data-ws-id="17"
                data-ws-component="Box"
                className="c6gk6ar c13wsd00 cu0fd6l c8098d3"
              >
                <DialogTitle
                  data-ws-id="19"
                  data-ws-component="DialogTitle"
                  className="c1u5xdcd cdf5ze5 c1ma6tz6 c1kjryeq cs0zr08"
                >
                  {"Sheet Title"}
                </DialogTitle>
                <DialogDescription
                  data-ws-id="21"
                  data-ws-component="DialogDescription"
                  className="c1u5xdcd cdf5ze5 c1mfk609 c121vm9z caa8yt3"
                >
                  {"Sheet description text you can edit"}
                </DialogDescription>
              </Box>
              <Text data-ws-id="23" data-ws-component="Text">
                {"The text you can edit"}
              </Text>
            </Box>
            <DialogClose
              data-ws-id="24"
              data-ws-component="DialogClose"
              className="c1kb88y7 caboyml c1y1em6x c1d9pxa5 cnjyf56 c1jpjw0a c1lxvq7u c1jcn3uk c6gk6ar c4v7k5r cvzkkb6 c18dp5gp clw3og8 c1inucbi c1dab7w1 c1uf7v01 czynn8e c6z96ps c9t5qyz c1x5uwe6 csnt51l c1v4k4ip c2iozhh c1j5pqo1 cmqevnc cvxnx00 c601nqx c9i3lxo c1sz664l cm8bc7h c1m9udid c175y1wr"
            >
              <HtmlEmbed
                data-ws-id="26"
                data-ws-component="HtmlEmbed"
                code={
                  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width="100%" height="100%" style="display: block;"><path fill-rule="evenodd" d="M13.566 2.434a.8.8 0 0 1 0 1.132L9.13 8l4.435 4.434a.8.8 0 0 1-1.132 1.132L8 9.13l-4.434 4.435a.8.8 0 0 1-1.132-1.132L6.87 8 2.434 3.566a.8.8 0 0 1 1.132-1.132L8 6.87l4.434-4.435a.8.8 0 0 1 1.132 0Z" clip-rule="evenodd"/></svg>'
                }
              />
            </DialogClose>
          </DialogContent>
        </DialogOverlay>
      </Dialog>
    </Box>
  );
};

export default {
  title: "Components/Sheet",
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
  div:where([data-ws-component="DialogOverlay"]) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  div:where([data-ws-component="DialogContent"]) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  h2:where([data-ws-component="DialogTitle"]) {
    box-sizing: border-box;
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    outline-width: 1px
  }
  p:where([data-ws-component="DialogDescription"]) {
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
  button:where([data-ws-component="DialogClose"]) {
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
    border-top-width: 1px;
    border-right-width: 1px;
    border-bottom-width: 1px;
    border-left-width: 1px;
    padding-left: 0px;
    padding-right: 0px;
    padding-top: 0px;
    padding-bottom: 0px;
    font-family: inherit;
    font-size: 100%;
    line-height: 1.15;
    margin-top: 0;
    margin-right: 0;
    margin-bottom: 0;
    margin-left: 0;
    box-sizing: border-box;
    text-transform: none
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
  .c347ys1 {
    width: 2.5rem
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
  .c1g0ebn8 {
    position: fixed
  }
  .c17k6ftv {
    left: 0px
  }
  .co2vb1i {
    right: 0px
  }
  .ci9y33x {
    top: 0px
  }
  .ckl9uqx {
    bottom: 0px
  }
  .c1wyidsg {
    z-index: 50
  }
  .c15mffxy {
    background-color: rgba(255, 255, 255, 0.8)
  }
  .c1c159w3 {
    backdrop-filter: blur(0 1px 2px 0 rgb(0 0 0 / 0.05))
  }
  .c6gk6ar {
    display: flex
  }
  .c13wsd00 {
    flex-direction: column
  }
  .c19jsld4 {
    overflow: auto
  }
  .c1i2mn37 {
    width: 100%
  }
  .c1wyidsg {
    z-index: 50
  }
  .c6gk6ar {
    display: flex
  }
  .c13wsd00 {
    flex-direction: column
  }
  .cb99ak4 {
    row-gap: 1rem
  }
  .ctl64vj {
    column-gap: 1rem
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
  .cm3zvb4 {
    padding-left: 1.5rem
  }
  .c174435h {
    padding-right: 1.5rem
  }
  .c1xpn2dk {
    padding-top: 1.5rem
  }
  .c3vgloq {
    padding-bottom: 1.5rem
  }
  .cbzcu1y {
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)
  }
  .cnhoj7b {
    position: relative
  }
  .c1rj6y8a {
    margin-right: auto
  }
  .cgfujm0 {
    max-width: 24rem
  }
  .cn4ngym {
    flex-grow: 1
  }
  .c6gk6ar {
    display: flex
  }
  .c13wsd00 {
    flex-direction: column
  }
  .cu0fd6l {
    row-gap: 0.25rem
  }
  .c8098d3 {
    column-gap: 0.25rem
  }
  .c1u5xdcd {
    margin-top: 0px
  }
  .cdf5ze5 {
    margin-bottom: 0px
  }
  .c1ma6tz6 {
    line-height: 1.75rem
  }
  .c1kjryeq {
    font-size: 1.125rem
  }
  .cs0zr08 {
    letter-spacing: -0.025em
  }
  .c1u5xdcd {
    margin-top: 0px
  }
  .cdf5ze5 {
    margin-bottom: 0px
  }
  .c1mfk609 {
    font-size: 0.875rem
  }
  .c121vm9z {
    line-height: 1.25rem
  }
  .caa8yt3 {
    color: rgba(100, 116, 139, 1)
  }
  .c1kb88y7 {
    position: absolute
  }
  .caboyml {
    right: 1rem
  }
  .c1y1em6x {
    top: 1rem
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
  .c1jcn3uk {
    opacity: 0.7
  }
  .c6gk6ar {
    display: flex
  }
  .c4v7k5r {
    align-items: center
  }
  .cvzkkb6 {
    justify-content: center
  }
  .c18dp5gp {
    height: 1rem
  }
  .clw3og8 {
    width: 1rem
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
  .c1m9udid:hover {
    opacity: 1
  }
  .c175y1wr:focus {
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.8), 0 0 0 4px rgba(148, 163, 184, 1)
  }
}
      `}
        </style>
        <Page params={{}} resources={{}} />
      </>
    );
  },
};

export { Story as Sheet };
